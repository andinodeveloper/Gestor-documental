import { randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";

import { canCreateDocumentRequests, REQUESTS_CREATE_PERMISSION } from "@/lib/auth/permissions";
import { runtimeConfig } from "@/lib/config/runtime";
import {
  findMockAccountById,
  listMockAccountsByRole,
  listMockAccountsByRoleAndPermission,
} from "@/lib/auth/mock-accounts";
import type { SessionUser } from "@/lib/auth/types";
import type {
  RequestActivityRecord,
  RequestActivityType,
  RequestBoardFilters,
  EditorOptionRecord,
  MetricCard,
  RequestDetailRecord,
  RequestOptionRecord,
  RequestPriority,
  RequestProgressItemRecord,
  RequestRecord,
  RequesterOptionRecord,
  RequestType,
  RequestProgressItemStatus,
  ResponsibilityRole,
  WaitingReason,
  WorkflowStatus,
} from "@/lib/types";
import {
  deriveWorkflowStatusFromTracking,
  getRequestProgressSnapshot,
  getRequestProgressTemplate,
} from "@/lib/request-tracking";
import { prisma } from "@/lib/server/db";
import {
  deleteStoredRequestAttachments,
  formatAttachmentSize,
  getRequestAttachmentPolicy,
  saveRequestAttachment,
} from "@/lib/server/request-storage";

const requestStatusOrder: Record<WorkflowStatus, number> = {
  PENDING_ASSIGNMENT: 0,
  ASSIGNED: 1,
  IN_PROGRESS: 2,
  IN_REVIEW: 3,
  OBSERVED: 4,
  APPROVED: 5,
  OFFICIALIZED: 6,
  CLOSED: 7,
  CANCELLED: 8,
};

const requestPriorityOrder: Record<RequestPriority, number> = {
  Alta: 0,
  Media: 1,
  Baja: 2,
};

type RequestActivityRow = {
  id: string;
  actorUserId: string | null;
  activityType: string;
  note: string | null;
  statusAfter: string | null;
  createdAt: Date;
};

type RequestAttachmentRow = {
  id: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: Date;
};

type RequestProgressItemRow = {
  id: string;
  phaseCode: string;
  phaseName: string;
  activityCode: string;
  activityName: string;
  description: string | null;
  weight: number;
  sortOrder: number;
  status: string;
  note: string | null;
  completedAt: Date | null;
  lastChangedAt: Date;
  lastChangedByUserId: string | null;
};

type RequestWithRelations = {
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
  currentResponsibilityRole: string | null;
  waitingReason: string | null;
  waitingSince: Date | null;
  lastRequesterResponseAt: Date | null;
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
  attachments: RequestAttachmentRow[];
  activities: RequestActivityRow[];
  progressItems: RequestProgressItemRow[];
};

type PrismaRequestTrackingClient = {
  documentRequest: {
    findMany: (args: unknown) => Promise<RequestWithRelations[]>;
    update: (args: unknown) => Promise<unknown>;
    create: (args: unknown) => Promise<unknown>;
  };
  documentRequestProgressItem: {
    findMany: (args: unknown) => Promise<unknown>;
    findUnique: (args: unknown) => Promise<RequestProgressItemRow | null>;
    update: (args: unknown) => Promise<unknown>;
    create: (args: unknown) => Promise<unknown>;
  };
};

const prismaTracking = prisma as unknown as PrismaRequestTrackingClient;

const requestInclude = {
  activities: {
    orderBy: [{ createdAt: "desc" }],
  },
  attachments: true,
  suggestedProcess: true,
  suggestedDocumentType: true,
  relatedDocument: {
    select: {
      id: true,
      identityCode: true,
      temporaryCode: true,
      title: true,
    },
  },
  progressItems: {
    orderBy: [{ sortOrder: "asc" }],
  },
};

async function findRequestsWithRelations(input: {
  where?: Prisma.DocumentRequestWhereInput;
  orderBy?: Prisma.DocumentRequestOrderByWithRelationInput[];
  take?: number;
}) {
  let requests = await prismaTracking.documentRequest.findMany({
    where: input.where,
    include: requestInclude,
    orderBy: input.orderBy,
    take: input.take,
  });

  const missingProgress = requests.filter((request) => request.progressItems.length === 0);

  if (missingProgress.length > 0) {
    await Promise.all(
      missingProgress.map((request) =>
        ensureRequestProgressItems(request.id, normalizeRequestType(request.requestType)),
      ),
    );

    requests = await prismaTracking.documentRequest.findMany({
      where: input.where,
      include: requestInclude,
      orderBy: input.orderBy,
      take: input.take,
    });
  }

  return requests;
}

export async function getRequestIntakeSnapshot(user: SessionUser) {
  const [processOptions, documentTypeOptions, relatedDocumentOptions, requesterOptions] =
    await Promise.all([
      listProcessOptions(),
      listDocumentTypeOptions(),
      listRelatedDocumentOptions(),
      user.role === "READER" ? Promise.resolve([]) : listRequestCapableReaders(),
    ]);
  const attachmentPolicy = getRequestAttachmentPolicy();

  return {
    processOptions,
    documentTypeOptions,
    relatedDocumentOptions,
    requesterOptions,
    attachmentPolicy: {
      ...attachmentPolicy,
      allowedExtensionsLabel: attachmentPolicy.allowedExtensions
        .map((extension) => extension.toUpperCase())
        .join(", "),
      maxAttachmentSizeLabel: formatAttachmentSize(attachmentPolicy.maxAttachmentSizeBytes),
    },
    canCreateRequests: canCreateDocumentRequests(user),
  };
}

export async function getRequestsWorkspaceSnapshot(
  user: SessionUser,
  filters: RequestBoardFilters = {},
) {
  const where = buildRequestWhereForUser(user, filters);
  const [requests, editors, intakeSnapshot, requesterFilterOptions] =
    await Promise.all([
      findRequestsWithRelations({
        where,
        orderBy: [{ updatedAt: "desc" }],
      }),
      user.role === "READER" ? Promise.resolve([]) : listAssignableEditors(),
      getRequestIntakeSnapshot(user),
      user.role === "READER" ? Promise.resolve([]) : listRequestRequesterOptions(),
    ]);

  const people = await resolvePeopleFromRequests(requests);

  return {
    requests: sortRequests(requests).map((request) => mapRequestToDetailRecord(request, people)),
    editors,
    filters: normalizeBoardFilters(filters),
    ...intakeSnapshot,
    requesterFilterOptions,
    canAssignRequests: user.role === "ADMINISTRATOR",
  };
}

export async function getDashboardRequestSnapshot() {
  const requests = await findRequestsWithRelations({
    orderBy: [{ updatedAt: "desc" }],
    take: 8,
  });

  const people = await resolvePeopleFromRequests(requests);
  const records = sortRequests(requests).map((request) => mapRequestToListRecord(request, people));

  const [pendingAssignmentCount, activeCount, closedCount] = await Promise.all([
    prisma.documentRequest.count({ where: { status: "PENDING_ASSIGNMENT" } }),
    prisma.documentRequest.count({
      where: { status: { in: ["ASSIGNED", "IN_PROGRESS", "IN_REVIEW", "OBSERVED", "APPROVED", "OFFICIALIZED"] } },
    }),
    prisma.documentRequest.count({
      where: { status: { in: ["CLOSED"] } },
    }),
  ]);

  const metrics: MetricCard[] = [
    {
      label: "Solicitudes pendientes",
      value: String(pendingAssignmentCount).padStart(2, "0"),
      detail:
        pendingAssignmentCount === 0
          ? "Sin cola por asignar"
          : `${pendingAssignmentCount} por asignar`,
      tone: pendingAssignmentCount > 0 ? "accent" : "green",
    },
    {
      label: "Solicitudes activas",
      value: String(activeCount).padStart(2, "0"),
      detail: activeCount === 0 ? "Sin trabajo en curso" : "En gestion editorial",
      tone: activeCount > 0 ? "amber" : "green",
    },
    {
      label: "Solicitudes cerradas",
      value: String(closedCount).padStart(2, "0"),
      detail: "Oficializadas o completadas",
      tone: "green",
    },
  ];

  return {
    metrics,
    requests: records,
  };
}

export async function createDocumentRequest(input: {
  requesterUserId: string;
  createdByUser: SessionUser;
  requestType: RequestType;
  requesterArea: string;
  suggestedProcessId: string;
  suggestedDocumentTypeId: string;
  relatedDocumentId?: string;
  title: string;
  description: string;
  justification?: string;
  priority: RequestPriority;
  requiredDate?: string;
  attachments: File[];
}) {
  const requestId = randomUUID();
  const savedStoragePaths: string[] = [];

  try {
    const attachmentRecords = [];

    for (const attachment of input.attachments) {
      const storedAttachment = await saveRequestAttachment({
        requestId,
        file: attachment,
        uploadedByUserId: input.createdByUser.id,
      });

      savedStoragePaths.push(storedAttachment.storagePath);
      attachmentRecords.push(storedAttachment);
    }

    const createdRequest = await createRequestWithGeneratedCode({
      id: requestId,
      requesterUserId: input.requesterUserId,
      createdByUserId: input.createdByUser.id,
      requesterArea: input.requesterArea,
      requestType: input.requestType,
      suggestedProcessId: input.suggestedProcessId,
      suggestedDocumentTypeId: input.suggestedDocumentTypeId,
      relatedDocumentId: input.relatedDocumentId,
      title: input.title,
      description: input.description,
      justification: input.justification,
      priority: input.priority,
      requiredDate: input.requiredDate ? new Date(input.requiredDate) : null,
      status: "PENDING_ASSIGNMENT",
      attachments: attachmentRecords,
    });

    await appendRequestActivity({
      documentRequestId: createdRequest.id,
      actorUserId: input.createdByUser.id,
      activityType: "CREATED",
      note:
        input.createdByUser.id === input.requesterUserId
          ? "Solicitud registrada por el solicitante."
          : "Solicitud registrada en auxilio para el lector solicitante.",
      statusAfter: "PENDING_ASSIGNMENT",
    });

    return createdRequest;
  } catch (error) {
    if (savedStoragePaths.length > 0) {
      await deleteStoredRequestAttachments(savedStoragePaths);
    }

    throw error;
  }
}

export async function assignRequestToEditor(input: {
  requestId: string;
  editorId: string;
  assignedByUserId: string;
}) {
  const request = await prisma.documentRequest.findUnique({
    where: { id: input.requestId },
    select: { status: true, id: true, assignedEditorUserId: true },
  });

  if (!request) {
    throw new Error("La solicitud ya no existe.");
  }

  if (request.status === "CLOSED" || request.status === "CANCELLED") {
    throw new Error("No se puede asignar una solicitud cerrada o cancelada.");
  }

  await prismaTracking.documentRequest.update({
    where: { id: input.requestId },
    data: {
      assignedEditorUserId: input.editorId,
      assignedByUserId: input.assignedByUserId,
      assignedAt: new Date(),
      currentResponsibilityRole: "EDITOR",
      waitingReason: "NONE",
      waitingSince: null,
      status: "ASSIGNED",
    },
  });

  await appendRequestActivity({
    documentRequestId: input.requestId,
    actorUserId: input.assignedByUserId,
    activityType: request.assignedEditorUserId ? "REASSIGNED" : "ASSIGNED",
    statusAfter: "ASSIGNED",
  });
}

export async function startRequestWork(input: { requestId: string; actorUser: SessionUser }) {
  const request = await prisma.documentRequest.findUnique({
    where: { id: input.requestId },
    select: { id: true, assignedEditorUserId: true, status: true },
  });

  if (!request) {
    throw new Error("La solicitud ya no existe.");
  }

  if (request.status !== "ASSIGNED" && request.status !== "IN_PROGRESS") {
    throw new Error("La solicitud no esta en un estado editable para iniciar trabajo.");
  }

  const canManage =
    input.actorUser.role === "ADMINISTRATOR" ||
    request.assignedEditorUserId === input.actorUser.id;

  if (!canManage) {
    throw new Error("No tienes permiso para iniciar esta solicitud.");
  }

  await prismaTracking.documentRequest.update({
    where: { id: input.requestId },
    data: {
      currentResponsibilityRole: "EDITOR",
      waitingReason: "NONE",
      waitingSince: null,
      status: "IN_PROGRESS",
    },
  });

  if (request.status !== "IN_PROGRESS") {
    await appendRequestActivity({
      documentRequestId: input.requestId,
      actorUserId: input.actorUser.id,
      activityType: "STARTED",
      statusAfter: "IN_PROGRESS",
    });
  }
}

export async function updateRequestProgress(input: {
  note: string;
  requestId: string;
  actorUser: SessionUser;
}) {
  const request = await prisma.documentRequest.findUnique({
    where: { id: input.requestId },
    select: {
      id: true,
      assignedEditorUserId: true,
      status: true,
    },
  });

  if (!request) {
    throw new Error("La solicitud ya no existe.");
  }

  if (request.status === "CLOSED" || request.status === "CANCELLED") {
    throw new Error("No se puede registrar avance en una solicitud cerrada o cancelada.");
  }

  const canManage =
    input.actorUser.role === "ADMINISTRATOR" ||
    request.assignedEditorUserId === input.actorUser.id;

  if (!canManage) {
    throw new Error("No tienes permiso para registrar avance en esta solicitud.");
  }

  await prismaTracking.documentRequest.update({
    where: { id: input.requestId },
    data: {
      currentResponsibilityRole:
        request.status === "OBSERVED" ? request.assignedEditorUserId ? "EDITOR" : "ADMINISTRATOR" : undefined,
      waitingReason: request.status === "OBSERVED" ? "NONE" : undefined,
      waitingSince: request.status === "OBSERVED" ? null : undefined,
      status: request.status === "ASSIGNED" ? "IN_PROGRESS" : request.status,
    },
  });

  await appendRequestActivity({
    documentRequestId: input.requestId,
    actorUserId: input.actorUser.id,
    activityType: "PROGRESS_UPDATED",
    note: input.note,
    statusAfter: request.status === "ASSIGNED" ? "IN_PROGRESS" : normalizeWorkflowStatus(request.status),
  });
}

export async function updateRequestProgressItem(input: {
  actorUser: SessionUser;
  note: string;
  requestId: string;
  activityCode: string;
  transition: "COMPLETE" | "REOPEN" | "MARK_NOT_APPLICABLE" | "RESTORE_APPLICABLE";
}) {
  const request = await prisma.documentRequest.findUnique({
    where: { id: input.requestId },
    select: {
      id: true,
      assignedEditorUserId: true,
      requestType: true,
      status: true,
    },
  });

  if (!request) {
    throw new Error("La solicitud ya no existe.");
  }

  if (request.status === "CLOSED" || request.status === "CANCELLED") {
    throw new Error("No se puede modificar el seguimiento en una solicitud cerrada o cancelada.");
  }

  const canManage =
    input.actorUser.role === "ADMINISTRATOR" ||
    request.assignedEditorUserId === input.actorUser.id;

  if (!canManage) {
    throw new Error("No tienes permiso para actualizar el seguimiento objetivo de esta solicitud.");
  }

  await ensureRequestProgressItems(input.requestId, normalizeRequestType(request.requestType));

  const progressItem = await prismaTracking.documentRequestProgressItem.findUnique({
    where: {
      documentRequestId_activityCode: {
        documentRequestId: input.requestId,
        activityCode: input.activityCode,
      },
    },
  });

  if (!progressItem) {
    throw new Error("La actividad de seguimiento ya no existe.");
  }

  const nextStatus = mapProgressTransitionToStatus(input.transition);
  const now = new Date();

  await prismaTracking.documentRequestProgressItem.update({
    where: { id: progressItem.id },
    data: {
      status: nextStatus,
      note: input.note,
      completedAt: nextStatus === "COMPLETED" ? now : null,
      lastChangedByUserId: input.actorUser.id,
    },
  });

  const updatedItems = (await prismaTracking.documentRequestProgressItem.findMany({
    where: { documentRequestId: input.requestId },
    orderBy: [{ sortOrder: "asc" }],
    select: {
      activityCode: true,
      activityName: true,
      phaseCode: true,
      phaseName: true,
      sortOrder: true,
      status: true,
      weight: true,
    },
  })) as Array<{
    activityCode: string;
    activityName: string;
    phaseCode: string;
    phaseName: string;
    sortOrder: number;
    status: string;
    weight: number;
  }>;

  const nextWorkflowStatus = deriveWorkflowStatusFromTracking({
    assignedEditorUserId: request.assignedEditorUserId,
    items: updatedItems.map((item) => ({
      ...item,
      status: normalizeProgressItemStatus(item.status),
    })),
    waitingReason: "NONE",
  });

  await prismaTracking.documentRequest.update({
    where: { id: input.requestId },
    data: {
      currentResponsibilityRole: request.assignedEditorUserId ? "EDITOR" : "ADMINISTRATOR",
      waitingReason: "NONE",
      waitingSince: null,
      status: nextWorkflowStatus,
    },
  });

  await appendRequestActivity({
    documentRequestId: input.requestId,
    actorUserId: input.actorUser.id,
    activityType: mapProgressTransitionToActivityType(input.transition),
    note: `${progressItem.activityCode} - ${progressItem.activityName}. ${input.note}`,
    statusAfter: nextWorkflowStatus,
  });
}

export async function placeRequestOnHoldForRequester(input: {
  actorUser: SessionUser;
  note: string;
  requestId: string;
  activityCode: string;
}) {
  const request = await prisma.documentRequest.findUnique({
    where: { id: input.requestId },
    select: {
      id: true,
      assignedEditorUserId: true,
      requestType: true,
      status: true,
    },
  });

  if (!request) {
    throw new Error("La solicitud ya no existe.");
  }

  if (request.status === "CLOSED" || request.status === "CANCELLED") {
    throw new Error("No se puede dejar en espera una solicitud cerrada o cancelada.");
  }

  const canManage =
    input.actorUser.role === "ADMINISTRATOR" ||
    request.assignedEditorUserId === input.actorUser.id;

  if (!canManage) {
    throw new Error("No tienes permiso para pausar esta solicitud.");
  }

  await ensureRequestProgressItems(input.requestId, normalizeRequestType(request.requestType));

  const progressItem = await prismaTracking.documentRequestProgressItem.findUnique({
    where: {
      documentRequestId_activityCode: {
        documentRequestId: input.requestId,
        activityCode: input.activityCode,
      },
    },
  });

  if (!progressItem) {
    throw new Error("La actividad de seguimiento ya no existe.");
  }

  const now = new Date();

  await prismaTracking.documentRequestProgressItem.update({
    where: { id: progressItem.id },
    data: {
      status: "WAITING",
      note: input.note,
      completedAt: null,
      lastChangedByUserId: input.actorUser.id,
    },
  });

  await prismaTracking.documentRequest.update({
    where: { id: input.requestId },
    data: {
      currentResponsibilityRole: "REQUESTER",
      waitingReason: "WAITING_REQUESTER_INFO",
      waitingSince: now,
      status: "OBSERVED",
    },
  });

  await appendRequestActivity({
    documentRequestId: input.requestId,
    actorUserId: input.actorUser.id,
    activityType: "WAITING_FOR_REQUESTER",
    note: `${progressItem.activityCode} - ${progressItem.activityName}. ${input.note}`,
    statusAfter: "OBSERVED",
  });
}

export async function registerRequesterResponse(input: {
  actorUser: SessionUser;
  note: string;
  requestId: string;
  activityCode: string;
}) {
  const request = await prisma.documentRequest.findUnique({
    where: { id: input.requestId },
    select: {
      id: true,
      assignedEditorUserId: true,
      requestType: true,
      status: true,
    },
  });

  if (!request) {
    throw new Error("La solicitud ya no existe.");
  }

  if (request.status === "CLOSED" || request.status === "CANCELLED") {
    throw new Error("No se puede reactivar una solicitud cerrada o cancelada.");
  }

  const canManage =
    input.actorUser.role === "ADMINISTRATOR" ||
    request.assignedEditorUserId === input.actorUser.id;

  if (!canManage) {
    throw new Error("No tienes permiso para registrar la respuesta del solicitante.");
  }

  await ensureRequestProgressItems(input.requestId, normalizeRequestType(request.requestType));

  const progressItem = await prismaTracking.documentRequestProgressItem.findUnique({
    where: {
      documentRequestId_activityCode: {
        documentRequestId: input.requestId,
        activityCode: input.activityCode,
      },
    },
  });

  if (!progressItem) {
    throw new Error("La actividad de seguimiento ya no existe.");
  }

  await prismaTracking.documentRequestProgressItem.update({
    where: { id: progressItem.id },
    data: {
      status: "IN_PROGRESS",
      note: input.note,
      completedAt: null,
      lastChangedByUserId: input.actorUser.id,
    },
  });

  await prismaTracking.documentRequest.update({
    where: { id: input.requestId },
    data: {
      currentResponsibilityRole: request.assignedEditorUserId ? "EDITOR" : "ADMINISTRATOR",
      waitingReason: "NONE",
      waitingSince: null,
      lastRequesterResponseAt: new Date(),
      status: "IN_PROGRESS",
    },
  });

  await appendRequestActivity({
    documentRequestId: input.requestId,
    actorUserId: input.actorUser.id,
    activityType: "REQUESTER_RESPONSE_RECORDED",
    note: `${progressItem.activityCode} - ${progressItem.activityName}. ${input.note}`,
    statusAfter: "IN_PROGRESS",
  });
}

export async function cancelRequest(input: {
  actorUser: SessionUser;
  reason: string;
  requestId: string;
}) {
  const request = await prisma.documentRequest.findUnique({
    where: { id: input.requestId },
    select: { id: true, status: true },
  });

  if (!request) {
    throw new Error("La solicitud ya no existe.");
  }

  if (request.status === "CLOSED" || request.status === "CANCELLED" || request.status === "OFFICIALIZED") {
    throw new Error("La solicitud ya no puede cancelarse en su estado actual.");
  }

  await prismaTracking.documentRequest.update({
    where: { id: input.requestId },
    data: {
      currentResponsibilityRole: "ADMINISTRATOR",
      waitingReason: "NONE",
      waitingSince: null,
      status: "CANCELLED",
      closedAt: new Date(),
    },
  });

  await appendRequestActivity({
    documentRequestId: input.requestId,
    actorUserId: input.actorUser.id,
    activityType: "CANCELLED",
    note: input.reason,
    statusAfter: "CANCELLED",
  });
}

export async function closeRequest(input: {
  actorUser: SessionUser;
  note: string;
  requestId: string;
}) {
  const request = await prisma.documentRequest.findUnique({
    where: { id: input.requestId },
    select: {
      id: true,
      assignedEditorUserId: true,
      requestType: true,
      status: true,
    },
  });

  if (!request) {
    throw new Error("La solicitud ya no existe.");
  }

  if (request.status === "CLOSED" || request.status === "CANCELLED") {
    throw new Error("La solicitud ya fue cerrada previamente.");
  }

  const canManage =
    input.actorUser.role === "ADMINISTRATOR" ||
    request.assignedEditorUserId === input.actorUser.id;

  if (!canManage) {
    throw new Error("No tienes permiso para cerrar esta solicitud.");
  }

  await ensureRequestProgressItems(input.requestId, normalizeRequestType(request.requestType));

  const progressItems = (await prismaTracking.documentRequestProgressItem.findMany({
    where: { documentRequestId: input.requestId },
    orderBy: [{ sortOrder: "asc" }],
    select: {
      activityCode: true,
      activityName: true,
      phaseCode: true,
      phaseName: true,
      sortOrder: true,
      status: true,
      weight: true,
    },
  })) as Array<{
    activityCode: string;
    activityName: string;
    phaseCode: string;
    phaseName: string;
    sortOrder: number;
    status: string;
    weight: number;
  }>;

  const progressSnapshot = getRequestProgressSnapshot(
    progressItems.map((item) => ({
      ...item,
      status: normalizeProgressItemStatus(item.status),
    })),
  );

  if (progressSnapshot.progressPercent < 100) {
    throw new Error("Completa el seguimiento objetivo al 100% antes de cerrar la solicitud.");
  }

  await prismaTracking.documentRequest.update({
    where: { id: input.requestId },
    data: {
      currentResponsibilityRole: request.assignedEditorUserId ? "EDITOR" : "ADMINISTRATOR",
      waitingReason: "NONE",
      waitingSince: null,
      status: "CLOSED",
      closedAt: new Date(),
    },
  });

  await appendRequestActivity({
    documentRequestId: input.requestId,
    actorUserId: input.actorUser.id,
    activityType: "CLOSED",
    note: input.note,
    statusAfter: "CLOSED",
  });
}

async function createRequestWithGeneratedCode(input: {
  id: string;
  requesterUserId: string;
  createdByUserId: string;
  requesterArea: string;
  requestType: RequestType;
  suggestedProcessId: string;
  suggestedDocumentTypeId: string;
  relatedDocumentId?: string;
  title: string;
  description: string;
  justification?: string;
  priority: RequestPriority;
  requiredDate: Date | null;
  status: WorkflowStatus;
  attachments: Array<{
    originalFileName: string;
    storagePath: string;
    mimeType: string;
    sizeBytes: number;
    uploadedByUserId?: string;
  }>;
}): Promise<{ id: string }> {
  let attempt = 0;

  while (attempt < 3) {
    const requestCode = await generateNextRequestCode();

    try {
      return (await prismaTracking.documentRequest.create({
        data: {
          id: input.id,
          requestCode,
          requesterUserId: input.requesterUserId,
          createdByUserId: input.createdByUserId,
          requesterArea: input.requesterArea,
          requestType: input.requestType,
          suggestedProcessId: input.suggestedProcessId,
          suggestedDocumentTypeId: input.suggestedDocumentTypeId,
          relatedDocumentId: input.relatedDocumentId || null,
          title: input.title,
          description: input.description,
          justification: input.justification || null,
          priority: input.priority,
          requiredDate: input.requiredDate,
          status: input.status,
          currentResponsibilityRole: "ADMINISTRATOR",
          waitingReason: "NONE",
          attachments: {
            create: input.attachments.map((attachment) => ({
              originalFileName: attachment.originalFileName,
              storagePath: attachment.storagePath,
              mimeType: attachment.mimeType,
              sizeBytes: attachment.sizeBytes,
              uploadedByUserId: attachment.uploadedByUserId || null,
            })),
          },
          progressItems: {
            create: getRequestProgressTemplate(input.requestType).map((item) => ({
              phaseCode: item.phaseCode,
              phaseName: item.phaseName,
              activityCode: item.activityCode,
              activityName: item.activityName,
              description: item.description,
              weight: item.weight,
              sortOrder: item.sortOrder,
              appliesToRequestType: item.appliesToRequestType,
              status: "PENDING",
            })),
          },
        },
      })) as { id: string };
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }

      attempt += 1;
    }
  }

  throw new Error("No fue posible generar un codigo unico para la solicitud.");
}

async function generateNextRequestCode() {
  const currentYear = new Date().getFullYear();
  const prefix = `SOL-${currentYear}-`;
  const lastRequest = await prisma.documentRequest.findFirst({
    where: {
      requestCode: {
        startsWith: prefix,
      },
    },
    orderBy: {
      requestCode: "desc",
    },
    select: {
      requestCode: true,
    },
  });

  const nextSequence =
    lastRequest?.requestCode && lastRequest.requestCode.startsWith(prefix)
      ? Number.parseInt(lastRequest.requestCode.slice(prefix.length), 10) + 1
      : 1;

  return `${prefix}${String(nextSequence).padStart(4, "0")}`;
}

async function listProcessOptions() {
  const processes = await prisma.process.findMany({
    where: { isActive: true },
    orderBy: [{ code: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
    },
  });

  return processes.map<RequestOptionRecord>((process) => ({
    id: process.id,
    code: process.code,
    label: `${process.code} - ${process.name}`,
  }));
}

async function listDocumentTypeOptions() {
  const documentTypes = await prisma.documentType.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
    },
  });

  return documentTypes.map<RequestOptionRecord>((documentType) => ({
    id: documentType.id,
    code: documentType.code,
    label: `${documentType.code} - ${documentType.name}`,
  }));
}

async function listRelatedDocumentOptions() {
  const documents = await prisma.document.findMany({
    where: {
      status: {
        in: ["OFFICIAL", "APPROVED_DRAFT"],
      },
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 100,
    select: {
      id: true,
      identityCode: true,
      temporaryCode: true,
      title: true,
    },
  });

  return documents.map<RequestOptionRecord>((document) => ({
    id: document.id,
    code: document.identityCode || document.temporaryCode || "SIN-CODIGO",
    label: `${document.identityCode || document.temporaryCode || "SIN-CODIGO"} - ${document.title}`,
  }));
}

async function listRequestRequesterOptions() {
  const requesterIds = await prisma.documentRequest.findMany({
    where: {
      requesterUserId: {
        not: null,
      },
    },
    distinct: ["requesterUserId"],
    select: {
      requesterUserId: true,
    },
  });

  const ids = requesterIds
    .map((request) => request.requesterUserId)
    .filter((value): value is string => Boolean(value));

  if (ids.length === 0) {
    return [] satisfies RequesterOptionRecord[];
  }

  if (runtimeConfig.authMode === "database") {
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        username: true,
      },
    });

    return users.map<RequesterOptionRecord>((user) => ({
      id: user.id,
      name: user.name,
      username: user.username,
    }));
  }

  return ids
    .map((id) => findMockAccountById(id))
    .filter((account): account is NonNullable<typeof account> => Boolean(account))
    .map<RequesterOptionRecord>((account) => ({
      id: account.id,
      name: account.name,
      username: account.username,
    }));
}

async function listAssignableEditors() {
  if (runtimeConfig.authMode === "local") {
    return listMockAccountsByRole("EDITOR").map<EditorOptionRecord>((account) => ({
      id: account.id,
      name: account.name,
      username: account.username,
    }));
  }

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      roles: {
        some: {
          role: {
            code: "EDITOR",
          },
        },
      },
    },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      username: true,
    },
  });

  return users.map<EditorOptionRecord>((user) => ({
    id: user.id,
    name: user.name,
    username: user.username,
  }));
}

export async function listRequestCapableReaders() {
  if (runtimeConfig.authMode === "local") {
    return listMockAccountsByRoleAndPermission("READER", REQUESTS_CREATE_PERMISSION).map<
      RequesterOptionRecord
    >((account) => ({
      id: account.id,
      name: account.name,
      username: account.username,
    }));
  }

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      roles: {
        some: {
          role: {
            code: "READER",
          },
        },
      },
      permissions: {
        some: {
          permission: {
            code: REQUESTS_CREATE_PERMISSION,
          },
        },
      },
    },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      username: true,
    },
  });

  return users.map<RequesterOptionRecord>((user) => ({
    id: user.id,
    name: user.name,
    username: user.username,
  }));
}

export async function isRequestCapableReader(userId: string) {
  const readers = await listRequestCapableReaders();
  return readers.some((reader) => reader.id === userId);
}

async function resolvePeopleFromRequests(requests: RequestWithRelations[]) {
  const peopleIds = [
    ...new Set(
      requests.flatMap((request) =>
        [
          request.requesterUserId,
          request.createdByUserId,
          request.assignedEditorUserId,
          request.assignedByUserId,
          ...request.activities.map((activity) => activity.actorUserId),
          ...request.progressItems.map((item) => item.lastChangedByUserId),
        ].filter((value): value is string => Boolean(value)),
      ),
    ),
  ];

  const people = new Map<
    string,
    {
      id: string;
      name: string;
      username?: string;
    }
  >();

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

  for (const id of peopleIds) {
    if (people.has(id)) {
      continue;
    }

    const mockAccount = findMockAccountById(id);

    if (mockAccount) {
      people.set(id, {
        id: mockAccount.id,
        name: mockAccount.name,
        username: mockAccount.username,
      });
    }
  }

  return people;
}

function sortRequests(requests: RequestWithRelations[]) {
  return [...requests].sort((left, right) => {
    const statusWeightDifference =
      requestStatusOrder[normalizeWorkflowStatus(left.status)] -
      requestStatusOrder[normalizeWorkflowStatus(right.status)];

    if (statusWeightDifference !== 0) {
      return statusWeightDifference;
    }

    const leftPriority = normalizePriority(left.priority);
    const rightPriority = normalizePriority(right.priority);
    const priorityDifference = requestPriorityOrder[leftPriority] - requestPriorityOrder[rightPriority];

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return right.updatedAt.getTime() - left.updatedAt.getTime();
  });
}

function mapRequestToListRecord(
  request: RequestWithRelations,
  people: Map<string, { id: string; name: string; username?: string }>,
) {
  const progressItems = request.progressItems.map((item) => ({
    activityCode: item.activityCode,
    activityName: item.activityName,
    phaseCode: item.phaseCode,
    phaseName: item.phaseName,
    sortOrder: item.sortOrder,
    status: normalizeProgressItemStatus(item.status),
    weight: item.weight,
  }));
  const progressSnapshot = getRequestProgressSnapshot(progressItems);

  return {
    id: request.id,
    code: request.requestCode,
    title: request.title,
    process: request.suggestedProcess?.code || "Sin proceso sugerido",
    type: request.suggestedDocumentType?.code || "Sin tipo sugerido",
    priority: normalizePriority(request.priority),
    requester: resolvePersonName(people, request.requesterUserId, "Solicitante"),
    dueDate: request.requiredDate ? formatDate(request.requiredDate) : "Sin fecha requerida",
    progressPercent: progressSnapshot.progressPercent,
    currentResponsibilityRole: normalizeResponsibilityRole(request.currentResponsibilityRole),
    waitingReason: normalizeWaitingReason(request.waitingReason),
    status: normalizeWorkflowStatus(request.status),
  } satisfies RequestRecord;
}

function mapRequestToDetailRecord(
  request: RequestWithRelations,
  people: Map<string, { id: string; name: string; username?: string }>,
) {
  const progressItems = request.progressItems.map((item) => mapRequestProgressItemRecord(item, people));
  const progressSnapshot = getRequestProgressSnapshot(
    request.progressItems.map((item) => ({
      activityCode: item.activityCode,
      activityName: item.activityName,
      phaseCode: item.phaseCode,
      phaseName: item.phaseName,
      sortOrder: item.sortOrder,
      status: normalizeProgressItemStatus(item.status),
      weight: item.weight,
    })),
  );

  return {
    id: request.id,
    code: request.requestCode,
    requestType: normalizeRequestType(request.requestType),
    title: request.title,
    description: request.description,
    justification: request.justification || undefined,
    requesterArea: request.requesterArea || undefined,
    priority: request.priority ? normalizePriority(request.priority) : undefined,
    requiredDate: request.requiredDate ? formatDate(request.requiredDate) : undefined,
    status: normalizeWorkflowStatus(request.status),
    createdAt: formatDateTime(request.createdAt),
    updatedAt: formatDateTime(request.updatedAt),
    requester: request.requesterUserId
      ? resolvePersonRecord(people, request.requesterUserId)
      : undefined,
    createdBy: request.createdByUserId
      ? resolvePersonRecord(people, request.createdByUserId)
      : undefined,
    assignedEditor: request.assignedEditorUserId
      ? resolvePersonRecord(people, request.assignedEditorUserId)
      : undefined,
    assignedAt: request.assignedAt ? formatDateTime(request.assignedAt) : undefined,
    assignedBy: request.assignedByUserId
      ? resolvePersonRecord(people, request.assignedByUserId)
      : undefined,
    progressPercent: progressSnapshot.progressPercent,
    currentPhaseCode: progressSnapshot.currentPhaseCode,
    currentPhaseName: progressSnapshot.currentPhaseName,
    currentActivityCode: progressSnapshot.currentActivityCode,
    currentActivityName: progressSnapshot.currentActivityName,
    currentResponsibilityRole: normalizeResponsibilityRole(request.currentResponsibilityRole),
    waitingReason: normalizeWaitingReason(request.waitingReason),
    waitingSince: request.waitingSince ? formatDateTime(request.waitingSince) : undefined,
    lastRequesterResponseAt: request.lastRequesterResponseAt
      ? formatDateTime(request.lastRequesterResponseAt)
      : undefined,
    process: request.suggestedProcess
      ? {
          id: request.suggestedProcess.id,
          code: request.suggestedProcess.code,
          label: `${request.suggestedProcess.code} - ${request.suggestedProcess.name}`,
        }
      : undefined,
    documentType: request.suggestedDocumentType
      ? {
          id: request.suggestedDocumentType.id,
          code: request.suggestedDocumentType.code,
          label: `${request.suggestedDocumentType.code} - ${request.suggestedDocumentType.name}`,
        }
      : undefined,
    attachments: request.attachments.map((attachment) => ({
      id: attachment.id,
      originalFileName: attachment.originalFileName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      uploadedAt: formatDateTime(attachment.uploadedAt),
      downloadHref: `/api/request-attachments/${attachment.id}`,
    })),
    activities: request.activities.map((activity) => mapRequestActivityRecord(activity, people)),
    progressItems,
  } satisfies RequestDetailRecord;
}

function mapRequestActivityRecord(
  activity: RequestWithRelations["activities"][number],
  people: Map<string, { id: string; name: string; username?: string }>,
): RequestActivityRecord {
  return {
    id: activity.id,
    actor: activity.actorUserId ? resolvePersonRecord(people, activity.actorUserId) : undefined,
    createdAt: formatDateTime(activity.createdAt),
    note: activity.note || undefined,
    statusAfter: activity.statusAfter ? normalizeWorkflowStatus(activity.statusAfter) : undefined,
    type: normalizeRequestActivityType(activity.activityType),
  };
}

function mapRequestProgressItemRecord(
  item: RequestWithRelations["progressItems"][number],
  people: Map<string, { id: string; name: string; username?: string }>,
): RequestProgressItemRecord {
  return {
    id: item.id,
    phaseCode: item.phaseCode,
    phaseName: item.phaseName,
    activityCode: item.activityCode,
    activityName: item.activityName,
    description: item.description || undefined,
    weight: item.weight,
    status: normalizeProgressItemStatus(item.status),
    note: item.note || undefined,
    completedAt: item.completedAt ? formatDateTime(item.completedAt) : undefined,
    lastChangedAt: formatDateTime(item.lastChangedAt),
    lastChangedBy: item.lastChangedByUserId
      ? resolvePersonRecord(people, item.lastChangedByUserId)
      : undefined,
  };
}

function resolvePersonRecord(
  people: Map<string, { id: string; name: string; username?: string }>,
  personId: string,
) {
  const person = people.get(personId);

  if (!person) {
    return {
      id: personId,
      name: "Usuario no resuelto",
    };
  }

  return person;
}

function resolvePersonName(
  people: Map<string, { id: string; name: string; username?: string }>,
  personId: string | null,
  fallback: string,
) {
  if (!personId) {
    return fallback;
  }

  return people.get(personId)?.name || fallback;
}

function normalizePriority(priority: string | null): RequestPriority {
  if (priority === "Alta" || priority === "Media" || priority === "Baja") {
    return priority;
  }

  return "Media";
}

function normalizeWorkflowStatus(status: string): WorkflowStatus {
  switch (status) {
    case "PENDING_ASSIGNMENT":
    case "ASSIGNED":
    case "IN_PROGRESS":
    case "IN_REVIEW":
    case "OBSERVED":
    case "APPROVED":
    case "OFFICIALIZED":
    case "CLOSED":
    case "CANCELLED":
      return status;
    default:
      return "PENDING_ASSIGNMENT";
  }
}

function normalizeRequestType(requestType: string): RequestType {
  return requestType === "UPDATE_EXISTING" ? "UPDATE_EXISTING" : "NEW_DOCUMENT";
}

function normalizeRequestActivityType(activityType: string): RequestActivityType {
  switch (activityType) {
    case "ASSIGNED":
    case "REASSIGNED":
    case "STARTED":
    case "PROGRESS_UPDATED":
    case "STEP_COMPLETED":
    case "STEP_REOPENED":
    case "STEP_MARKED_NOT_APPLICABLE":
    case "STEP_RESTORED":
    case "WAITING_FOR_REQUESTER":
    case "REQUESTER_RESPONSE_RECORDED":
    case "CANCELLED":
    case "CLOSED":
      return activityType;
    default:
      return "CREATED";
  }
}

function normalizeProgressItemStatus(status: string): RequestProgressItemStatus {
  switch (status) {
    case "IN_PROGRESS":
    case "COMPLETED":
    case "RETURNED":
    case "WAITING":
    case "NOT_APPLICABLE":
      return status;
    default:
      return "PENDING";
  }
}

function normalizeResponsibilityRole(role: string | null): ResponsibilityRole {
  switch (role) {
    case "EDITOR":
    case "REQUESTER":
      return role;
    default:
      return "ADMINISTRATOR";
  }
}

function normalizeWaitingReason(reason: string | null): WaitingReason {
  switch (reason) {
    case "WAITING_REQUESTER_INFO":
    case "WAITING_INTERNAL_RESPONSE":
    case "WAITING_REVIEW":
    case "WAITING_APPROVAL":
      return reason;
    default:
      return "NONE";
  }
}

function mapProgressTransitionToStatus(
  transition: "COMPLETE" | "REOPEN" | "MARK_NOT_APPLICABLE" | "RESTORE_APPLICABLE",
): RequestProgressItemStatus {
  switch (transition) {
    case "COMPLETE":
      return "COMPLETED";
    case "REOPEN":
      return "RETURNED";
    case "MARK_NOT_APPLICABLE":
      return "NOT_APPLICABLE";
    case "RESTORE_APPLICABLE":
      return "PENDING";
  }
}

function mapProgressTransitionToActivityType(
  transition: "COMPLETE" | "REOPEN" | "MARK_NOT_APPLICABLE" | "RESTORE_APPLICABLE",
): RequestActivityType {
  switch (transition) {
    case "COMPLETE":
      return "STEP_COMPLETED";
    case "REOPEN":
      return "STEP_REOPENED";
    case "MARK_NOT_APPLICABLE":
      return "STEP_MARKED_NOT_APPLICABLE";
    case "RESTORE_APPLICABLE":
      return "STEP_RESTORED";
  }
}

async function ensureRequestProgressItems(requestId: string, requestType: RequestType) {
  const existingItems = (await prismaTracking.documentRequestProgressItem.findMany({
    where: { documentRequestId: requestId },
    select: { activityCode: true },
  })) as Array<{ activityCode: string }>;
  const existingCodes = new Set(existingItems.map((item) => item.activityCode));
  const missingItems = getRequestProgressTemplate(requestType).filter(
    (item) => !existingCodes.has(item.activityCode),
  );

  if (missingItems.length === 0) {
    return;
  }

  await Promise.all(
    missingItems.map((item) =>
      prismaTracking.documentRequestProgressItem.create({
        data: {
          documentRequestId: requestId,
          phaseCode: item.phaseCode,
          phaseName: item.phaseName,
          activityCode: item.activityCode,
          activityName: item.activityName,
          description: item.description,
          weight: item.weight,
          sortOrder: item.sortOrder,
          appliesToRequestType: item.appliesToRequestType,
          status: "PENDING",
        },
      }),
    ),
  );
}

function normalizeBoardFilters(filters: RequestBoardFilters): RequestBoardFilters {
  return {
    createdFrom: filters.createdFrom || undefined,
    createdTo: filters.createdTo || undefined,
    documentTypeId: filters.documentTypeId || undefined,
    priority: filters.priority ? normalizePriority(filters.priority) : undefined,
    processId: filters.processId || undefined,
    requesterUserId: filters.requesterUserId || undefined,
    status: filters.status ? normalizeWorkflowStatus(filters.status) : undefined,
  };
}

function buildRequestWhere(filters: RequestBoardFilters): Prisma.DocumentRequestWhereInput {
  const normalized = normalizeBoardFilters(filters);
  const where: Prisma.DocumentRequestWhereInput = {};

  if (normalized.status) {
    where.status = normalized.status;
  }

  if (normalized.priority) {
    where.priority = normalized.priority;
  }

  if (normalized.requesterUserId) {
    where.requesterUserId = normalized.requesterUserId;
  }

  if (normalized.processId) {
    where.suggestedProcessId = normalized.processId;
  }

  if (normalized.documentTypeId) {
    where.suggestedDocumentTypeId = normalized.documentTypeId;
  }

  if (normalized.createdFrom || normalized.createdTo) {
    where.createdAt = {
      ...(normalized.createdFrom ? { gte: new Date(`${normalized.createdFrom}T00:00:00`) } : {}),
      ...(normalized.createdTo ? { lte: new Date(`${normalized.createdTo}T23:59:59.999`) } : {}),
    };
  }

  return where;
}

function buildRequestWhereForUser(
  user: SessionUser,
  filters: RequestBoardFilters,
): Prisma.DocumentRequestWhereInput {
  const where = buildRequestWhere(filters);

  if (user.role === "READER") {
    where.requesterUserId = user.id;
  }

  return where;
}

async function appendRequestActivity(input: {
  actorUserId?: string;
  activityType: RequestActivityType;
  documentRequestId: string;
  note?: string;
  statusAfter?: WorkflowStatus;
}) {
  await prisma.documentRequestActivity.create({
    data: {
      documentRequestId: input.documentRequestId,
      actorUserId: input.actorUserId || null,
      activityType: input.activityType,
      note: input.note || null,
      statusAfter: input.statusAfter || null,
    },
  });
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Mexico_City",
  }).format(date);
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

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}
