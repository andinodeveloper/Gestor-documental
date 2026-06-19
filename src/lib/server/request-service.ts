import { randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";

import { canCreateDocumentRequests, REQUESTS_CREATE_PERMISSION } from "@/lib/auth/permissions";
import {
  findMockAccountById,
  listMockAccountsByRole,
  listMockAccountsByRoleAndPermission,
} from "@/lib/auth/mock-accounts";
import type { SessionUser } from "@/lib/auth/types";
import { runtimeConfig } from "@/lib/config/runtime";
import {
  deriveWorkflowStatusFromTracking,
  getRequestTrackingStage,
  getRequestTrackingStages,
  hasRequestStarted,
} from "@/lib/request-tracking";
import type {
  EditorOptionRecord,
  MetricCard,
  RequestActivityRecord,
  RequestActivityType,
  RequestBoardFilters,
  RequestDetailRecord,
  RequestOptionRecord,
  RequestPriority,
  RequestRecord,
  RequestType,
  RequesterOptionRecord,
  ResponsibilityRole,
  WaitingReason,
  WorkflowStatus,
} from "@/lib/types";
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
  trackingStageCode: string | null;
  responsibilityRole: string | null;
  waitingReason: string | null;
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
  attachments: RequestAttachmentRow[];
  activities: RequestActivityRow[];
};

type PrismaRequestTrackingClient = {
  documentRequest: {
    create: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<RequestWithRelations[]>;
    findUnique: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
  };
  documentRequestActivity: {
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
};

async function findRequestsWithRelations(input: {
  where?: Prisma.DocumentRequestWhereInput;
  orderBy?: Prisma.DocumentRequestOrderByWithRelationInput[];
  take?: number;
}) {
  return prismaTracking.documentRequest.findMany({
    where: input.where,
    include: requestInclude,
    orderBy: input.orderBy,
    take: input.take,
  });
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
  const [requests, editors, intakeSnapshot, requesterFilterOptions] = await Promise.all([
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
      where: {
        status: {
          in: ["ASSIGNED", "IN_PROGRESS", "IN_REVIEW", "OBSERVED", "APPROVED", "OFFICIALIZED"],
        },
      },
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
      trackingStageCode: "0.1",
      responsibilityRole: "ADMINISTRATOR",
      waitingReason: "NONE",
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
  const request = (await prismaTracking.documentRequest.findUnique({
    where: { id: input.requestId },
    select: {
      id: true,
      status: true,
      requestType: true,
      assignedEditorUserId: true,
      currentTrackingStageCode: true,
      cancellationRequestedAt: true,
    },
  })) as
    | {
        id: string;
        status: string;
        requestType: string;
        assignedEditorUserId: string | null;
        currentTrackingStageCode: string | null;
        cancellationRequestedAt: Date | null;
      }
    | null;

  if (!request) {
    throw new Error("La solicitud ya no existe.");
  }

  if (request.status === "CLOSED" || request.status === "CANCELLED") {
    throw new Error("No se puede asignar una solicitud cerrada o cancelada.");
  }

  if (request.cancellationRequestedAt) {
    throw new Error("No se puede reasignar una solicitud con cancelacion pendiente.");
  }

  const requestType = normalizeRequestType(request.requestType);
  const nextStatus = deriveWorkflowStatusFromTracking({
    assignedEditorUserId: input.editorId,
    requestType,
    stageCode: request.currentTrackingStageCode,
    waitingReason: "NONE",
  });

  await prismaTracking.documentRequest.update({
    where: { id: input.requestId },
    data: {
      assignedEditorUserId: input.editorId,
      assignedByUserId: input.assignedByUserId,
      assignedAt: new Date(),
      currentResponsibilityRole: "EDITOR",
      waitingReason: "NONE",
      waitingSince: null,
      status: nextStatus,
    },
  });

  await appendRequestActivity({
    documentRequestId: input.requestId,
    actorUserId: input.assignedByUserId,
    activityType: request.assignedEditorUserId ? "REASSIGNED" : "ASSIGNED",
    trackingStageCode: request.currentTrackingStageCode || "0.1",
    responsibilityRole: "EDITOR",
    waitingReason: "NONE",
    statusAfter: nextStatus,
  });
}

export async function startRequestWork(input: { requestId: string; actorUser: SessionUser }) {
  const request = (await prismaTracking.documentRequest.findUnique({
    where: { id: input.requestId },
    select: {
      id: true,
      assignedEditorUserId: true,
      requestType: true,
      status: true,
      currentTrackingStageCode: true,
      cancellationRequestedAt: true,
    },
  })) as
    | {
        id: string;
        assignedEditorUserId: string | null;
        requestType: string;
        status: string;
        currentTrackingStageCode: string | null;
        cancellationRequestedAt: Date | null;
      }
    | null;

  if (!request) {
    throw new Error("La solicitud ya no existe.");
  }

  if (request.status === "CLOSED" || request.status === "CANCELLED") {
    throw new Error("La solicitud no esta en un estado editable para iniciar trabajo.");
  }

  if (request.cancellationRequestedAt) {
    throw new Error("No se puede iniciar trabajo mientras la cancelacion este pendiente.");
  }

  if (!request.assignedEditorUserId || request.assignedEditorUserId !== input.actorUser.id) {
    throw new Error("No tienes permiso para iniciar esta solicitud.");
  }

  const requestType = normalizeRequestType(request.requestType);

  if (hasRequestStarted(request.currentTrackingStageCode, requestType)) {
    throw new Error("La solicitud ya tiene inicio formal registrado.");
  }

  const targetStageCode = "0.4";
  const nextStatus = deriveWorkflowStatusFromTracking({
    assignedEditorUserId: request.assignedEditorUserId,
    requestType,
    stageCode: targetStageCode,
    waitingReason: "NONE",
  });

  await prismaTracking.documentRequest.update({
    where: { id: input.requestId },
    data: {
      currentTrackingStageCode: targetStageCode,
      currentResponsibilityRole: "EDITOR",
      waitingReason: "NONE",
      waitingSince: null,
      status: nextStatus,
    },
  });

  await appendRequestActivity({
    documentRequestId: input.requestId,
    actorUserId: input.actorUser.id,
    activityType: "STARTED",
    trackingStageCode: targetStageCode,
    responsibilityRole: "EDITOR",
    waitingReason: "NONE",
    note: "Trabajo editorial iniciado.",
    statusAfter: nextStatus,
  });
}

export async function updateRequestProgress(input: {
  note: string;
  requestId: string;
  actorUser: SessionUser;
}) {
  const request = (await prismaTracking.documentRequest.findUnique({
    where: { id: input.requestId },
    select: {
      id: true,
      assignedEditorUserId: true,
      status: true,
      requestType: true,
      currentTrackingStageCode: true,
      currentResponsibilityRole: true,
      waitingReason: true,
      cancellationRequestedAt: true,
    },
  })) as
    | {
        id: string;
        assignedEditorUserId: string | null;
        status: string;
        requestType: string;
        currentTrackingStageCode: string | null;
        currentResponsibilityRole: string | null;
        waitingReason: string | null;
        cancellationRequestedAt: Date | null;
      }
    | null;

  if (!request) {
    throw new Error("La solicitud ya no existe.");
  }

  if (request.status === "CLOSED" || request.status === "CANCELLED") {
    throw new Error("No se puede registrar avance en una solicitud cerrada o cancelada.");
  }

  if (request.cancellationRequestedAt) {
    throw new Error("No se puede registrar avance mientras la cancelacion este pendiente.");
  }

  const canManage =
    input.actorUser.role === "ADMINISTRATOR" ||
    request.assignedEditorUserId === input.actorUser.id;

  if (!canManage) {
    throw new Error("No tienes permiso para registrar avance en esta solicitud.");
  }

  if (!hasRequestStarted(request.currentTrackingStageCode, normalizeRequestType(request.requestType))) {
    throw new Error("Debes iniciar formalmente el trabajo antes de registrar notas.");
  }

  await appendRequestActivity({
    documentRequestId: input.requestId,
    actorUserId: input.actorUser.id,
    activityType: "PROGRESS_UPDATED",
    trackingStageCode: request.currentTrackingStageCode || "0.1",
    responsibilityRole: normalizeResponsibilityRole(request.currentResponsibilityRole),
    waitingReason: normalizeWaitingReason(request.waitingReason),
    note: input.note,
    statusAfter: normalizeWorkflowStatus(request.status),
  });
}

export async function updateRequestTracking(input: {
  actorUser: SessionUser;
  note: string;
  requestId: string;
  responsibilityRole: ResponsibilityRole;
  stageCode: string;
  waitingReason: WaitingReason;
}) {
  const request = (await prismaTracking.documentRequest.findUnique({
    where: { id: input.requestId },
    select: {
      id: true,
      assignedEditorUserId: true,
      requestType: true,
      status: true,
      currentTrackingStageCode: true,
      waitingReason: true,
      cancellationRequestedAt: true,
    },
  })) as
    | {
        id: string;
        assignedEditorUserId: string | null;
        requestType: string;
        status: string;
        currentTrackingStageCode: string | null;
        waitingReason: string | null;
        cancellationRequestedAt: Date | null;
      }
    | null;

  if (!request) {
    throw new Error("La solicitud ya no existe.");
  }

  if (request.status === "CLOSED" || request.status === "CANCELLED") {
    throw new Error("No se puede actualizar el seguimiento de una solicitud cerrada o cancelada.");
  }

  if (request.cancellationRequestedAt) {
    throw new Error("No se puede actualizar el seguimiento mientras la cancelacion este pendiente.");
  }

  const canManage =
    input.actorUser.role === "ADMINISTRATOR" ||
    request.assignedEditorUserId === input.actorUser.id;

  if (!canManage) {
    throw new Error("No tienes permiso para actualizar el seguimiento de esta solicitud.");
  }

  const requestType = normalizeRequestType(request.requestType);

  if (!hasRequestStarted(request.currentTrackingStageCode, requestType)) {
    throw new Error("Debes iniciar formalmente el trabajo antes de actualizar el seguimiento.");
  }

  const stage = getRequestTrackingStage(input.stageCode, requestType);

  if (stage.sortOrder < 40) {
    throw new Error("No se puede regresar a etapas previas al inicio formal del trabajo.");
  }

  const now = new Date();
  const nextStatus = deriveWorkflowStatusFromTracking({
    assignedEditorUserId: request.assignedEditorUserId,
    requestType,
    stageCode: stage.code,
    waitingReason: input.waitingReason,
  });
  const shouldStampRequesterResponse =
    request.waitingReason === "WAITING_REQUESTER_INFO" && input.waitingReason === "NONE";

  await prismaTracking.documentRequest.update({
    where: { id: input.requestId },
    data: {
      currentTrackingStageCode: stage.code,
      currentResponsibilityRole: input.responsibilityRole,
      waitingReason: input.waitingReason,
      waitingSince: input.waitingReason === "NONE" ? null : now,
      lastRequesterResponseAt: shouldStampRequesterResponse ? now : undefined,
      status: nextStatus,
      closedAt: nextStatus === "CLOSED" ? now : undefined,
    },
  });

  await appendRequestActivity({
    documentRequestId: input.requestId,
    actorUserId: input.actorUser.id,
    activityType: "TRACKING_UPDATED",
    trackingStageCode: stage.code,
    responsibilityRole: input.responsibilityRole,
    waitingReason: input.waitingReason,
    note: input.note,
    statusAfter: nextStatus,
  });
}

export async function requestCancellation(input: {
  actorUser: SessionUser;
  reason: string;
  requestId: string;
}) {
  const request = (await prismaTracking.documentRequest.findUnique({
    where: { id: input.requestId },
    select: {
      id: true,
      requesterUserId: true,
      assignedEditorUserId: true,
      status: true,
      currentTrackingStageCode: true,
      currentResponsibilityRole: true,
      waitingReason: true,
      cancellationRequestedAt: true,
    },
  })) as
    | {
        id: string;
        requesterUserId: string | null;
        assignedEditorUserId: string | null;
        status: string;
        currentTrackingStageCode: string | null;
        currentResponsibilityRole: string | null;
        waitingReason: string | null;
        cancellationRequestedAt: Date | null;
      }
    | null;

  if (!request) {
    throw new Error("La solicitud ya no existe.");
  }

  if (
    request.status === "CLOSED" ||
    request.status === "CANCELLED" ||
    request.status === "OFFICIALIZED"
  ) {
    throw new Error("La solicitud ya no admite una solicitud de cancelacion.");
  }

  if (request.cancellationRequestedAt) {
    throw new Error("La solicitud ya tiene una cancelacion pendiente de decision.");
  }

  const isRequester =
    input.actorUser.role === "READER" && request.requesterUserId === input.actorUser.id;
  const isAssignedEditor =
    input.actorUser.role === "EDITOR" && request.assignedEditorUserId === input.actorUser.id;

  if (!isRequester && !isAssignedEditor) {
    throw new Error("No tienes permiso para solicitar la cancelacion de esta solicitud.");
  }

  await prismaTracking.documentRequest.update({
    where: { id: input.requestId },
    data: {
      cancellationRequestedAt: new Date(),
      cancellationRequestedByUserId: input.actorUser.id,
      cancellationRequestReason: input.reason,
    },
  });

  await appendRequestActivity({
    documentRequestId: input.requestId,
    actorUserId: input.actorUser.id,
    activityType: "CANCELLATION_REQUESTED",
    trackingStageCode: request.currentTrackingStageCode || "0.1",
    responsibilityRole: normalizeResponsibilityRole(request.currentResponsibilityRole),
    waitingReason: normalizeWaitingReason(request.waitingReason),
    note: input.reason,
    statusAfter: normalizeWorkflowStatus(request.status),
  });
}

export async function approveCancellation(input: {
  actorUser: SessionUser;
  note: string;
  requestId: string;
}) {
  if (input.actorUser.role !== "ADMINISTRATOR") {
    throw new Error("Solo un administrador puede aprobar cancelaciones.");
  }

  const request = (await prismaTracking.documentRequest.findUnique({
    where: { id: input.requestId },
    select: {
      id: true,
      status: true,
      currentTrackingStageCode: true,
      cancellationRequestedAt: true,
    },
  })) as
    | {
        id: string;
        status: string;
        currentTrackingStageCode: string | null;
        cancellationRequestedAt: Date | null;
      }
    | null;

  if (!request) {
    throw new Error("La solicitud ya no existe.");
  }

  if (!request.cancellationRequestedAt) {
    throw new Error("La solicitud no tiene una cancelacion pendiente por aprobar.");
  }

  if (request.status === "CLOSED" || request.status === "CANCELLED") {
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
      cancellationRequestedAt: null,
      cancellationRequestedByUserId: null,
      cancellationRequestReason: null,
    },
  });

  await appendRequestActivity({
    documentRequestId: input.requestId,
    actorUserId: input.actorUser.id,
    activityType: "CANCELLED",
    trackingStageCode: request.currentTrackingStageCode || "0.1",
    responsibilityRole: "ADMINISTRATOR",
    waitingReason: "NONE",
    note: input.note,
    statusAfter: "CANCELLED",
  });
}

export async function rejectCancellation(input: {
  actorUser: SessionUser;
  note: string;
  requestId: string;
}) {
  if (input.actorUser.role !== "ADMINISTRATOR") {
    throw new Error("Solo un administrador puede rechazar cancelaciones.");
  }

  const request = (await prismaTracking.documentRequest.findUnique({
    where: { id: input.requestId },
    select: {
      id: true,
      status: true,
      currentTrackingStageCode: true,
      currentResponsibilityRole: true,
      waitingReason: true,
      cancellationRequestedAt: true,
    },
  })) as
    | {
        id: string;
        status: string;
        currentTrackingStageCode: string | null;
        currentResponsibilityRole: string | null;
        waitingReason: string | null;
        cancellationRequestedAt: Date | null;
      }
    | null;

  if (!request) {
    throw new Error("La solicitud ya no existe.");
  }

  if (!request.cancellationRequestedAt) {
    throw new Error("La solicitud no tiene una cancelacion pendiente por rechazar.");
  }

  await prismaTracking.documentRequest.update({
    where: { id: input.requestId },
    data: {
      cancellationRequestedAt: null,
      cancellationRequestedByUserId: null,
      cancellationRequestReason: null,
    },
  });

  await appendRequestActivity({
    documentRequestId: input.requestId,
    actorUserId: input.actorUser.id,
    activityType: "CANCELLATION_REJECTED",
    trackingStageCode: request.currentTrackingStageCode || "0.1",
    responsibilityRole: normalizeResponsibilityRole(request.currentResponsibilityRole),
    waitingReason: normalizeWaitingReason(request.waitingReason),
    note: input.note,
    statusAfter: normalizeWorkflowStatus(request.status),
  });
}

export async function closeRequest(input: {
  actorUser: SessionUser;
  note: string;
  requestId: string;
}) {
  const request = (await prismaTracking.documentRequest.findUnique({
    where: { id: input.requestId },
    select: {
      id: true,
      assignedEditorUserId: true,
      requestType: true,
      status: true,
      currentTrackingStageCode: true,
      currentResponsibilityRole: true,
      waitingReason: true,
      cancellationRequestedAt: true,
    },
  })) as
    | {
        id: string;
        assignedEditorUserId: string | null;
        requestType: string;
        status: string;
        currentTrackingStageCode: string | null;
        currentResponsibilityRole: string | null;
        waitingReason: string | null;
        cancellationRequestedAt: Date | null;
      }
    | null;

  if (!request) {
    throw new Error("La solicitud ya no existe.");
  }

  if (request.status === "CLOSED" || request.status === "CANCELLED") {
    throw new Error("La solicitud ya fue cerrada previamente.");
  }

  if (request.cancellationRequestedAt) {
    throw new Error("No se puede cerrar una solicitud con cancelacion pendiente.");
  }

  const canManage =
    input.actorUser.role === "ADMINISTRATOR" ||
    request.assignedEditorUserId === input.actorUser.id;

  if (!canManage) {
    throw new Error("No tienes permiso para cerrar esta solicitud.");
  }

  const stage = getRequestTrackingStage(
    request.currentTrackingStageCode,
    normalizeRequestType(request.requestType),
  );

  if (stage.progressPercent < 100) {
    throw new Error("Debes ubicar la solicitud en la etapa 5.3 antes de cerrar formalmente.");
  }

  await prismaTracking.documentRequest.update({
    where: { id: input.requestId },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      waitingReason: "NONE",
      waitingSince: null,
    },
  });

  await appendRequestActivity({
    documentRequestId: input.requestId,
    actorUserId: input.actorUser.id,
    activityType: "CLOSED",
    trackingStageCode: stage.code,
    responsibilityRole: normalizeResponsibilityRole(request.currentResponsibilityRole),
    waitingReason: "NONE",
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
          currentTrackingStageCode: "0.1",
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
          request.cancellationRequestedByUserId,
          ...request.activities.map((activity) => activity.actorUserId),
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
    const priorityDifference =
      requestPriorityOrder[leftPriority] - requestPriorityOrder[rightPriority];

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
  const stage = getRequestTrackingStage(
    request.currentTrackingStageCode,
    normalizeRequestType(request.requestType),
  );

  return {
    id: request.id,
    code: request.requestCode,
    title: request.title,
    process: request.suggestedProcess?.code || "Sin proceso sugerido",
    type: request.suggestedDocumentType?.code || "Sin tipo sugerido",
    priority: normalizePriority(request.priority),
    requester: resolvePersonName(people, request.requesterUserId, "Solicitante"),
    dueDate: request.requiredDate ? formatDate(request.requiredDate) : "Sin fecha requerida",
    progressPercent: stage.progressPercent,
    currentResponsibilityRole: normalizeResponsibilityRole(request.currentResponsibilityRole),
    waitingReason: normalizeWaitingReason(request.waitingReason),
    status: normalizeWorkflowStatus(request.status),
  } satisfies RequestRecord;
}

function mapRequestToDetailRecord(
  request: RequestWithRelations,
  people: Map<string, { id: string; name: string; username?: string }>,
) {
  const requestType = normalizeRequestType(request.requestType);
  const currentStage = getRequestTrackingStage(request.currentTrackingStageCode, requestType);
  const stageCatalog = getRequestTrackingStages(requestType);
  const trackingActivities = request.activities.filter((activity) => Boolean(activity.trackingStageCode));
  const currentStageStartedAt = trackingActivities[0]?.createdAt || request.createdAt;
  const startedActivity = request.activities.find((activity) => activity.activityType === "STARTED");
  const currentStageVisits = Math.max(
    trackingActivities.filter((activity) => activity.trackingStageCode === currentStage.code).length,
    1,
  );

  return {
    id: request.id,
    code: request.requestCode,
    requestType,
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
    startedAt: startedActivity ? formatDateTime(startedActivity.createdAt) : undefined,
    progressPercent: currentStage.progressPercent,
    currentPhaseCode: currentStage.phaseCode,
    currentPhaseName: currentStage.phaseName,
    currentActivityCode: currentStage.code,
    currentActivityName: currentStage.activityName,
    currentActivityDescription: currentStage.description || undefined,
    currentResponsibilityRole: normalizeResponsibilityRole(request.currentResponsibilityRole),
    waitingReason: normalizeWaitingReason(request.waitingReason),
    waitingSince: request.waitingSince ? formatDateTime(request.waitingSince) : undefined,
    lastRequesterResponseAt: request.lastRequesterResponseAt
      ? formatDateTime(request.lastRequesterResponseAt)
      : undefined,
    hasPendingCancellation: Boolean(request.cancellationRequestedAt),
    cancellationRequestedAt: request.cancellationRequestedAt
      ? formatDateTime(request.cancellationRequestedAt)
      : undefined,
    cancellationRequestedBy: request.cancellationRequestedByUserId
      ? resolvePersonRecord(people, request.cancellationRequestedByUserId)
      : undefined,
    cancellationRequestReason: request.cancellationRequestReason || undefined,
    currentStageElapsedLabel: formatElapsedTime(currentStageStartedAt),
    currentStageVisits,
    totalElapsedLabel: formatElapsedTime(request.createdAt),
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
    activities: request.activities.map((activity) =>
      mapRequestActivityRecord(activity, people, requestType),
    ),
    stageCatalog,
  } satisfies RequestDetailRecord;
}

function mapRequestActivityRecord(
  activity: RequestActivityRow,
  people: Map<string, { id: string; name: string; username?: string }>,
  requestType: RequestType,
): RequestActivityRecord {
  return {
    id: activity.id,
    actor: activity.actorUserId ? resolvePersonRecord(people, activity.actorUserId) : undefined,
    createdAt: formatDateTime(activity.createdAt),
    note: activity.note || undefined,
    statusAfter: activity.statusAfter ? normalizeWorkflowStatus(activity.statusAfter) : undefined,
    responsibilityRole: activity.responsibilityRole
      ? normalizeResponsibilityRole(activity.responsibilityRole)
      : undefined,
    waitingReason: activity.waitingReason ? normalizeWaitingReason(activity.waitingReason) : undefined,
    trackingStage: activity.trackingStageCode
      ? getRequestTrackingStage(activity.trackingStageCode, requestType)
      : undefined,
    type: normalizeRequestActivityType(activity.activityType),
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
    case "CANCELLATION_REQUESTED":
    case "CANCELLATION_REJECTED":
    case "PROGRESS_UPDATED":
    case "TRACKING_UPDATED":
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
  responsibilityRole?: ResponsibilityRole;
  statusAfter?: WorkflowStatus;
  trackingStageCode?: string;
  waitingReason?: WaitingReason;
}) {
  await prismaTracking.documentRequestActivity.create({
    data: {
      documentRequestId: input.documentRequestId,
      actorUserId: input.actorUserId || null,
      activityType: input.activityType,
      trackingStageCode: input.trackingStageCode || null,
      responsibilityRole: input.responsibilityRole || null,
      waitingReason: input.waitingReason || null,
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

function formatElapsedTime(date: Date) {
  const diffMs = Math.max(Date.now() - date.getTime(), 0);
  const totalMinutes = Math.floor(diffMs / 60000);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days} d ${hours} h`;
  }

  if (totalHours > 0) {
    return `${totalHours} h ${minutes} min`;
  }

  return `${Math.max(totalMinutes, 1)} min`;
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
