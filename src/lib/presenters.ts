import type {
  DocumentVersionStatus,
  DocumentState,
  DraftCommentStatus,
  DraftCommentType,
  RequestProgressItemStatus,
  RequestActivityType,
  RequestPriority,
  RequestType,
  ResponsibilityRole,
  ReviewAssignmentRole,
  ReviewDecision,
  ReviewRoundStatus,
  VersionChangeKind,
  VisibilityLevel,
  WaitingReason,
  WorkflowStatus,
} from "@/lib/types";

export const visibilityLabels: Record<VisibilityLevel, string> = {
  PUBLIC_INTERNAL: "Interno general",
  RESTRICTED_BY_GROUP: "Restringido por grupo",
  RESTRICTED_BY_ROLE: "Restringido por rol",
  RESTRICTED_BY_USER: "Restringido por usuario",
  CONFIDENTIAL: "Confidencial",
  ARCHIVED_RESTRICTED: "Historico restringido",
};

export const workflowStatusLabels: Record<WorkflowStatus, string> = {
  PENDING_ASSIGNMENT: "Pendiente de asignacion",
  ASSIGNED: "Asignada",
  IN_PROGRESS: "En progreso",
  IN_REVIEW: "En revision",
  OBSERVED: "Observada",
  APPROVED: "Aprobada",
  OFFICIALIZED: "Oficializada",
  CLOSED: "Cerrada",
  CANCELLED: "Cancelada",
};

export const requestTypeLabels: Record<RequestType, string> = {
  NEW_DOCUMENT: "Documento nuevo",
  UPDATE_EXISTING: "Actualizacion de documento",
};

export const requestPriorityLabels: Record<RequestPriority, string> = {
  Alta: "Alta",
  Media: "Media",
  Baja: "Baja",
};

export const requestActivityLabels: Record<RequestActivityType, string> = {
  CREATED: "Solicitud creada",
  ASSIGNED: "Solicitud asignada",
  REASSIGNED: "Solicitud reasignada",
  STARTED: "Atencion iniciada",
  CLASSIFICATION_UPDATED: "Clasificacion actualizada",
  CANCELLATION_REQUESTED: "Cancelacion solicitada",
  CANCELLATION_REJECTED: "Cancelacion rechazada",
  PROGRESS_UPDATED: "Nota registrada",
  TRACKING_UPDATED: "Seguimiento actualizado",
  STEP_COMPLETED: "Actividad completada",
  STEP_REOPENED: "Actividad reabierta",
  STEP_MARKED_NOT_APPLICABLE: "Actividad no aplicable",
  STEP_RESTORED: "Actividad restaurada",
  WAITING_FOR_REQUESTER: "Espera de solicitante",
  REQUESTER_RESPONSE_RECORDED: "Respuesta registrada",
  CANCELLED: "Solicitud cancelada",
  CLOSED: "Solicitud cerrada",
};

export const requestProgressStatusLabels: Record<RequestProgressItemStatus, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En curso",
  COMPLETED: "Completada",
  RETURNED: "Reabierta",
  WAITING: "En espera",
  NOT_APPLICABLE: "No aplica",
};

export const responsibilityRoleLabels: Record<ResponsibilityRole, string> = {
  ADMINISTRATOR: "Administrador",
  EDITOR: "Editor",
  REQUESTER: "Solicitante",
};

export const waitingReasonLabels: Record<WaitingReason, string> = {
  NONE: "Sin espera activa",
  WAITING_REQUESTER_INFO: "Esperando informacion del solicitante",
  WAITING_INTERNAL_RESPONSE: "Esperando decision interna",
  WAITING_REVIEW: "Esperando revision",
  WAITING_APPROVAL: "Esperando aprobacion",
};

export const documentStateLabels: Record<DocumentState, string> = {
  DRAFT: "Borrador",
  IN_REVIEW: "En revision",
  APPROVED_DRAFT: "Borrador aprobado",
  OFFICIAL: "Oficial",
  ARCHIVED: "Archivado",
  OBSOLETE: "Obsoleto",
};

export const reviewDecisionLabels: Record<ReviewDecision, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
};

export const reviewAssignmentRoleLabels: Record<ReviewAssignmentRole, string> = {
  REVIEWER: "Revisor",
  APPROVER: "Aprobador",
};

export const reviewRoundStatusLabels: Record<ReviewRoundStatus, string> = {
  IN_REVIEW: "En revision",
  OBSERVED: "Observada",
  APPROVED: "Aprobada",
  OFFICIALIZED: "Oficializada",
};

export const documentVersionStatusLabels: Record<DocumentVersionStatus, string> = {
  DRAFT: "Borrador",
  IN_REVIEW: "En revision",
  REJECTED: "Rechazado",
  APPROVED: "Aprobado",
  OFFICIAL: "Oficial",
  SUPERSEDED: "Sustituido",
  ARCHIVED: "Archivado",
};

export const versionChangeKindLabels: Record<VersionChangeKind, string> = {
  MAJOR: "Mayor",
  MINOR: "Menor",
};

export const draftCommentTypeLabels: Record<DraftCommentType, string> = {
  OBSERVATION: "Observacion",
  SUGGESTION: "Sugerencia",
};

export const draftCommentStatusLabels: Record<DraftCommentStatus, string> = {
  OPEN: "Pendiente",
  RESOLVED: "Resuelta",
};
