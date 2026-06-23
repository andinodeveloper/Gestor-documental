import { randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";

import {
  canApproveDocuments,
  canDownloadDocuments,
  canOfficializeDocuments,
  canReviewDocuments,
  canSubmitDocumentReviews,
  canUploadDraftDocuments,
  canUploadOfficialDocuments,
  DOCUMENTS_APPROVE_PERMISSION,
  DOCUMENTS_REVIEW_PERMISSION,
} from "@/lib/auth/permissions";
import { findMockAccountById, listMockAccountsByRole } from "@/lib/auth/mock-accounts";
import type { SessionUser } from "@/lib/auth/types";
import { runtimeConfig } from "@/lib/config/runtime";
import {
  canRequestEnterDraftReviewFlow,
  getRequestTrackingStage,
} from "@/lib/request-tracking";
import type {
  DocumentState,
  DocumentVersionStatus,
  DraftCommentStatus,
  DraftCommentType,
  RequestPersonRecord,
  ReviewAssignmentRecord,
  ReviewAssignmentRole,
  ReviewDraftCommentRecord,
  ReviewFileRecord,
  ReviewRequestCandidateRecord,
  ReviewRoundRecord,
  ReviewRoundStatus,
  ReviewsWorkspaceSnapshot,
  ReviewUserOptionRecord,
  ReviewWorkItemRecord,
  VersionChangeKind,
  WorkflowStatus,
} from "@/lib/types";
import { buildFilePreviewHref, getFilePreviewKind } from "@/lib/server/file-preview";
import {
  collectReaderGroupPermissionCodes,
  collectRolePermissionCodes,
  collectUserPermissionOverrides,
  resolveEffectivePermissionCodes,
  resolvePrimaryAppRole,
} from "@/lib/server/authorization-model";
import { prisma } from "@/lib/server/db";
import {
  deleteStoredDocumentFiles,
  saveDocumentFile,
} from "@/lib/server/document-storage";

const activeVersionStatuses = ["DRAFT", "IN_REVIEW", "REJECTED", "APPROVED"] as const;
const activeRequestStatuses = ["ASSIGNED", "IN_PROGRESS", "OBSERVED", "IN_REVIEW", "APPROVED"] as const;

type ReviewDocumentRow = {
  id: string;
  identityCode: string | null;
  temporaryCode: string | null;
  title: string;
  description: string | null;
  documentTypeId: string;
  processId: string;
  status: string;
  currentVersionId: string | null;
  createdByUserId: string | null;
  ownerEditorUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  officializedAt: Date | null;
  documentType: {
    id: string;
    code: string;
    name: string;
  };
  process: {
    id: string;
    code: string;
    name: string;
  };
};

type ReviewVersionRow = {
  id: string;
  documentId: string;
  majorVersion: number;
  minorVersion: number;
  versionLabel: string;
  fullCode: string | null;
  changeType: string | null;
  changeSummary: string | null;
  status: string;
  previousVersionId: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  submittedAt: Date | null;
  approvedAt: Date | null;
  officializedAt: Date | null;
  isCurrent: boolean;
};

type ReviewRoundRow = {
  id: string;
  documentVersionId: string;
  roundNumber: number;
  status: string;
  submittedByUserId: string | null;
  submittedAt: Date | null;
  closedAt: Date | null;
};

type ReviewAssignmentRow = {
  id: string;
  reviewRoundId: string;
  userId: string;
  assignmentRole: string;
  status: string;
  decisionComment: string | null;
  decidedAt: Date | null;
};

type DraftCommentRow = {
  id: string;
  reviewAssignmentId: string;
  documentVersionId: string;
  commentType: string;
  comment: string;
  suggestedText: string | null;
  sectionReference: string | null;
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedByUserId: string | null;
};

type ReviewFileRow = {
  id: string;
  documentId: string;
  documentVersionId: string | null;
  fileRole: string;
  originalFileName: string;
  storedFileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string | null;
  uploadedByUserId: string | null;
  uploadedAt: Date;
};

type ReviewRequestRow = {
  id: string;
  requestCode: string;
  requestType: string;
  requesterUserId: string | null;
  createdByUserId: string | null;
  requesterArea: string | null;
  suggestedDocumentTypeId: string | null;
  suggestedProcessId: string | null;
  relatedDocumentId: string | null;
  title: string;
  description: string;
  justification: string | null;
  priority: string | null;
  requiredDate: Date | null;
  status: string;
  assignedEditorUserId: string | null;
  assignedByUserId: string | null;
  assignedAt: Date | null;
  currentTrackingStageCode: string | null;
  currentResponsibilityRole: string | null;
  waitingReason: string | null;
  waitingSince: Date | null;
  lastRequesterResponseAt: Date | null;
  cancellationRequestedAt: Date | null;
  cancellationRequestedByUserId: string | null;
  cancellationRequestReason: string | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  suggestedProcess: {
    id: string;
    code: string;
    name: string;
  } | null;
  suggestedDocumentType: {
    id: string;
    code: string;
    name: string;
  } | null;
  relatedDocument: {
    id: string;
    identityCode: string | null;
    temporaryCode: string | null;
    title: string;
  } | null;
};

type ReviewUserIdentity = ReviewUserOptionRecord & {
  permissions: string[];
};

type DatabaseAuthUser = Prisma.UserGetPayload<{
  include: {
    roles: {
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true;
              };
            };
          };
        };
      };
    };
    readerGroups: {
      where: {
        revokedAt: null;
      };
      include: {
        readerGroup: {
          include: {
            permissions: {
              include: {
                permission: true;
              };
            };
          };
        };
      };
    };
    permissions: {
      include: {
        permission: true;
      };
    };
  };
}>;

export async function getReviewsWorkspaceSnapshot(
  user: SessionUser,
): Promise<ReviewsWorkspaceSnapshot> {
  const [workItems, editorialUsers] = await Promise.all([
    listReviewWorkItems(user),
    listEditorialUsers(),
  ]);

  const reviewerOptions = editorialUsers
    .filter((candidate) => candidate.permissions.includes(DOCUMENTS_REVIEW_PERMISSION))
    .map(toReviewUserOptionRecord);
  const approverOptions = editorialUsers
    .filter((candidate) => candidate.permissions.includes(DOCUMENTS_APPROVE_PERMISSION))
    .map(toReviewUserOptionRecord);
  const requestCandidates = await listRequestCandidates(new Set(workItems.map((item) => item.documentId)));

  return {
    canApprove: canApproveDocuments(user),
    canCreateDraft: canUploadDraftDocuments(user),
    canOfficialize: canUploadOfficialDocuments(user) && canOfficializeDocuments(user),
    canReview: canReviewDocuments(user),
    canSubmitReview: canSubmitDocumentReviews(user),
    requestCandidates,
    reviewerOptions,
    approverOptions,
    workItems,
  };
}

export async function createDraftFromRequest(input: {
  actorUser: SessionUser;
  changeKind?: VersionChangeKind;
  changeSummary?: string;
  draftFile: File;
  requestId: string;
}) {
  if (!canUploadDraftDocuments(input.actorUser)) {
    throw new Error("Tu usuario no tiene permiso para cargar borradores.");
  }

  const request = await prisma.documentRequest.findUnique({
    where: { id: input.requestId },
    select: {
      id: true,
      requestCode: true,
      requestType: true,
      status: true,
      title: true,
      suggestedDocumentTypeId: true,
      suggestedProcessId: true,
      relatedDocumentId: true,
      assignedEditorUserId: true,
      requesterUserId: true,
      currentTrackingStageCode: true,
    },
  });

  if (!request) {
    throw new Error("La solicitud ya no existe.");
  }

  const requestType = normalizeRequestType(request.requestType);

  if (!canRequestEnterDraftReviewFlow(request.currentTrackingStageCode, requestType)) {
    throw new Error(
      "La solicitud solo puede convertirse en borrador a partir de la etapa 3.1 - Revision por areas involucradas.",
    );
  }

  if (request.status === "CANCELLED" || request.status === "CLOSED") {
    throw new Error("No puedes generar un borrador desde una solicitud cerrada o cancelada.");
  }

  if (!request.assignedEditorUserId) {
    throw new Error("La solicitud debe tener editor asignado antes de generar el borrador.");
  }

  if (
    input.actorUser.role !== "ADMINISTRATOR" &&
    request.assignedEditorUserId !== input.actorUser.id
  ) {
    throw new Error("Solo el editor asignado o un administrador pueden generar este borrador.");
  }

  if (request.requestType === "UPDATE_EXISTING" && !request.relatedDocumentId) {
    throw new Error("La solicitud de actualizacion debe estar vinculada a un documento existente.");
  }

  if (request.requestType === "NEW_DOCUMENT") {
    const existingDraftDocument = await prisma.document.findFirst({
      where: {
        id: request.relatedDocumentId ?? undefined,
      },
      select: {
        id: true,
      },
    });

    if (request.relatedDocumentId && existingDraftDocument) {
      throw new Error("La solicitud ya fue convertida previamente en un borrador documental.");
    }
  }

  if (request.requestType === "UPDATE_EXISTING" && request.relatedDocumentId) {
    const existingActiveVersion = await prisma.documentVersion.findFirst({
      where: {
        documentId: request.relatedDocumentId,
        status: {
          in: [...activeVersionStatuses],
        },
      },
      select: {
        id: true,
      },
    });

    if (existingActiveVersion) {
      throw new Error("El documento relacionado ya tiene una version activa en este flujo.");
    }
  }

  const savedStoragePaths: string[] = [];

  try {
    return await prisma.$transaction(async (tx) => {
      const documentId = request.requestType === "NEW_DOCUMENT"
        ? randomUUID()
        : request.relatedDocumentId!;
      const versionId = randomUUID();
      const sourceDocument =
        request.requestType === "UPDATE_EXISTING"
          ? await tx.document.findUnique({
              where: { id: request.relatedDocumentId! },
              select: {
                id: true,
                identityCode: true,
                temporaryCode: true,
                title: true,
                documentTypeId: true,
                processId: true,
                status: true,
                currentVersionId: true,
                ownerEditorUserId: true,
              },
            })
          : null;

      if (request.requestType === "UPDATE_EXISTING" && !sourceDocument) {
        throw new Error("El documento relacionado ya no existe.");
      }

      const previousVersion =
        sourceDocument?.currentVersionId
          ? await tx.documentVersion.findUnique({
              where: { id: sourceDocument.currentVersionId },
              select: {
                id: true,
                majorVersion: true,
                minorVersion: true,
              },
            })
          : null;
      const normalizedChangeKind =
        request.requestType === "UPDATE_EXISTING"
          ? input.changeKind ?? "MINOR"
          : ("MAJOR" satisfies VersionChangeKind);
      const nextVersionNumbers =
        request.requestType === "UPDATE_EXISTING"
          ? buildNextVersionNumbers(previousVersion, normalizedChangeKind)
          : {
              majorVersion: 1,
              minorVersion: 0,
            };
      const versionLabel = formatVersionLabel(
        nextVersionNumbers.majorVersion,
        nextVersionNumbers.minorVersion,
      );
      const temporaryCode =
        request.requestType === "NEW_DOCUMENT"
          ? await generateNextTemporaryCode(tx)
          : sourceDocument?.identityCode || sourceDocument?.temporaryCode || "SIN-CODIGO";
      const storedDraftFile = await saveDocumentFile({
        documentId,
        documentVersionId: versionId,
        file: input.draftFile,
        fileRole: "DRAFT",
        uploadedByUserId: input.actorUser.id,
      });

      savedStoragePaths.push(storedDraftFile.storagePath);

      if (request.requestType === "NEW_DOCUMENT") {
        await tx.document.create({
          data: {
            id: documentId,
            temporaryCode,
            title: request.title,
            documentTypeId: request.suggestedDocumentTypeId!,
            processId: request.suggestedProcessId!,
            status: "DRAFT",
            createdByUserId: input.actorUser.id,
            ownerEditorUserId: request.assignedEditorUserId,
          },
        });
      } else {
        await tx.document.update({
          where: { id: documentId },
          data: {
            ownerEditorUserId: request.assignedEditorUserId,
          },
        });
      }

      await tx.documentVersion.create({
        data: {
          id: versionId,
          documentId,
          majorVersion: nextVersionNumbers.majorVersion,
          minorVersion: nextVersionNumbers.minorVersion,
          versionLabel,
          fullCode: `${temporaryCode}-V${versionLabel}`,
          changeType: normalizedChangeKind,
          changeSummary: normalizeOptionalText(input.changeSummary),
          status: "DRAFT",
          previousVersionId: previousVersion?.id ?? null,
          createdByUserId: input.actorUser.id,
          isCurrent: false,
        },
      });

      await tx.documentFile.create({
        data: {
          id: randomUUID(),
          documentId,
          documentVersionId: versionId,
          fileRole: "DRAFT",
          originalFileName: storedDraftFile.originalFileName,
          storedFileName: getStoredFileName(storedDraftFile.storagePath),
          storagePath: storedDraftFile.storagePath,
          mimeType: storedDraftFile.mimeType,
          sizeBytes: storedDraftFile.sizeBytes,
          uploadedByUserId: storedDraftFile.uploadedByUserId ?? null,
        },
      });

      if (request.requestType === "NEW_DOCUMENT") {
        await tx.documentRequest.update({
          where: { id: request.id },
          data: {
            relatedDocumentId: documentId,
          },
        });
      }

      await syncLinkedRequestStatus(tx, documentId, {
        actorUserId: input.actorUser.id,
        note: "Borrador inicial generado en el modulo de revision documental.",
        responsibilityRole: "EDITOR",
        stageCode:
          getRequestTrackingStage(request.currentTrackingStageCode, requestType)
            .sortOrder < 90
            ? "2.1"
            : request.currentTrackingStageCode || "2.1",
        status: "IN_PROGRESS",
        waitingReason: "NONE",
      });

      return {
        documentId,
        versionId,
      };
    });
  } catch (error) {
    if (savedStoragePaths.length > 0) {
      await deleteStoredDocumentFiles(savedStoragePaths);
    }

    throw error;
  }
}

export async function replaceDraftFile(input: {
  actorUser: SessionUser;
  changeSummary?: string;
  draftFile: File;
  versionId: string;
}) {
  if (!canUploadDraftDocuments(input.actorUser)) {
    throw new Error("Tu usuario no tiene permiso para cargar borradores.");
  }

  const version = await prisma.documentVersion.findUnique({
    where: { id: input.versionId },
    select: {
      id: true,
      documentId: true,
      status: true,
      document: {
        select: {
          ownerEditorUserId: true,
          currentVersionId: true,
        },
      },
    },
  });

  if (!version) {
    throw new Error("La version documental ya no existe.");
  }

  if (version.status !== "REJECTED" && version.status !== "DRAFT") {
    throw new Error("Solo puedes sustituir archivos de versiones en borrador u observadas.");
  }

  assertCanManageDocumentWorkflow(input.actorUser, version.document.ownerEditorUserId);

  const storedDraftFile = await saveDocumentFile({
    documentId: version.documentId,
    documentVersionId: version.id,
    file: input.draftFile,
    fileRole: "DRAFT",
    uploadedByUserId: input.actorUser.id,
  });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.documentVersion.update({
        where: { id: version.id },
        data: {
          status: "DRAFT",
          changeSummary: normalizeOptionalText(input.changeSummary),
          submittedAt: null,
          approvedAt: null,
          officializedAt: null,
        },
      });

      await tx.documentFile.create({
        data: {
          id: randomUUID(),
          documentId: version.documentId,
          documentVersionId: version.id,
          fileRole: "DRAFT",
          originalFileName: storedDraftFile.originalFileName,
          storedFileName: getStoredFileName(storedDraftFile.storagePath),
          storagePath: storedDraftFile.storagePath,
          mimeType: storedDraftFile.mimeType,
          sizeBytes: storedDraftFile.sizeBytes,
          uploadedByUserId: storedDraftFile.uploadedByUserId ?? null,
        },
      });

      if (!version.document.currentVersionId) {
        await tx.document.update({
          where: { id: version.documentId },
          data: {
            status: "DRAFT",
          },
        });
      }

      await syncLinkedRequestStatus(tx, version.documentId, {
        actorUserId: input.actorUser.id,
        note: "Se cargo un nuevo borrador para atender observaciones de la ronda anterior.",
        responsibilityRole: "EDITOR",
        stageCode: "3.2",
        status: "IN_PROGRESS",
        waitingReason: "NONE",
      });
    });
  } catch (error) {
    await deleteStoredDocumentFiles([storedDraftFile.storagePath]);
    throw error;
  }
}

export async function submitVersionForReview(input: {
  actorUser: SessionUser;
  approverIds: string[];
  note?: string;
  reviewerIds: string[];
  versionId: string;
}) {
  if (!canSubmitDocumentReviews(input.actorUser)) {
    throw new Error("Tu usuario no tiene permiso para enviar documentos a revision.");
  }

  const version = await prisma.documentVersion.findUnique({
    where: { id: input.versionId },
    select: {
      id: true,
      documentId: true,
      status: true,
      document: {
        select: {
          ownerEditorUserId: true,
          currentVersionId: true,
        },
      },
    },
  });

  if (!version) {
    throw new Error("La version documental ya no existe.");
  }

  if (version.status !== "DRAFT" && version.status !== "REJECTED") {
    throw new Error("Solo puedes enviar a revision una version en borrador u observada.");
  }

  assertCanManageDocumentWorkflow(input.actorUser, version.document.ownerEditorUserId);

  const reviewerIds = normalizeUserIds(input.reviewerIds);
  const approverIds = normalizeUserIds(input.approverIds);

  if (approverIds.length === 0) {
    throw new Error("Debes asignar al menos un aprobador para continuar.");
  }

  if (reviewerIds.length === 0 && approverIds.length === 0) {
    throw new Error("Debes seleccionar al menos un participante para la ronda.");
  }

  const draftFile = await prisma.documentFile.findFirst({
    where: {
      documentVersionId: version.id,
      fileRole: "DRAFT",
    },
    orderBy: {
      uploadedAt: "desc",
    },
    select: {
      id: true,
    },
  });

  if (!draftFile) {
    throw new Error("Debes cargar un archivo de borrador antes de someter la version.");
  }

  const editorialUsers = await listEditorialUsers();
  const reviewerSet = new Set(
    editorialUsers
      .filter((candidate) => candidate.permissions.includes(DOCUMENTS_REVIEW_PERMISSION))
      .map((candidate) => candidate.id),
  );
  const approverSet = new Set(
    editorialUsers
      .filter((candidate) => candidate.permissions.includes(DOCUMENTS_APPROVE_PERMISSION))
      .map((candidate) => candidate.id),
  );

  for (const reviewerId of reviewerIds) {
    if (!reviewerSet.has(reviewerId)) {
      throw new Error("Uno de los revisores seleccionados no tiene permiso de revision.");
    }
  }

  for (const approverId of approverIds) {
    if (!approverSet.has(approverId)) {
      throw new Error("Uno de los aprobadores seleccionados no tiene permiso de aprobacion.");
    }
  }

  await prisma.$transaction(async (tx) => {
    const latestRound = await tx.reviewRound.findFirst({
      where: {
        documentVersionId: version.id,
      },
      orderBy: {
        roundNumber: "desc",
      },
      select: {
        roundNumber: true,
      },
    });
    const roundId = randomUUID();
    const roundNumber = (latestRound?.roundNumber ?? 0) + 1;

    await tx.reviewRound.create({
      data: {
        id: roundId,
        documentVersionId: version.id,
        roundNumber,
        status: "IN_REVIEW",
        submittedByUserId: input.actorUser.id,
        submittedAt: new Date(),
      },
    });

    const assignmentRows = [
      ...reviewerIds.map((userId) => ({
        id: randomUUID(),
        reviewRoundId: roundId,
        userId,
        assignmentRole: "REVIEWER",
        status: "PENDING",
        decisionComment: null,
        decidedAt: null,
      })),
      ...approverIds.map((userId) => ({
        id: randomUUID(),
        reviewRoundId: roundId,
        userId,
        assignmentRole: "APPROVER",
        status: "PENDING",
        decisionComment: null,
        decidedAt: null,
      })),
    ];

    await tx.reviewAssignment.createMany({
      data: assignmentRows,
    });

    await tx.documentVersion.update({
      where: { id: version.id },
      data: {
        status: "IN_REVIEW",
        submittedAt: new Date(),
        approvedAt: null,
      },
    });

    if (!version.document.currentVersionId) {
      await tx.document.update({
        where: { id: version.documentId },
        data: {
          status: "IN_REVIEW",
        },
      });
    }

    await syncLinkedRequestStatus(tx, version.documentId, {
      actorUserId: input.actorUser.id,
      note:
        normalizeOptionalText(input.note) ||
        `Version enviada a revision formal en ronda ${roundNumber}.`,
      responsibilityRole: "EDITOR",
      stageCode: "3.3",
      status: "IN_REVIEW",
      waitingReason: "NONE",
    });
  });
}

export async function addReviewComment(input: {
  actorUser: SessionUser;
  assignmentId: string;
  comment: string;
  commentType: DraftCommentType;
  sectionReference?: string;
  suggestedText?: string;
}) {
  const assignment = await prisma.reviewAssignment.findUnique({
    where: { id: input.assignmentId },
    select: {
      id: true,
      userId: true,
      status: true,
      reviewRoundId: true,
    },
  });

  if (!assignment) {
    throw new Error("La asignacion de revision ya no existe.");
  }

  if (assignment.userId !== input.actorUser.id) {
    throw new Error("Solo el usuario asignado puede registrar comentarios en esta revision.");
  }

  const round = await prisma.reviewRound.findUnique({
    where: { id: assignment.reviewRoundId },
    select: {
      status: true,
      documentVersionId: true,
    },
  });

  if (!round) {
    throw new Error("La ronda de revision ya no existe.");
  }

  if (round.status !== "IN_REVIEW") {
    throw new Error("La ronda ya no admite comentarios nuevos.");
  }

  await prisma.draftComment.create({
    data: {
      id: randomUUID(),
      reviewAssignmentId: assignment.id,
      documentVersionId: round.documentVersionId,
      commentType: input.commentType,
      comment: input.comment.trim(),
      suggestedText: normalizeOptionalText(input.suggestedText),
      sectionReference: normalizeOptionalText(input.sectionReference),
      status: "OPEN",
    },
  });
}

export async function resolveReviewComment(input: {
  actorUser: SessionUser;
  commentId: string;
}) {
  const comment = await prisma.draftComment.findUnique({
    where: { id: input.commentId },
    select: {
      id: true,
      status: true,
      documentVersionId: true,
    },
  });

  if (!comment) {
    throw new Error("El comentario ya no existe.");
  }

  const version = await prisma.documentVersion.findUnique({
    where: { id: comment.documentVersionId },
    select: {
      document: {
        select: {
          ownerEditorUserId: true,
        },
      },
    },
  });

  if (!version) {
    throw new Error("La version documental asociada al comentario ya no existe.");
  }

  assertCanManageDocumentWorkflow(
    input.actorUser,
    version.document.ownerEditorUserId,
  );

  await prisma.draftComment.update({
    where: { id: comment.id },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
      resolvedByUserId: input.actorUser.id,
    },
  });
}

export async function recordReviewDecision(input: {
  actorUser: SessionUser;
  assignmentId: string;
  decision: "APPROVED" | "REJECTED";
  decisionComment?: string;
}) {
  const assignment = await prisma.reviewAssignment.findUnique({
    where: { id: input.assignmentId },
    select: {
      id: true,
      userId: true,
      assignmentRole: true,
      status: true,
      reviewRoundId: true,
    },
  });

  if (!assignment) {
    throw new Error("La asignacion ya no existe.");
  }

  if (assignment.userId !== input.actorUser.id) {
    throw new Error("Solo el usuario asignado puede registrar esta decision.");
  }

  const round = await prisma.reviewRound.findUnique({
    where: { id: assignment.reviewRoundId },
    select: {
      id: true,
      status: true,
      roundNumber: true,
      documentVersionId: true,
    },
  });

  if (!round) {
    throw new Error("La ronda de revision ya no existe.");
  }

  if (round.status !== "IN_REVIEW") {
    throw new Error("La ronda ya fue cerrada previamente.");
  }

  const trimmedComment = normalizeOptionalText(input.decisionComment);

  if (input.decision === "REJECTED" && !trimmedComment) {
    throw new Error("Debes registrar observaciones obligatorias para rechazar el borrador.");
  }

  if (
    assignment.assignmentRole === "REVIEWER" &&
    !canReviewDocuments(input.actorUser)
  ) {
    throw new Error("Tu usuario no tiene permiso para revisar borradores.");
  }

  if (
    assignment.assignmentRole === "APPROVER" &&
    !canApproveDocuments(input.actorUser)
  ) {
    throw new Error("Tu usuario no tiene permiso para aprobar borradores.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.reviewAssignment.update({
      where: { id: assignment.id },
      data: {
        status: input.decision,
        decisionComment: trimmedComment,
        decidedAt: new Date(),
      },
    });

    const [roundAssignments, version] = await Promise.all([
      tx.reviewAssignment.findMany({
        where: {
          reviewRoundId: assignment.reviewRoundId,
        },
        select: {
          id: true,
          status: true,
        },
      }),
      tx.documentVersion.findUnique({
        where: { id: round.documentVersionId },
        select: {
          id: true,
          documentId: true,
          document: {
            select: {
              currentVersionId: true,
            },
          },
        },
      }),
    ]);

    if (!version) {
      throw new Error("La version documental ya no existe.");
    }

    const statuses = roundAssignments.map((row) =>
      row.id === assignment.id ? input.decision : row.status,
    );
    const anyRejected = statuses.includes("REJECTED");
    const allApproved = statuses.every((status) => status === "APPROVED");

    if (!anyRejected && !allApproved) {
      return;
    }

    if (anyRejected) {
      await tx.reviewRound.update({
        where: { id: assignment.reviewRoundId },
        data: {
          status: "OBSERVED",
          closedAt: new Date(),
        },
      });

      await tx.documentVersion.update({
        where: { id: version.id },
        data: {
          status: "REJECTED",
        },
      });

      if (!version.document.currentVersionId) {
        await tx.document.update({
          where: { id: version.documentId },
          data: {
            status: "DRAFT",
          },
        });
      }

      await syncLinkedRequestStatus(tx, version.documentId, {
        actorUserId: input.actorUser.id,
        note:
          trimmedComment ||
          `La ronda ${round.roundNumber} quedo observada por rechazo individual.`,
        responsibilityRole: "EDITOR",
        stageCode: "3.2",
        status: "OBSERVED",
        waitingReason: "WAITING_INTERNAL_RESPONSE",
      });

      return;
    }

    await tx.reviewRound.update({
      where: { id: assignment.reviewRoundId },
      data: {
        status: "APPROVED",
        closedAt: new Date(),
      },
    });

    await tx.documentVersion.update({
      where: { id: version.id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
      },
    });

    if (!version.document.currentVersionId) {
      await tx.document.update({
        where: { id: version.documentId },
        data: {
          status: "APPROVED_DRAFT",
        },
      });
    }

    await syncLinkedRequestStatus(tx, version.documentId, {
      actorUserId: input.actorUser.id,
      note: `La ronda ${round.roundNumber} obtuvo aprobacion unanime.`,
      responsibilityRole: "EDITOR",
      stageCode: "4.1",
      status: "APPROVED",
      waitingReason: "NONE",
    });
  });
}

export async function officializeVersion(input: {
  actorUser: SessionUser;
  officialFile: File;
  versionId: string;
}) {
  if (!canUploadOfficialDocuments(input.actorUser) || !canOfficializeDocuments(input.actorUser)) {
    throw new Error("Tu usuario no tiene permiso para oficializar documentos.");
  }

  const version = await prisma.documentVersion.findUnique({
    where: { id: input.versionId },
    select: {
      id: true,
      documentId: true,
      versionLabel: true,
      majorVersion: true,
      minorVersion: true,
      status: true,
      previousVersionId: true,
      document: {
        select: {
          id: true,
          identityCode: true,
          temporaryCode: true,
          documentTypeId: true,
          currentVersionId: true,
          ownerEditorUserId: true,
        },
      },
    },
  });

  if (!version) {
    throw new Error("La version documental ya no existe.");
  }

  if (version.status !== "APPROVED") {
    throw new Error("Solo puedes oficializar una version previamente aprobada.");
  }

  assertCanManageDocumentWorkflow(input.actorUser, version.document.ownerEditorUserId);

  const storedOfficialFile = await saveDocumentFile({
    documentId: version.documentId,
    documentVersionId: version.id,
    file: input.officialFile,
    fileRole: "OFFICIAL",
    uploadedByUserId: input.actorUser.id,
  });

  try {
    await prisma.$transaction(async (tx) => {
      const identityCode =
        version.document.identityCode ||
        (await generateNextOfficialIdentityCode(tx, version.document.documentTypeId));
      const fullCode = `${identityCode}-V${version.versionLabel}`;
      const now = new Date();

      if (version.document.currentVersionId && version.document.currentVersionId !== version.id) {
        await tx.documentVersion.update({
          where: { id: version.document.currentVersionId },
          data: {
            status: "SUPERSEDED",
            isCurrent: false,
          },
        });
      }

      await tx.documentFile.create({
        data: {
          id: randomUUID(),
          documentId: version.documentId,
          documentVersionId: version.id,
          fileRole: "OFFICIAL",
          originalFileName: storedOfficialFile.originalFileName,
          storedFileName: getStoredFileName(storedOfficialFile.storagePath),
          storagePath: storedOfficialFile.storagePath,
          mimeType: storedOfficialFile.mimeType,
          sizeBytes: storedOfficialFile.sizeBytes,
          uploadedByUserId: storedOfficialFile.uploadedByUserId ?? null,
        },
      });

      await tx.documentVersion.update({
        where: { id: version.id },
        data: {
          status: "OFFICIAL",
          isCurrent: true,
          fullCode,
          officializedAt: now,
        },
      });

      await tx.document.update({
        where: { id: version.documentId },
        data: {
          identityCode,
          currentVersionId: version.id,
          ownerEditorUserId: version.document.ownerEditorUserId,
          officializedAt: now,
          status: "OFFICIAL",
        },
      });

      await tx.reviewRound.updateMany({
        where: {
          documentVersionId: version.id,
          status: "APPROVED",
        },
        data: {
          status: "OFFICIALIZED",
        },
      });

      await tx.aIIndexJob.create({
        data: {
          id: randomUUID(),
          documentId: version.documentId,
          documentVersionId: version.id,
          triggerReason: "OFFICIALIZATION",
          status: "PENDING",
          createdByUserId: input.actorUser.id,
        },
      });

      await syncLinkedRequestStatus(tx, version.documentId, {
        actorUserId: input.actorUser.id,
        note: `Version oficial ${fullCode} publicada para consulta controlada.`,
        responsibilityRole: "EDITOR",
        stageCode: "4.3",
        status: "OFFICIALIZED",
        waitingReason: "NONE",
      });
    });
  } catch (error) {
    await deleteStoredDocumentFiles([storedOfficialFile.storagePath]);
    throw error;
  }
}

async function listReviewWorkItems(user: Pick<SessionUser, "permissions" | "role">) {
  const versions = (await prisma.documentVersion.findMany({
    where: {
      status: {
        in: [...activeVersionStatuses],
      },
    },
    orderBy: [
      {
        createdAt: "desc",
      },
    ],
    select: {
      id: true,
      documentId: true,
      majorVersion: true,
      minorVersion: true,
      versionLabel: true,
      fullCode: true,
      changeType: true,
      changeSummary: true,
      status: true,
      previousVersionId: true,
      createdByUserId: true,
      createdAt: true,
      submittedAt: true,
      approvedAt: true,
      officializedAt: true,
      isCurrent: true,
    },
  })) as ReviewVersionRow[];

  if (versions.length === 0) {
    return [] satisfies ReviewWorkItemRecord[];
  }

  const documentIds = [...new Set(versions.map((version) => version.documentId))];
  const versionIds = versions.map((version) => version.id);
  const [documents, rounds, assignments, comments, files, requests] = await Promise.all([
    prisma.document.findMany({
      where: {
        id: {
          in: documentIds,
        },
      },
      select: {
        id: true,
        identityCode: true,
        temporaryCode: true,
        title: true,
        description: true,
        documentTypeId: true,
        processId: true,
        status: true,
        currentVersionId: true,
        createdByUserId: true,
        ownerEditorUserId: true,
        createdAt: true,
        updatedAt: true,
        officializedAt: true,
        documentType: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        process: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    }) as Promise<ReviewDocumentRow[]>,
    prisma.reviewRound.findMany({
      where: {
        documentVersionId: {
          in: versionIds,
        },
      },
      orderBy: [
        {
          roundNumber: "desc",
        },
      ],
      select: {
        id: true,
        documentVersionId: true,
        roundNumber: true,
        status: true,
        submittedByUserId: true,
        submittedAt: true,
        closedAt: true,
      },
    }) as Promise<ReviewRoundRow[]>,
    prisma.reviewAssignment.findMany({
      where: {
        reviewRoundId: {
          in: await collectRoundIds(versionIds),
        },
      },
      select: {
        id: true,
        reviewRoundId: true,
        userId: true,
        assignmentRole: true,
        status: true,
        decisionComment: true,
        decidedAt: true,
      },
    }) as Promise<ReviewAssignmentRow[]>,
    prisma.draftComment.findMany({
      where: {
        documentVersionId: {
          in: versionIds,
        },
      },
      orderBy: [
        {
          createdAt: "desc",
        },
      ],
      select: {
        id: true,
        reviewAssignmentId: true,
        documentVersionId: true,
        commentType: true,
        comment: true,
        suggestedText: true,
        sectionReference: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
        resolvedByUserId: true,
      },
    }) as Promise<DraftCommentRow[]>,
    prisma.documentFile.findMany({
      where: {
        documentVersionId: {
          in: versionIds,
        },
      },
      orderBy: [
        {
          uploadedAt: "desc",
        },
      ],
      select: {
        id: true,
        documentId: true,
        documentVersionId: true,
        fileRole: true,
        originalFileName: true,
        storedFileName: true,
        storagePath: true,
        mimeType: true,
        sizeBytes: true,
        checksum: true,
        uploadedByUserId: true,
        uploadedAt: true,
      },
    }) as Promise<ReviewFileRow[]>,
    prisma.documentRequest.findMany({
      where: {
        relatedDocumentId: {
          in: documentIds,
        },
      },
      orderBy: [
        {
          updatedAt: "desc",
        },
      ],
      select: {
        id: true,
        requestCode: true,
        requestType: true,
        requesterUserId: true,
        createdByUserId: true,
        requesterArea: true,
        suggestedDocumentTypeId: true,
        suggestedProcessId: true,
        relatedDocumentId: true,
        title: true,
        description: true,
        justification: true,
        priority: true,
        requiredDate: true,
        status: true,
        assignedEditorUserId: true,
        assignedByUserId: true,
        assignedAt: true,
        currentTrackingStageCode: true,
        currentResponsibilityRole: true,
        waitingReason: true,
        waitingSince: true,
        lastRequesterResponseAt: true,
        cancellationRequestedAt: true,
        cancellationRequestedByUserId: true,
        cancellationRequestReason: true,
        closedAt: true,
        createdAt: true,
        updatedAt: true,
        suggestedProcess: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        suggestedDocumentType: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        relatedDocument: {
          select: {
            id: true,
            identityCode: true,
            temporaryCode: true,
            title: true,
          },
        },
      },
    }) as Promise<ReviewRequestRow[]>,
  ]);

  const people = await resolvePeople({
    assignments,
    comments,
    documents,
    requests,
    rounds,
    versions,
  });

  const requestByDocumentId = new Map<string, ReviewRequestRow>();

  for (const request of requests) {
    if (!request.relatedDocumentId || requestByDocumentId.has(request.relatedDocumentId)) {
      continue;
    }

    requestByDocumentId.set(request.relatedDocumentId, request);
  }

  const roundsByVersionId = groupBy(rounds, (round) => round.documentVersionId);
  const assignmentsByRoundId = groupBy(assignments, (assignment) => assignment.reviewRoundId);
  const commentsByAssignmentId = groupBy(comments, (comment) => comment.reviewAssignmentId);
  const filesByVersionId = groupBy(
    files.filter((file) => Boolean(file.documentVersionId)),
    (file) => file.documentVersionId!,
  );

  const workItems: ReviewWorkItemRecord[] = [];

  for (const version of versions) {
    const document = documents.find((item) => item.id === version.documentId);

    if (!document) {
      continue;
    }

    const request = requestByDocumentId.get(document.id);
    const versionRounds = roundsByVersionId.get(version.id) ?? [];
    const latestRound = versionRounds[0];
    const previousRounds = versionRounds.slice(1);
    const mappedLatestRound = latestRound
      ? mapReviewRoundRecord(latestRound, assignmentsByRoundId, commentsByAssignmentId, people)
      : undefined;
    const mappedPreviousRounds = previousRounds.map((round) =>
      mapReviewRoundRecord(round, assignmentsByRoundId, commentsByAssignmentId, people),
    );
    const versionFiles = filesByVersionId.get(version.id) ?? [];
    const draftFiles = versionFiles
      .filter((file) => file.fileRole === "DRAFT")
      .map((file) => mapReviewFileRecord(file, user));
    const officialFiles = versionFiles
      .filter((file) => file.fileRole === "OFFICIAL")
      .map((file) => mapReviewFileRecord(file, user));
    const latestRoundAssignments = mappedLatestRound?.assignments ?? [];
    const latestRoundComments = mappedLatestRound?.comments ?? [];

    workItems.push({
      documentId: document.id,
      documentCode: document.identityCode || document.temporaryCode || "SIN-CODIGO",
      documentTitle: document.title,
      documentState: normalizeDocumentState(document.status),
      identityCode: document.identityCode || undefined,
      temporaryCode: document.temporaryCode || undefined,
      request: request ? mapRequestCandidateRecord(request, people) : undefined,
      processLabel: `${document.process.code} - ${document.process.name}`,
      documentTypeLabel: `${document.documentType.code} - ${document.documentType.name}`,
      ownerEditor: document.ownerEditorUserId
        ? resolvePersonRecord(people, document.ownerEditorUserId)
        : undefined,
      versionId: version.id,
      versionLabel: version.versionLabel,
      versionStatus: normalizeDocumentVersionStatus(version.status),
      fullCode: version.fullCode || undefined,
      changeKind: version.changeType
        ? normalizeVersionChangeKind(version.changeType)
        : undefined,
      changeSummary: version.changeSummary || undefined,
      createdAt: formatDateTime(version.createdAt),
      submittedAt: version.submittedAt ? formatDateTime(version.submittedAt) : undefined,
      approvedAt: version.approvedAt ? formatDateTime(version.approvedAt) : undefined,
      officializedAt: version.officializedAt ? formatDateTime(version.officializedAt) : undefined,
      latestRound: mappedLatestRound,
      previousRounds: mappedPreviousRounds,
      draftFiles,
      officialFiles,
      pendingAssignments: latestRoundAssignments.filter((item) => item.status === "PENDING").length,
      approvedAssignments: latestRoundAssignments.filter((item) => item.status === "APPROVED").length,
      rejectedAssignments: latestRoundAssignments.filter((item) => item.status === "REJECTED").length,
      openCommentCount: latestRoundComments.filter((item) => item.status === "OPEN").length,
    });
  }

  return workItems;
}

async function collectRoundIds(versionIds: string[]) {
  const rounds = await prisma.reviewRound.findMany({
    where: {
      documentVersionId: {
        in: versionIds,
      },
    },
    select: {
      id: true,
    },
  });

  return rounds.map((round) => round.id);
}

async function listRequestCandidates(activeDocumentIds: Set<string>) {
  const requests = (await prisma.documentRequest.findMany({
    where: {
      status: {
        in: [...activeRequestStatuses],
      },
      assignedEditorUserId: {
        not: null,
      },
      OR: [
        {
          requestType: "NEW_DOCUMENT",
          relatedDocumentId: null,
        },
        {
          requestType: "UPDATE_EXISTING",
          relatedDocumentId: {
            not: null,
          },
        },
      ],
    },
    orderBy: [
      {
        updatedAt: "desc",
      },
    ],
    select: {
      id: true,
      requestCode: true,
      requestType: true,
      requesterUserId: true,
      createdByUserId: true,
      requesterArea: true,
      suggestedDocumentTypeId: true,
      suggestedProcessId: true,
      relatedDocumentId: true,
      title: true,
      description: true,
      justification: true,
      priority: true,
      requiredDate: true,
      status: true,
      assignedEditorUserId: true,
      assignedByUserId: true,
      assignedAt: true,
      currentTrackingStageCode: true,
      currentResponsibilityRole: true,
      waitingReason: true,
      waitingSince: true,
      lastRequesterResponseAt: true,
      cancellationRequestedAt: true,
      cancellationRequestedByUserId: true,
      cancellationRequestReason: true,
      closedAt: true,
      createdAt: true,
      updatedAt: true,
      suggestedProcess: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      suggestedDocumentType: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      relatedDocument: {
        select: {
          id: true,
          identityCode: true,
          temporaryCode: true,
          title: true,
        },
      },
    },
  })) as ReviewRequestRow[];

  const filteredRequests = requests.filter((request) => {
    const requestType = normalizeRequestType(request.requestType);

    if (!canRequestEnterDraftReviewFlow(request.currentTrackingStageCode, requestType)) {
      return false;
    }

    if (request.requestType === "NEW_DOCUMENT") {
      return true;
    }

    if (!request.relatedDocumentId) {
      return false;
    }

    return !activeDocumentIds.has(request.relatedDocumentId);
  });

  const people = await resolvePeople({
    assignments: [],
    comments: [],
    documents: [],
    requests: filteredRequests,
    rounds: [],
    versions: [],
  });

  return filteredRequests.map((request) => mapRequestCandidateRecord(request, people));
}

async function listEditorialUsers(): Promise<ReviewUserIdentity[]> {
  if (runtimeConfig.authMode === "local") {
    return [
      ...listMockAccountsByRole("ADMINISTRATOR"),
      ...listMockAccountsByRole("EDITOR"),
    ].map((account) => ({
      id: account.id,
      name: account.name,
      username: account.username,
      role: account.role,
      permissions: [...account.permissions],
    }));
  }

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      roles: {
        some: {
          role: {
            code: {
              in: ["ADMINISTRATOR", "EDITOR"],
            },
          },
        },
      },
    },
    orderBy: [{ name: "asc" }],
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
      readerGroups: {
        where: {
          revokedAt: null,
        },
        include: {
          readerGroup: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
      permissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  return users
    .map((user) => toReviewUserIdentity(user))
    .filter((user) => user.role === "ADMINISTRATOR" || user.role === "EDITOR");
}

function toReviewUserIdentity(user: DatabaseAuthUser): ReviewUserIdentity {
  const role = resolvePrimaryAppRole(user.roles.map(({ role }) => role.code));
  const rolePermissions = collectRolePermissionCodes(user.roles);
  const groupPermissions = collectReaderGroupPermissionCodes(user.readerGroups);
  const { grantedPermissionCodes, revokedPermissionCodes } = collectUserPermissionOverrides(
    user.permissions,
  );
  const { effectivePermissionCodes } = resolveEffectivePermissionCodes({
    rolePermissionCodes: rolePermissions,
    groupPermissionCodes: groupPermissions,
    grantedPermissionCodes,
    revokedPermissionCodes,
  });

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role,
    permissions: effectivePermissionCodes,
  };
}

function toReviewUserOptionRecord(user: ReviewUserIdentity): ReviewUserOptionRecord {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
  };
}

function mapRequestCandidateRecord(
  request: ReviewRequestRow,
  people: Map<string, { id: string; name: string; username?: string }>,
): ReviewRequestCandidateRecord {
  const requestType = normalizeRequestType(request.requestType);
  const stage = getRequestTrackingStage(request.currentTrackingStageCode, requestType);

  return {
    id: request.id,
    requestCode: request.requestCode,
    title: request.title,
    requestType,
    processLabel: request.suggestedProcess
      ? `${request.suggestedProcess.code} - ${request.suggestedProcess.name}`
      : "Sin proceso sugerido",
    documentTypeLabel: request.suggestedDocumentType
      ? `${request.suggestedDocumentType.code} - ${request.suggestedDocumentType.name}`
      : "Sin tipo sugerido",
    status: normalizeWorkflowStatus(request.status),
    currentActivityName: stage.activityName,
    requester: request.requesterUserId
      ? resolvePersonRecord(people, request.requesterUserId)
      : undefined,
    assignedEditor: request.assignedEditorUserId
      ? resolvePersonRecord(people, request.assignedEditorUserId)
      : undefined,
    relatedDocumentLabel: request.relatedDocument
      ? `${request.relatedDocument.identityCode || request.relatedDocument.temporaryCode || "SIN-CODIGO"} - ${request.relatedDocument.title}`
      : undefined,
    updatedAt: formatDateTime(request.updatedAt),
  };
}

function mapReviewRoundRecord(
  round: ReviewRoundRow,
  assignmentsByRoundId: Map<string, ReviewAssignmentRow[]>,
  commentsByAssignmentId: Map<string, DraftCommentRow[]>,
  people: Map<string, { id: string; name: string; username?: string }>,
): ReviewRoundRecord {
  const assignmentRows = assignmentsByRoundId.get(round.id) ?? [];
  const assignments = assignmentRows.map((assignment) =>
    mapReviewAssignmentRecord(assignment, commentsByAssignmentId, people),
  );
  const comments = assignmentRows.flatMap((assignment) =>
    (commentsByAssignmentId.get(assignment.id) ?? []).map((comment) =>
      mapReviewCommentRecord(comment, assignment, people),
    ),
  );

  return {
    id: round.id,
    roundNumber: round.roundNumber,
    status: normalizeReviewRoundStatus(round.status),
    submittedAt: round.submittedAt ? formatDateTime(round.submittedAt) : undefined,
    submittedBy: round.submittedByUserId
      ? resolvePersonRecord(people, round.submittedByUserId)
      : undefined,
    closedAt: round.closedAt ? formatDateTime(round.closedAt) : undefined,
    assignments,
    comments,
  };
}

function mapReviewAssignmentRecord(
  assignment: ReviewAssignmentRow,
  commentsByAssignmentId: Map<string, DraftCommentRow[]>,
  people: Map<string, { id: string; name: string; username?: string }>,
): ReviewAssignmentRecord {
  const comments = commentsByAssignmentId.get(assignment.id) ?? [];

  return {
    id: assignment.id,
    user: resolvePersonRecord(people, assignment.userId),
    assignmentRole: normalizeReviewAssignmentRole(assignment.assignmentRole),
    status: normalizeReviewDecision(assignment.status),
    decisionComment: assignment.decisionComment || undefined,
    decidedAt: assignment.decidedAt ? formatDateTime(assignment.decidedAt) : undefined,
    openCommentCount: comments.filter((comment) => normalizeDraftCommentStatus(comment.status) === "OPEN")
      .length,
    totalCommentCount: comments.length,
  };
}

function mapReviewCommentRecord(
  comment: DraftCommentRow,
  assignment: ReviewAssignmentRow,
  people: Map<string, { id: string; name: string; username?: string }>,
): ReviewDraftCommentRecord {
  return {
    id: comment.id,
    assignmentId: comment.reviewAssignmentId,
    assignmentRole: normalizeReviewAssignmentRole(assignment.assignmentRole),
    author: resolvePersonRecord(people, assignment.userId),
    commentType: normalizeDraftCommentType(comment.commentType),
    comment: comment.comment,
    suggestedText: comment.suggestedText || undefined,
    sectionReference: comment.sectionReference || undefined,
    status: normalizeDraftCommentStatus(comment.status),
    createdAt: formatDateTime(comment.createdAt),
    resolvedAt: comment.resolvedAt ? formatDateTime(comment.resolvedAt) : undefined,
    resolvedBy: comment.resolvedByUserId
      ? resolvePersonRecord(people, comment.resolvedByUserId)
      : undefined,
  };
}

function mapReviewFileRecord(
  file: ReviewFileRow,
  user: Pick<SessionUser, "permissions" | "role">,
): ReviewFileRecord {
  const previewKind = getFilePreviewKind(file);

  return {
    canDownload: canDownloadDocuments(user),
    canPreview:
      (file.fileRole === "OFFICIAL" || user.role !== "READER") && previewKind !== "unsupported",
    downloadHref: `/api/document-files/${file.id}`,
    id: file.id,
    fileRole: file.fileRole === "OFFICIAL" ? "OFFICIAL" : "DRAFT",
    mimeType: file.mimeType,
    originalFileName: file.originalFileName,
    previewHref: buildFilePreviewHref("/api/document-files", file.id),
    previewKind,
    sizeBytes: file.sizeBytes,
    uploadedAt: formatDateTime(file.uploadedAt),
  };
}

async function resolvePeople(input: {
  assignments: ReviewAssignmentRow[];
  comments: DraftCommentRow[];
  documents: ReviewDocumentRow[];
  requests: ReviewRequestRow[];
  rounds: ReviewRoundRow[];
  versions: ReviewVersionRow[];
}) {
  const peopleIds = [
    ...new Set(
      [
        ...input.documents.flatMap((document) => [
          document.createdByUserId,
          document.ownerEditorUserId,
        ]),
        ...input.versions.map((version) => version.createdByUserId),
        ...input.rounds.map((round) => round.submittedByUserId),
        ...input.assignments.map((assignment) => assignment.userId),
        ...input.comments.map((comment) => comment.resolvedByUserId),
        ...input.requests.flatMap((request) => [
          request.requesterUserId,
          request.createdByUserId,
          request.assignedEditorUserId,
          request.assignedByUserId,
          request.cancellationRequestedByUserId,
        ]),
      ].filter((value): value is string => Boolean(value)),
    ),
  ];

  const people = new Map<string, { id: string; name: string; username?: string }>();

  if (peopleIds.length === 0) {
    return people;
  }

  if (runtimeConfig.authMode === "database") {
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: peopleIds,
        },
      },
      select: {
        id: true,
        name: true,
        username: true,
      },
    });

    for (const user of users) {
      people.set(user.id, user);
    }
  }

  for (const personId of peopleIds) {
    if (people.has(personId)) {
      continue;
    }

    const account = findMockAccountById(personId);

    if (account) {
      people.set(account.id, {
        id: account.id,
        name: account.name,
        username: account.username,
      });
    }
  }

  return people;
}

function resolvePersonRecord(
  people: Map<string, { id: string; name: string; username?: string }>,
  personId: string,
): RequestPersonRecord {
  return (
    people.get(personId) ?? {
      id: personId,
      name: "Usuario no resuelto",
    }
  );
}

function normalizeReviewAssignmentRole(role: string): ReviewAssignmentRole {
  return role === "APPROVER" ? "APPROVER" : "REVIEWER";
}

function normalizeReviewDecision(status: string) {
  switch (status) {
    case "APPROVED":
    case "REJECTED":
      return status;
    default:
      return "PENDING" as const;
  }
}

function normalizeReviewRoundStatus(status: string): ReviewRoundStatus {
  switch (status) {
    case "OBSERVED":
    case "APPROVED":
    case "OFFICIALIZED":
      return status;
    default:
      return "IN_REVIEW";
  }
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

function normalizeDraftCommentType(commentType: string): DraftCommentType {
  return commentType === "SUGGESTION" ? "SUGGESTION" : "OBSERVATION";
}

function normalizeDraftCommentStatus(status: string): DraftCommentStatus {
  return status === "RESOLVED" ? "RESOLVED" : "OPEN";
}

function normalizeRequestType(requestType: string) {
  return requestType === "UPDATE_EXISTING" ? "UPDATE_EXISTING" : "NEW_DOCUMENT";
}

function normalizeWorkflowStatus(status: string): WorkflowStatus {
  switch (status) {
    case "ASSIGNED":
    case "IN_PROGRESS":
    case "OBSERVED":
    case "IN_REVIEW":
    case "APPROVED":
    case "OFFICIALIZED":
    case "CLOSED":
    case "CANCELLED":
      return status;
    default:
      return "PENDING_ASSIGNMENT";
  }
}

function buildNextVersionNumbers(
  previousVersion: { majorVersion: number; minorVersion: number } | null,
  changeKind: VersionChangeKind,
) {
  if (!previousVersion) {
    return {
      majorVersion: 1,
      minorVersion: 0,
    };
  }

  if (changeKind === "MAJOR") {
    return {
      majorVersion: previousVersion.majorVersion + 1,
      minorVersion: 0,
    };
  }

  return {
    majorVersion: previousVersion.majorVersion,
    minorVersion: previousVersion.minorVersion + 1,
  };
}

function formatVersionLabel(majorVersion: number, minorVersion: number) {
  return `${majorVersion}.${minorVersion}`;
}

async function generateNextTemporaryCode(tx: Prisma.TransactionClient) {
  const currentYear = new Date().getFullYear();
  const prefix = `BOR-${currentYear}-`;
  const latestDocument = await tx.document.findFirst({
    where: {
      temporaryCode: {
        startsWith: prefix,
      },
    },
    orderBy: {
      temporaryCode: "desc",
    },
    select: {
      temporaryCode: true,
    },
  });

  const nextSequence =
    latestDocument?.temporaryCode && latestDocument.temporaryCode.startsWith(prefix)
      ? Number.parseInt(latestDocument.temporaryCode.slice(prefix.length), 10) + 1
      : 1;

  return `${prefix}${String(nextSequence).padStart(4, "0")}`;
}

async function generateNextOfficialIdentityCode(
  tx: Prisma.TransactionClient,
  documentTypeId: string,
) {
  const documentType = await tx.documentType.findUnique({
    where: { id: documentTypeId },
    select: {
      code: true,
      id: true,
    },
  });

  if (!documentType) {
    throw new Error("El tipo documental vinculado ya no existe.");
  }

  const currentYear = new Date().getFullYear();
  const currentYearPrefix = `${documentType.code}-${currentYear}`;
  const currentYearDocuments = await tx.document.findMany({
    where: {
      documentTypeId,
      identityCode: {
        startsWith: currentYearPrefix,
      },
    },
    select: {
      identityCode: true,
    },
  });
  const highestCurrentYearSequence = currentYearDocuments.reduce((max, document) => {
    if (!document.identityCode) {
      return max;
    }

    return Math.max(
      max,
      parseOfficialIdentitySequenceNumber(document.identityCode, currentYearPrefix),
    );
  }, 0);

  const sequence = await tx.documentSequence.findFirst({
    where: {
      documentTypeId,
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      nextNumber: true,
    },
  });

  const sequenceNumber = highestCurrentYearSequence + 1;

  if (sequence) {
    await tx.documentSequence.update({
      where: { id: sequence.id },
      data: {
        nextNumber: sequenceNumber + 1,
      },
    });
  } else {
    await tx.documentSequence.create({
      data: {
        id: randomUUID(),
        documentTypeId,
        nextNumber: sequenceNumber + 1,
      },
    });
  }

  return `${currentYearPrefix}${String(sequenceNumber).padStart(3, "0")}`;
}

function parseOfficialIdentitySequenceNumber(identityCode: string, prefix: string) {
  if (!identityCode.startsWith(prefix)) {
    return 0;
  }

  const rawSequence = identityCode.slice(prefix.length);
  const sequenceNumber = Number.parseInt(rawSequence, 10);

  return Number.isFinite(sequenceNumber) ? sequenceNumber : 0;
}

async function syncLinkedRequestStatus(
  tx: Prisma.TransactionClient,
  documentId: string,
  input: {
    actorUserId: string;
    note: string;
    responsibilityRole: "EDITOR" | "ADMINISTRATOR" | "REQUESTER";
    stageCode: string;
    status: WorkflowStatus;
    waitingReason:
      | "NONE"
      | "WAITING_REQUESTER_INFO"
      | "WAITING_INTERNAL_RESPONSE"
      | "WAITING_REVIEW"
      | "WAITING_APPROVAL";
  },
) {
  const request = await tx.documentRequest.findFirst({
    where: {
      relatedDocumentId: documentId,
      status: {
        notIn: ["CANCELLED", "CLOSED"],
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
    },
  });

  if (!request) {
    return;
  }

  const now = new Date();

  await tx.documentRequest.update({
    where: { id: request.id },
    data: {
      currentTrackingStageCode: input.stageCode,
      currentResponsibilityRole: input.responsibilityRole,
      waitingReason: input.waitingReason,
      waitingSince: input.waitingReason === "NONE" ? null : now,
      status: input.status,
    },
  });

  await tx.documentRequestActivity.create({
    data: {
      id: randomUUID(),
      documentRequestId: request.id,
      actorUserId: input.actorUserId,
      activityType: "TRACKING_UPDATED",
      trackingStageCode: input.stageCode,
      responsibilityRole: input.responsibilityRole,
      waitingReason: input.waitingReason,
      note: input.note,
      statusAfter: input.status,
    },
  });
}

function assertCanManageDocumentWorkflow(
  actorUser: SessionUser,
  ownerEditorUserId: string | null,
) {
  const canManage =
    actorUser.role === "ADMINISTRATOR" ||
    (ownerEditorUserId !== null && ownerEditorUserId === actorUser.id);

  if (!canManage) {
    throw new Error("No tienes permiso para operar este flujo documental.");
  }
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeUserIds(userIds: string[]) {
  return [...new Set(userIds.map((userId) => userId.trim()).filter(Boolean))];
}

function getStoredFileName(storagePath: string) {
  const segments = storagePath.replace(/\\/g, "/").split("/");
  return segments[segments.length - 1] || storagePath;
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const map = new Map<string, T[]>();

  for (const item of items) {
    const key = getKey(item);
    const group = map.get(key) ?? [];
    group.push(item);
    map.set(key, group);
  }

  return map;
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Mexico_City",
  }).format(date);
}
