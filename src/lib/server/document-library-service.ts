import { listMockAccountsByRole } from "@/lib/auth/mock-accounts";
import type { SessionUser } from "@/lib/auth/types";
import { runtimeConfig } from "@/lib/config/runtime";
import type {
  DocumentLibraryRecord,
  DocumentsWorkspaceSnapshot,
  DocumentState,
  DocumentVersionStatus,
  RequestPersonRecord,
  ReviewFileRecord,
  VersionChangeKind,
} from "@/lib/types";
import { canDownloadDocumentFile } from "@/lib/server/file-access";
import { buildFilePreviewHref, getFilePreviewKind } from "@/lib/server/file-preview";
import { prisma } from "@/lib/server/db";

type DocumentRow = {
  id: string;
  identityCode: string | null;
  temporaryCode: string | null;
  title: string;
  description: string | null;
  status: string;
  ownerEditorUserId: string | null;
  updatedAt: Date;
  officializedAt: Date | null;
  replacedByDocumentId: string | null;
  documentType: {
    code: string;
    name: string;
  };
  process: {
    code: string;
    name: string;
  };
};

type VersionRow = {
  id: string;
  documentId: string;
  versionLabel: string;
  fullCode: string | null;
  changeType: string | null;
  changeSummary: string | null;
  status: string;
  createdAt: Date;
  submittedAt: Date | null;
  approvedAt: Date | null;
  officializedAt: Date | null;
  isCurrent: boolean;
  majorVersion: number;
  minorVersion: number;
};

type FileRow = {
  id: string;
  documentVersionId: string | null;
  fileRole: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: Date;
};

type RequestLinkRow = {
  requestCode: string;
  relatedDocumentId: string | null;
};

type UserIdentity = {
  id: string;
  name: string;
  username?: string;
};

export async function getDocumentsWorkspaceSnapshot(
  user: Pick<SessionUser, "permissions" | "role">,
): Promise<DocumentsWorkspaceSnapshot> {
  const documents = (await prisma.document.findMany({
    orderBy: [{ officializedAt: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      identityCode: true,
      temporaryCode: true,
      title: true,
      description: true,
      status: true,
      ownerEditorUserId: true,
      updatedAt: true,
      officializedAt: true,
      replacedByDocumentId: true,
      documentType: {
        select: {
          code: true,
          name: true,
        },
      },
      process: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  })) as DocumentRow[];

  if (documents.length === 0) {
    return { documents: [] };
  }

  const documentIds = documents.map((document) => document.id);
  const versions = (await prisma.documentVersion.findMany({
    where: {
      documentId: {
        in: documentIds,
      },
    },
    orderBy: [{ majorVersion: "desc" }, { minorVersion: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      documentId: true,
      versionLabel: true,
      fullCode: true,
      changeType: true,
      changeSummary: true,
      status: true,
      createdAt: true,
      submittedAt: true,
      approvedAt: true,
      officializedAt: true,
      isCurrent: true,
      majorVersion: true,
      minorVersion: true,
    },
  })) as VersionRow[];
  const versionIds = versions.map((version) => version.id);
  const [files, requests, people] = await Promise.all([
    prisma.documentFile.findMany({
      where: {
        documentVersionId: {
          in: versionIds,
        },
      },
      orderBy: [{ uploadedAt: "desc" }],
      select: {
        id: true,
        documentVersionId: true,
        fileRole: true,
        originalFileName: true,
        mimeType: true,
        sizeBytes: true,
        uploadedAt: true,
      },
    }) as Promise<FileRow[]>,
    prisma.documentRequest.findMany({
      where: {
        relatedDocumentId: {
          in: documentIds,
        },
      },
      orderBy: [{ updatedAt: "desc" }],
      select: {
        requestCode: true,
        relatedDocumentId: true,
      },
    }) as Promise<RequestLinkRow[]>,
    resolvePeople(
      documents
        .map((document) => document.ownerEditorUserId)
        .filter((userId): userId is string => Boolean(userId)),
    ),
  ]);

  const filesByVersionId = groupBy(
    files.filter((file) => Boolean(file.documentVersionId)),
    (file) => file.documentVersionId!,
  );
  const versionsByDocumentId = groupBy(versions, (version) => version.documentId);
  const requestCodesByDocumentId = groupBy(requests, (request) => request.relatedDocumentId ?? "");
  const documentCodeById = new Map(
    documents.map((document) => [
      document.id,
      document.identityCode || document.temporaryCode || "SIN-CODIGO",
    ]),
  );

  return {
    documents: documents.map((document) => {
      const documentCode = document.identityCode || document.temporaryCode || "SIN-CODIGO";
      const documentVersions = (versionsByDocumentId.get(document.id) ?? []).map((version) => {
        const versionFiles = filesByVersionId.get(version.id) ?? [];

        return {
          id: version.id,
          displayCode: version.fullCode || `${documentCode}-V${version.versionLabel}`,
          versionLabel: version.versionLabel,
          status: normalizeDocumentVersionStatus(version.status),
          changeKind: version.changeType
            ? normalizeVersionChangeKind(version.changeType)
            : undefined,
          changeSummary: version.changeSummary || undefined,
          createdAt: formatDateTime(version.createdAt),
          submittedAt: version.submittedAt ? formatDateTime(version.submittedAt) : undefined,
          approvedAt: version.approvedAt ? formatDateTime(version.approvedAt) : undefined,
          officializedAt: version.officializedAt ? formatDateTime(version.officializedAt) : undefined,
          isCurrent: version.isCurrent,
          draftFiles: versionFiles
            .filter((file) => file.fileRole === "DRAFT")
            .map((file) => mapReviewFileRecord(file, user)),
          officialFiles: versionFiles
            .filter((file) => file.fileRole === "OFFICIAL")
            .map((file) => mapReviewFileRecord(file, user)),
        };
      });

      return {
        id: document.id,
        code: documentCode,
        title: document.title,
        processLabel: `${document.process.code} - ${document.process.name}`,
        documentTypeLabel: `${document.documentType.code} - ${document.documentType.name}`,
        state: normalizeDocumentState(document.status),
        updatedAt: formatDateTime(document.updatedAt),
        officializedAt: document.officializedAt ? formatDateTime(document.officializedAt) : undefined,
        owner: document.ownerEditorUserId
          ? resolvePersonRecord(people, document.ownerEditorUserId)
          : undefined,
        summary: document.description || undefined,
        linkedRequestCodes:
          (requestCodesByDocumentId.get(document.id) ?? []).map((request) => request.requestCode),
        replacementCode: document.replacedByDocumentId
          ? documentCodeById.get(document.replacedByDocumentId)
          : undefined,
        versions: documentVersions,
      } satisfies DocumentLibraryRecord;
    }),
  };
}

async function resolvePeople(userIds: string[]) {
  const uniqueUserIds = [...new Set(userIds)];

  if (uniqueUserIds.length === 0) {
    return new Map<string, UserIdentity>();
  }

  if (runtimeConfig.authMode === "database") {
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: uniqueUserIds,
        },
      },
      select: {
        id: true,
        name: true,
        username: true,
      },
    });

    return new Map(
      users.map((user) => [
        user.id,
        {
          id: user.id,
          name: user.name,
          username: user.username,
        },
      ]),
    );
  }

  const localUsers = [
    ...listMockAccountsByRole("ADMINISTRATOR"),
    ...listMockAccountsByRole("EDITOR"),
    ...listMockAccountsByRole("READER"),
  ];

  return new Map(
    localUsers
      .filter((user) => uniqueUserIds.includes(user.id))
      .map((user) => [
        user.id,
        {
          id: user.id,
          name: user.name,
          username: user.username,
        },
      ]),
  );
}

function resolvePersonRecord(
  people: Map<string, UserIdentity>,
  userId: string,
): RequestPersonRecord {
  const person = people.get(userId);

  if (!person) {
    return {
      id: userId,
      name: "Usuario no disponible",
    };
  }

  return {
    id: person.id,
    name: person.name,
    username: person.username,
  };
}

function mapReviewFileRecord(
  file: FileRow,
  user: Pick<SessionUser, "permissions" | "role">,
): ReviewFileRecord {
  const previewKind = getFilePreviewKind(file);

  return {
    canDownload: canDownloadDocumentFile(user),
    canPreview:
      (file.fileRole === "OFFICIAL" || user.role !== "READER") && previewKind !== "unsupported",
    id: file.id,
    downloadHref: `/api/document-files/${encodeURIComponent(file.id)}`,
    fileRole: file.fileRole === "OFFICIAL" ? "OFFICIAL" : "DRAFT",
    mimeType: file.mimeType,
    originalFileName: file.originalFileName,
    previewHref: buildFilePreviewHref("/api/document-files", file.id),
    previewKind,
    sizeBytes: file.sizeBytes,
    uploadedAt: formatDateTime(file.uploadedAt),
  };
}

function normalizeDocumentState(status: string): DocumentState {
  switch (status) {
    case "IN_REVIEW":
    case "APPROVED_DRAFT":
    case "OFFICIAL":
    case "ARCHIVED":
    case "OBSOLETE":
      return status;
    default:
      return "DRAFT";
  }
}

function normalizeDocumentVersionStatus(status: string): DocumentVersionStatus {
  switch (status) {
    case "IN_REVIEW":
    case "REJECTED":
    case "APPROVED":
    case "OFFICIAL":
    case "SUPERSEDED":
    case "ARCHIVED":
      return status;
    default:
      return "DRAFT";
  }
}

function normalizeVersionChangeKind(changeType: string): VersionChangeKind {
  return changeType === "MAJOR" ? "MAJOR" : "MINOR";
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const key = getKey(item);
    const group = groups.get(key);

    if (group) {
      group.push(item);
      continue;
    }

    groups.set(key, [item]);
  }

  return groups;
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("es-SV", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
