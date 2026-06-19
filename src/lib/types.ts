import type { AppRole } from "@/lib/auth/types";

export type NavKey =
  | "dashboard"
  | "requests"
  | "documents"
  | "reviews"
  | "explorer"
  | "ai"
  | "admin";

export type VisibilityLevel =
  | "PUBLIC_INTERNAL"
  | "RESTRICTED_BY_GROUP"
  | "RESTRICTED_BY_ROLE"
  | "RESTRICTED_BY_USER"
  | "CONFIDENTIAL"
  | "ARCHIVED_RESTRICTED";

export type WorkflowStatus =
  | "PENDING_ASSIGNMENT"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "OBSERVED"
  | "APPROVED"
  | "OFFICIALIZED"
  | "CLOSED"
  | "CANCELLED";

export type RequestType = "NEW_DOCUMENT" | "UPDATE_EXISTING";
export type RequestPriority = "Alta" | "Media" | "Baja";
export type ResponsibilityRole = "ADMINISTRATOR" | "EDITOR" | "REQUESTER";
export type WaitingReason =
  | "NONE"
  | "WAITING_REQUESTER_INFO"
  | "WAITING_INTERNAL_RESPONSE"
  | "WAITING_REVIEW"
  | "WAITING_APPROVAL";
export type RequestProgressItemStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "RETURNED"
  | "WAITING"
  | "NOT_APPLICABLE";
export type RequestActivityType =
  | "CREATED"
  | "ASSIGNED"
  | "REASSIGNED"
  | "STARTED"
  | "CANCELLATION_REQUESTED"
  | "CANCELLATION_REJECTED"
  | "PROGRESS_UPDATED"
  | "TRACKING_UPDATED"
  | "STEP_COMPLETED"
  | "STEP_REOPENED"
  | "STEP_MARKED_NOT_APPLICABLE"
  | "STEP_RESTORED"
  | "WAITING_FOR_REQUESTER"
  | "REQUESTER_RESPONSE_RECORDED"
  | "CANCELLED"
  | "CLOSED";

export type DocumentState =
  | "DRAFT"
  | "IN_REVIEW"
  | "APPROVED_DRAFT"
  | "OFFICIAL"
  | "ARCHIVED"
  | "OBSOLETE";

export type ReviewDecision = "PENDING" | "APPROVED" | "REJECTED";
export type AccessEffect = "ALLOW" | "DENY";

export interface NavigationItem {
  key: NavKey;
  href: string;
  label: string;
  hint: string;
  allowedRoles: AppRole[];
}

export interface MetricCard {
  label: string;
  value: string;
  detail: string;
  tone: "accent" | "amber" | "green";
}

export interface RequestRecord {
  id?: string;
  code: string;
  title: string;
  process: string;
  type: string;
  priority: RequestPriority;
  requester: string;
  dueDate: string;
  progressPercent?: number;
  currentResponsibilityRole?: ResponsibilityRole;
  waitingReason?: WaitingReason;
  status: WorkflowStatus;
}

export interface RequestAttachmentRecord {
  id: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  downloadHref: string;
}

export interface RequestPersonRecord {
  id?: string;
  name: string;
  username?: string;
}

export interface RequestActivityRecord {
  id: string;
  actor?: RequestPersonRecord;
  createdAt: string;
  note?: string;
  statusAfter?: WorkflowStatus;
  responsibilityRole?: ResponsibilityRole;
  waitingReason?: WaitingReason;
  trackingStage?: RequestTrackingStageRecord;
  type: RequestActivityType;
}

export interface RequestTrackingStageRecord {
  code: string;
  phaseCode: string;
  phaseName: string;
  activityName: string;
  description?: string;
  progressPercent: number;
  sortOrder: number;
}

export interface RequesterOptionRecord {
  id: string;
  name: string;
  username: string;
}

export interface RequestOptionRecord {
  id: string;
  code: string;
  label: string;
}

export interface EditorOptionRecord {
  id: string;
  name: string;
  username: string;
}

export interface RequestDetailRecord {
  id: string;
  code: string;
  requestType: RequestType;
  title: string;
  description: string;
  justification?: string;
  requesterArea?: string;
  priority?: RequestPriority;
  requiredDate?: string;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
  requester?: RequestPersonRecord;
  createdBy?: RequestPersonRecord;
  assignedEditor?: RequestPersonRecord;
  assignedAt?: string;
  assignedBy?: RequestPersonRecord;
  startedAt?: string;
  progressPercent: number;
  currentPhaseCode?: string;
  currentPhaseName?: string;
  currentActivityCode?: string;
  currentActivityName?: string;
  currentActivityDescription?: string;
  currentResponsibilityRole: ResponsibilityRole;
  waitingReason: WaitingReason;
  waitingSince?: string;
  lastRequesterResponseAt?: string;
  hasPendingCancellation: boolean;
  cancellationRequestedAt?: string;
  cancellationRequestedBy?: RequestPersonRecord;
  cancellationRequestReason?: string;
  currentStageElapsedLabel?: string;
  currentStageVisits: number;
  totalElapsedLabel: string;
  process?: RequestOptionRecord;
  documentType?: RequestOptionRecord;
  attachments: RequestAttachmentRecord[];
  activities: RequestActivityRecord[];
  stageCatalog: RequestTrackingStageRecord[];
}

export interface RequestBoardFilters {
  createdFrom?: string;
  createdTo?: string;
  documentTypeId?: string;
  priority?: RequestPriority;
  processId?: string;
  requesterUserId?: string;
  status?: WorkflowStatus;
}

export interface ReviewTask {
  code: string;
  title: string;
  version: string;
  owner: string;
  status: ReviewDecision;
  role: "Revisor" | "Aprobador";
  dueDate: string;
}

export interface AuditEvent {
  actor: string;
  action: string;
  target: string;
  timestamp: string;
}

export interface DocumentRecord {
  id: string;
  code: string;
  title: string;
  process: string;
  type: string;
  version: string;
  state: DocumentState;
  visibility: VisibilityLevel;
  updatedAt: string;
  owner: string;
  summary: string;
  tags: string[];
  relatedCodes: string[];
  replacement?: string;
  downloadWindow?: string;
  allowedRoles?: AppRole[];
  allowedReaderGroups?: string[];
  allowedUsernames?: string[];
  aiEnabled?: boolean;
}

export interface ReviewComment {
  author: string;
  role: "Editor" | "Revisor" | "Aprobador";
  status: "Pendiente" | "Aceptada" | "Rechazada" | "Aplicada";
  section: string;
  note: string;
}

export interface AccessRule {
  subject: string;
  scope: "Lectura directa" | "Consulta IA" | "Histórico" | "Descarga";
  effect: AccessEffect;
  expiresAt?: string;
}

export interface ReaderGroupRecord {
  code: string;
  name: string;
  members: number;
  mode: "General" | "Restringido";
}

export interface UserRecord {
  id?: string;
  name: string;
  username: string;
  roleCode?: AppRole;
  role: string;
  readerGroups: string[];
  status: "Activo" | "Inactivo";
  access: string;
  canCreateRequests?: boolean;
}

export interface AiCitation {
  code: string;
  title: string;
  section: string;
  snippet: string;
}

export interface AiResponsePreset {
  id: string;
  prompt: string;
  answer: string;
  citations: AiCitation[];
}

export interface TreeBranch {
  label: string;
  code: string;
  children?: TreeBranch[];
}
