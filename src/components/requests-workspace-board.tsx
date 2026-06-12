'use client';

import type { ReactNode } from "react";
import { useActionState, useEffect, useState } from "react";

import {
  assignRequestStateAction,
  cancelRequestStateAction,
  closeRequestStateAction,
  placeRequestOnHoldForRequesterStateAction,
  registerRequesterResponseStateAction,
  startRequestStateAction,
  type RequestMutationState,
  updateRequestProgressItemStateAction,
  updateRequestProgressStateAction,
} from "@/app/(workspace)/requests/actions";
import { SubmitButton } from "@/components/submit-button";
import { StatusChip, workflowTone } from "@/components/status-chip";
import type { SessionUser } from "@/lib/auth/types";
import {
  requestActivityLabels,
  requestPriorityLabels,
  requestProgressStatusLabels,
  requestTypeLabels,
  responsibilityRoleLabels,
  waitingReasonLabels,
  workflowStatusLabels,
} from "@/lib/presenters";
import type {
  EditorOptionRecord,
  RequestActivityRecord,
  RequestDetailRecord,
  RequestPriority,
  RequestProgressItemRecord,
  RequestProgressItemStatus,
  ResponsibilityRole,
  WaitingReason,
  WorkflowStatus,
} from "@/lib/types";

const activeWorkflowStatuses: WorkflowStatus[] = [
  "ASSIGNED",
  "IN_PROGRESS",
  "IN_REVIEW",
  "OBSERVED",
  "APPROVED",
  "OFFICIALIZED",
];

const initialMutationState: RequestMutationState = {
  status: "idle",
};

type BoardTabId = "active" | "mine" | "pending" | "closed" | "cancelled";
type ProgressTransition = "COMPLETE" | "REOPEN" | "MARK_NOT_APPLICABLE" | "RESTORE_APPLICABLE";
type ActionModalKind =
  | "assign"
  | "cancel"
  | "note"
  | "close"
  | "progress-transition"
  | "wait-requester"
  | "requester-response";

type RequestsWorkspaceBoardProps = {
  canAssignRequests: boolean;
  currentUser: Pick<SessionUser, "id" | "role">;
  editors: EditorOptionRecord[];
  requests: RequestDetailRecord[];
};

type BoardTab = {
  id: BoardTabId;
  label: string;
  description: string;
  emptyMessage: string;
  requests: RequestDetailRecord[];
};

type ActionModalState = {
  kind: ActionModalKind;
  requestId: string;
  activityCode?: string;
  activityName?: string;
  transition?: ProgressTransition;
};

export function RequestsWorkspaceBoard({
  canAssignRequests,
  currentUser,
  editors,
  requests,
}: RequestsWorkspaceBoardProps) {
  const tabs = buildBoardTabs(requests, currentUser);
  const [activeTab, setActiveTab] = useState<BoardTabId>(tabs[0]?.id ?? "active");
  const [detailRequestId, setDetailRequestId] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<ActionModalState | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const modalOpen = Boolean(detailRequestId || actionModal);

    if (!modalOpen) {
      return undefined;
    }

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (actionModal) {
        setActionModal(null);
        return;
      }

      setDetailRequestId(null);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [actionModal, detailRequestId]);

  const currentTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const selectedRequest = detailRequestId
    ? requests.find((request) => request.id === detailRequestId) ?? null
    : null;
  const selectedActionRequest = actionModal
    ? requests.find((request) => request.id === actionModal.requestId) ?? null
    : null;

  return (
    <>
      <section className="space-y-4">
        <div className="surface-card overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const active = tab.id === currentTab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={
                      active
                        ? "inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
                        : "inline-flex items-center gap-2 rounded-full border border-line bg-white/92 px-4 py-2 text-sm font-semibold text-foreground hover:border-line-strong hover:bg-panel-muted/70"
                    }
                  >
                    <span>{tab.label}</span>
                    <span className={active ? "text-white/80" : "text-slate"}>
                      {String(tab.requests.length).padStart(2, "0")}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-sm leading-6 text-slate">{currentTab.description}</p>
          </div>

          <RequestTable
            currentUserRole={currentUser.role}
            emptyMessage={currentTab.emptyMessage}
            onOpenDetail={(requestId) => {
              setDetailRequestId(requestId);
              setActionModal(null);
            }}
            requests={currentTab.requests}
          />
        </div>
      </section>

      {selectedRequest ? (
        <RequestDetailModal
          canAssignRequests={canAssignRequests}
          currentUser={currentUser}
          onClose={() => {
            setDetailRequestId(null);
            setActionModal(null);
          }}
          onOpenAction={(modalState) =>
            setActionModal({
              ...modalState,
              requestId: selectedRequest.id,
            })
          }
          request={selectedRequest}
        />
      ) : null}

      {selectedActionRequest && actionModal ? (
        <RequestActionModal
          editors={editors}
          modalState={actionModal}
          onClose={() => setActionModal(null)}
          request={selectedActionRequest}
        />
      ) : null}
    </>
  );
}

function RequestTable({
  currentUserRole,
  emptyMessage,
  onOpenDetail,
  requests,
}: {
  currentUserRole: SessionUser["role"];
  emptyMessage: string;
  onOpenDetail: (requestId: string) => void;
  requests: RequestDetailRecord[];
}) {
  if (requests.length === 0) {
    return (
      <div className="px-5 py-8">
        <p className="text-sm leading-6 text-slate">{emptyMessage}</p>
      </div>
    );
  }

  const showRequesterColumn = currentUserRole !== "READER";

  return (
    <div className="subtle-scroll overflow-x-auto">
      <table className="min-w-[1180px] w-full border-collapse">
        <thead>
          <tr className="border-b border-line bg-panel-muted/45 text-left">
            <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate">
              Solicitud
            </th>
            {showRequesterColumn ? (
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate">
                Solicitante
              </th>
            ) : null}
            <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate">
              Contexto
            </th>
            <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate">
              Seguimiento
            </th>
            <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate">
              Estado
            </th>
            <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate">
              Actualizada
            </th>
            <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id} className="border-b border-line last:border-b-0">
              <td className="px-5 py-4 align-top">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate">
                  {request.code}
                </p>
                <p className="mt-2 font-semibold tracking-[-0.02em] text-foreground">
                  {request.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate">
                  {request.description.length > 110
                    ? `${request.description.slice(0, 110)}...`
                    : request.description}
                </p>
              </td>
              {showRequesterColumn ? (
                <td className="px-5 py-4 align-top text-sm leading-6 text-slate">
                  <p className="font-semibold text-foreground">
                    {request.requester?.name || "Sin usuario"}
                  </p>
                  <p>{request.requesterArea || "Sin area"}</p>
                </td>
              ) : null}
              <td className="px-5 py-4 align-top text-sm leading-6 text-slate">
                <p className="font-semibold text-foreground">
                  {requestTypeLabels[request.requestType]}
                </p>
                <p>{request.process?.label || "Sin proceso sugerido"}</p>
                <p>{request.documentType?.label || "Sin tipo sugerido"}</p>
              </td>
              <td className="px-5 py-4 align-top">
                <div className="space-y-3">
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs text-slate">
                      <span>{request.progressPercent}% objetivo</span>
                      <span>{request.currentActivityCode || "Sin actividad"}</span>
                    </div>
                    <ProgressBar value={request.progressPercent} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusChip tone={responsibilityTone(request.currentResponsibilityRole)}>
                      {responsibilityRoleLabels[request.currentResponsibilityRole]}
                    </StatusChip>
                    {request.waitingReason !== "NONE" ? (
                      <StatusChip tone={waitingTone(request.waitingReason)}>
                        {waitingReasonLabels[request.waitingReason]}
                      </StatusChip>
                    ) : null}
                  </div>
                  <p className="text-sm leading-6 text-slate">
                    {request.currentActivityName || "Sin actividad activa"}
                  </p>
                </div>
              </td>
              <td className="px-5 py-4 align-top">
                <div className="flex flex-wrap gap-2">
                  <StatusChip tone={workflowTone(workflowStatusLabels[request.status])}>
                    {workflowStatusLabels[request.status]}
                  </StatusChip>
                  <StatusChip tone={priorityTone(request.priority)}>
                    {priorityLabel(request.priority)}
                  </StatusChip>
                </div>
              </td>
              <td className="px-5 py-4 align-top text-sm leading-6 text-slate">
                {request.updatedAt}
              </td>
              <td className="px-5 py-4 align-top">
                <button
                  type="button"
                  onClick={() => onOpenDetail(request.id)}
                  className="button-secondary"
                >
                  Ver detalle
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RequestDetailModal({
  canAssignRequests,
  currentUser,
  onClose,
  onOpenAction,
  request,
}: {
  canAssignRequests: boolean;
  currentUser: Pick<SessionUser, "id" | "role">;
  onClose: () => void;
  onOpenAction: (modalState: Omit<ActionModalState, "requestId">) => void;
  request: RequestDetailRecord;
}) {
  const isFinalStatus = request.status === "CLOSED" || request.status === "CANCELLED";
  const canManageAssignedRequest =
    currentUser.role === "ADMINISTRATOR" || request.assignedEditor?.id === currentUser.id;
  const canStartRequest =
    canManageAssignedRequest &&
    (request.status === "ASSIGNED" || request.status === "IN_PROGRESS");
  const canAddNote =
    canManageAssignedRequest && !isFinalStatus && request.status !== "PENDING_ASSIGNMENT";
  const latestProgress = findLatestProgress(request.activities);
  const actionCount =
    Number(canAssignRequests && !isFinalStatus) +
    Number(canStartRequest) +
    Number(canAddNote) +
    Number(canManageAssignedRequest && !isFinalStatus);

  return (
    <ModalShell maxWidthClass="max-w-[1240px]" onClose={onClose}>
      <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
        <div className="min-w-0">
          <p className="section-label">Solicitud {request.code}</p>
          <h2 className="panel-title mt-2">{request.title}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusChip tone={workflowTone(workflowStatusLabels[request.status])}>
              {workflowStatusLabels[request.status]}
            </StatusChip>
            <StatusChip tone={priorityTone(request.priority)}>{priorityLabel(request.priority)}</StatusChip>
            <StatusChip tone="slate">{requestTypeLabels[request.requestType]}</StatusChip>
            <StatusChip tone={responsibilityTone(request.currentResponsibilityRole)}>
              {responsibilityRoleLabels[request.currentResponsibilityRole]}
            </StatusChip>
          </div>
        </div>
        <button type="button" className="button-secondary" onClick={onClose}>
          Cerrar
        </button>
      </div>

      <div className="subtle-scroll overflow-y-auto px-6 py-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_360px]">
          <div className="space-y-4">
            <section className="rounded-[20px] border border-line bg-white/82 p-4">
              <p className="section-label">Resumen operativo</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <MetadataItem label="Solicitante" value={request.requester?.name || "Sin usuario"} />
                <MetadataItem
                  label="Capturada por"
                  value={request.createdBy?.name || request.requester?.name || "Sin usuario"}
                />
                <MetadataItem label="Creada" value={request.createdAt} />
                <MetadataItem label="Actualizada" value={request.updatedAt} />
              </div>
            </section>

            <section className="rounded-[20px] border border-line bg-white/82 p-4">
              <p className="section-label">Metadatos base</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <MetadataItem label="Area solicitante" value={request.requesterArea || "Sin area"} />
                <MetadataItem label="Fecha requerida" value={request.requiredDate || "Sin fecha"} />
                <MetadataItem
                  label="Proceso sugerido"
                  value={request.process?.label || "Sin proceso sugerido"}
                />
                <MetadataItem
                  label="Tipo documental"
                  value={request.documentType?.label || "Sin tipo sugerido"}
                />
              </div>
            </section>

            <section className="rounded-[20px] border border-line bg-white/82 p-4">
              <p className="section-label">Descripcion</p>
              <p className="mt-3 text-sm leading-7 text-slate">{request.description}</p>
              {request.justification ? (
                <>
                  <p className="section-label mt-5">Justificacion</p>
                  <p className="mt-3 text-sm leading-7 text-slate">{request.justification}</p>
                </>
              ) : null}
            </section>

            <section className="rounded-[20px] border border-line bg-white/82 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="section-label">Seguimiento objetivo</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                    {request.progressPercent}%
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate">
                    {request.currentPhaseName || "Sin fase activa"} · {request.currentActivityName || "Sin actividad activa"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusChip tone={responsibilityTone(request.currentResponsibilityRole)}>
                    {responsibilityRoleLabels[request.currentResponsibilityRole]}
                  </StatusChip>
                  <StatusChip tone={waitingTone(request.waitingReason)}>
                    {waitingReasonLabels[request.waitingReason]}
                  </StatusChip>
                </div>
              </div>

              <div className="mt-4">
                <ProgressBar value={request.progressPercent} />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetadataItem label="Actividad actual" value={request.currentActivityCode || "Sin codigo"} />
                <MetadataItem label="Fase actual" value={request.currentPhaseCode || "Sin fase"} />
                <MetadataItem
                  label="Espera activa"
                  value={
                    request.waitingReason === "NONE"
                      ? "No"
                      : request.waitingSince
                        ? `Si, desde ${request.waitingSince}`
                        : "Si"
                  }
                />
                <MetadataItem
                  label="Ultima respuesta solicitante"
                  value={request.lastRequesterResponseAt || "Sin registro"}
                />
              </div>

              <div className="mt-5 space-y-4">
                {groupProgressItemsByPhase(request.progressItems).map(([phaseName, phaseItems]) => (
                  <div key={phaseName} className="rounded-[18px] border border-line bg-panel-muted/35 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">{phaseName}</p>
                      <StatusChip tone="slate">
                        {phaseItems.filter((item) => item.status === "COMPLETED").length}/
                        {phaseItems.length} completadas
                      </StatusChip>
                    </div>

                    <div className="mt-4 space-y-3">
                      {phaseItems.map((item) => (
                        <ProgressItemCard
                          key={item.id}
                          canManage={canManageAssignedRequest && !isFinalStatus}
                          item={item}
                          onOpenAction={onOpenAction}
                          request={request}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[20px] border border-line bg-white/82 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="section-label">Bitacora</p>
                <StatusChip tone="slate">
                  {String(request.activities.length).padStart(2, "0")} eventos
                </StatusChip>
              </div>
              {request.activities.length === 0 ? (
                <p className="mt-3 text-sm leading-6 text-slate">
                  Aun no hay movimientos registrados en esta solicitud.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {request.activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="rounded-[18px] border border-line bg-panel-muted/45 px-4 py-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusChip tone="accent">{requestActivityLabels[activity.type]}</StatusChip>
                        {activity.statusAfter ? (
                          <StatusChip tone={workflowTone(workflowStatusLabels[activity.statusAfter])}>
                            {workflowStatusLabels[activity.statusAfter]}
                          </StatusChip>
                        ) : null}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate">
                        {activity.note || "Movimiento registrado sin nota adicional."}
                      </p>
                      <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-slate">
                        {activity.actor?.name || "Sistema"} - {activity.createdAt}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-[20px] border border-line bg-accent/4 p-4">
              <p className="section-label">Asignacion editorial</p>
              {request.assignedEditor ? (
                <div className="mt-4 space-y-2 text-sm leading-6 text-slate">
                  <p className="font-semibold text-foreground">{request.assignedEditor.name}</p>
                  <p>{request.assignedEditor.username || "Sin username"}</p>
                  {request.assignedAt ? <p>Asignada el {request.assignedAt}</p> : null}
                  {request.assignedBy ? <p>Por {request.assignedBy.name}</p> : null}
                </div>
              ) : (
                <div className="mt-4 space-y-2 text-sm leading-6 text-slate">
                  <StatusChip tone="slate">Sin asignar</StatusChip>
                  <p>Aun no se ha designado editor responsable.</p>
                </div>
              )}

              {latestProgress ? (
                <div className="mt-4 rounded-[18px] border border-line bg-white/80 px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate">
                    Ultimo movimiento visible
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground">
                    {latestProgress.note || requestActivityLabels[latestProgress.type]}
                  </p>
                  <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-slate">
                    {latestProgress.actor?.name || "Sistema"} - {latestProgress.createdAt}
                  </p>
                </div>
              ) : null}
            </section>

            <section className="rounded-[20px] border border-line bg-white/82 p-4">
              <p className="section-label">Control del flujo</p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate">
                <div className="rounded-[18px] border border-line bg-panel-muted/45 px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate">
                    Responsable actual
                  </p>
                  <p className="mt-2 font-semibold text-foreground">
                    {responsibilityRoleLabels[request.currentResponsibilityRole]}
                  </p>
                </div>
                <div className="rounded-[18px] border border-line bg-panel-muted/45 px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate">
                    Motivo de espera
                  </p>
                  <p className="mt-2 font-semibold text-foreground">
                    {waitingReasonLabels[request.waitingReason]}
                  </p>
                  {request.waitingSince ? <p className="mt-1">Desde {request.waitingSince}</p> : null}
                </div>
                {currentUser.role === "EDITOR" &&
                request.assignedEditor &&
                request.assignedEditor.id !== currentUser.id ? (
                  <p className="text-sm leading-6 text-slate">
                    Editor responsable actual: {request.assignedEditor.name}.
                  </p>
                ) : null}
              </div>
            </section>

            <section className="rounded-[20px] border border-line bg-white/82 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="section-label">Anexos de insumo</p>
                <StatusChip tone="slate">
                  {String(request.attachments.length).padStart(2, "0")} archivos
                </StatusChip>
              </div>
              {request.attachments.length === 0 ? (
                <p className="mt-3 text-sm leading-6 text-slate">
                  Esta solicitud no tiene anexos cargados.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {request.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="rounded-[18px] border border-line bg-panel-muted/45 px-4 py-4"
                    >
                      <p className="font-semibold tracking-[-0.02em] text-foreground">
                        {attachment.originalFileName}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate">
                        {attachment.mimeType} - {attachment.uploadedAt}
                      </p>
                      <a href={attachment.downloadHref} className="button-secondary mt-3">
                        Descargar
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[20px] border border-line bg-white/82 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="section-label">Acciones</p>
                <StatusChip tone="slate">{String(actionCount).padStart(2, "0")} disponibles</StatusChip>
              </div>

              <div className="mt-4 space-y-3">
                {canAssignRequests && !isFinalStatus ? (
                  <button
                    type="button"
                    className="button-primary w-full"
                    onClick={() => onOpenAction({ kind: "assign" })}
                  >
                    {request.assignedEditor ? "Reasignar solicitud" : "Asignar solicitud"}
                  </button>
                ) : null}

                {canStartRequest ? (
                  <StartRequestInlineAction requestId={request.id} status={request.status} />
                ) : null}

                {canAddNote ? (
                  <button
                    type="button"
                    className="button-secondary w-full"
                    onClick={() => onOpenAction({ kind: "note" })}
                  >
                    Agregar nota
                  </button>
                ) : null}

                {canManageAssignedRequest && !isFinalStatus ? (
                  <button
                    type="button"
                    className="button-secondary w-full"
                    onClick={() => onOpenAction({ kind: "close" })}
                  >
                    Cerrar solicitud
                  </button>
                ) : null}

                {canAssignRequests && !isFinalStatus ? (
                  <button
                    type="button"
                    className="w-full rounded-full border border-red bg-white px-4 py-2.5 text-sm font-semibold text-red hover:bg-red-soft/70"
                    onClick={() => onOpenAction({ kind: "cancel" })}
                  >
                    Cancelar justificadamente
                  </button>
                ) : null}

                {actionCount === 0 ? (
                  <p className="text-sm leading-6 text-slate">
                    No hay acciones operativas disponibles para tu rol o para el estado actual de esta solicitud.
                  </p>
                ) : null}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </ModalShell>
  );
}

function ProgressItemCard({
  canManage,
  item,
  onOpenAction,
  request,
}: {
  canManage: boolean;
  item: RequestProgressItemRecord;
  onOpenAction: (modalState: Omit<ActionModalState, "requestId">) => void;
  request: RequestDetailRecord;
}) {
  const canWaitForRequester = item.status !== "COMPLETED" && item.status !== "NOT_APPLICABLE";

  return (
    <div className="rounded-[18px] border border-line bg-white/90 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate">
            {item.activityCode} · {item.weight}%
          </p>
          <p className="mt-2 font-semibold tracking-[-0.02em] text-foreground">{item.activityName}</p>
          {item.description ? (
            <p className="mt-2 text-sm leading-6 text-slate">{item.description}</p>
          ) : null}
          {item.note ? <p className="mt-2 text-sm leading-6 text-slate">Nota: {item.note}</p> : null}
          <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate">
            {item.lastChangedBy?.name || "Sistema"} - {item.lastChangedAt}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusChip tone={progressStatusTone(item.status)}>
            {requestProgressStatusLabels[item.status]}
          </StatusChip>
          {item.completedAt ? <StatusChip tone="green">Completada {item.completedAt}</StatusChip> : null}
        </div>
      </div>

      {canManage ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {item.status === "COMPLETED" ? (
            <button
              type="button"
              className="button-secondary"
              onClick={() =>
                onOpenAction({
                  kind: "progress-transition",
                  activityCode: item.activityCode,
                  activityName: item.activityName,
                  transition: "REOPEN",
                })
              }
            >
              Reabrir actividad
            </button>
          ) : null}

          {(item.status === "PENDING" ||
            item.status === "IN_PROGRESS" ||
            item.status === "RETURNED" ||
            item.status === "WAITING") ? (
            <button
              type="button"
              className="button-secondary"
              onClick={() =>
                onOpenAction({
                  kind: "progress-transition",
                  activityCode: item.activityCode,
                  activityName: item.activityName,
                  transition: "COMPLETE",
                })
              }
            >
              Completar actividad
            </button>
          ) : null}

          {item.status === "NOT_APPLICABLE" ? (
            <button
              type="button"
              className="button-secondary"
              onClick={() =>
                onOpenAction({
                  kind: "progress-transition",
                  activityCode: item.activityCode,
                  activityName: item.activityName,
                  transition: "RESTORE_APPLICABLE",
                })
              }
            >
              Restaurar aplicacion
            </button>
          ) : (
            <button
              type="button"
              className="button-secondary"
              onClick={() =>
                onOpenAction({
                  kind: "progress-transition",
                  activityCode: item.activityCode,
                  activityName: item.activityName,
                  transition: "MARK_NOT_APPLICABLE",
                })
              }
            >
              Marcar no aplica
            </button>
          )}

          {canWaitForRequester && item.status !== "WAITING" ? (
            <button
              type="button"
              className="button-secondary"
              onClick={() =>
                onOpenAction({
                  kind: "wait-requester",
                  activityCode: item.activityCode,
                  activityName: item.activityName,
                })
              }
            >
              Esperar solicitante
            </button>
          ) : null}

          {item.status === "WAITING" && request.currentResponsibilityRole === "REQUESTER" ? (
            <button
              type="button"
              className="button-secondary"
              onClick={() =>
                onOpenAction({
                  kind: "requester-response",
                  activityCode: item.activityCode,
                  activityName: item.activityName,
                })
              }
            >
              Registrar respuesta
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function RequestActionModal({
  editors,
  modalState,
  onClose,
  request,
}: {
  editors: EditorOptionRecord[];
  modalState: ActionModalState;
  onClose: () => void;
  request: RequestDetailRecord;
}) {
  if (modalState.kind === "assign") {
    return (
      <ModalShell maxWidthClass="max-w-[560px]" onClose={onClose} zIndexClass="z-[70]">
        <ActionModalHeader
          title={request.assignedEditor ? "Reasignar solicitud" : "Asignar solicitud"}
          description={`Define el editor responsable para ${request.code}.`}
          onClose={onClose}
        />
        <AssignRequestForm editors={editors} onSuccess={onClose} request={request} />
      </ModalShell>
    );
  }

  if (modalState.kind === "cancel") {
    return (
      <ModalShell maxWidthClass="max-w-[560px]" onClose={onClose} zIndexClass="z-[70]">
        <ActionModalHeader
          title="Cancelar solicitud"
          description={`Registra la causa justificada para cancelar ${request.code}.`}
          onClose={onClose}
        />
        <RequestTextareaActionForm
          action={cancelRequestStateAction}
          fieldName="reason"
          idleLabel="Cancelar solicitud"
          onSuccess={onClose}
          pendingLabel="Cancelando..."
          placeholder="Registra la justificacion administrativa de la cancelacion."
          requestId={request.id}
          tone="danger"
        />
      </ModalShell>
    );
  }

  if (modalState.kind === "close") {
    return (
      <ModalShell maxWidthClass="max-w-[560px]" onClose={onClose} zIndexClass="z-[70]">
        <ActionModalHeader
          title="Cerrar solicitud"
          description={`Documenta el cierre operativo de ${request.code}.`}
          onClose={onClose}
        />
        <RequestTextareaActionForm
          action={closeRequestStateAction}
          fieldName="note"
          idleLabel="Cerrar solicitud"
          onSuccess={onClose}
          pendingLabel="Cerrando..."
          placeholder="Indica la resolucion final y confirma el cierre del flujo."
          requestId={request.id}
          tone="default"
        />
      </ModalShell>
    );
  }

  if (modalState.kind === "progress-transition" && modalState.activityCode && modalState.transition) {
    return (
      <ModalShell maxWidthClass="max-w-[560px]" onClose={onClose} zIndexClass="z-[70]">
        <ActionModalHeader
          title={progressTransitionTitle(modalState.transition)}
          description={`${modalState.activityCode} - ${modalState.activityName || "Actividad de seguimiento"}.`}
          onClose={onClose}
        />
        <RequestTextareaActionForm
          action={updateRequestProgressItemStateAction}
          extraHiddenFields={{
            activityCode: modalState.activityCode,
            transition: modalState.transition,
          }}
          fieldName="note"
          idleLabel={progressTransitionButtonLabel(modalState.transition)}
          onSuccess={onClose}
          pendingLabel="Guardando cambio..."
          placeholder="Documenta el motivo del cambio de estado en esta actividad."
          requestId={request.id}
          tone="default"
        />
      </ModalShell>
    );
  }

  if (modalState.kind === "wait-requester" && modalState.activityCode) {
    return (
      <ModalShell maxWidthClass="max-w-[560px]" onClose={onClose} zIndexClass="z-[70]">
        <ActionModalHeader
          title="Pausar por solicitante"
          description={`${modalState.activityCode} - ${modalState.activityName || "Actividad de seguimiento"}.`}
          onClose={onClose}
        />
        <RequestTextareaActionForm
          action={placeRequestOnHoldForRequesterStateAction}
          extraHiddenFields={{
            activityCode: modalState.activityCode,
          }}
          fieldName="note"
          idleLabel="Marcar espera"
          onSuccess={onClose}
          pendingLabel="Guardando espera..."
          placeholder="Indica exactamente la informacion o respuesta que se esta solicitando."
          requestId={request.id}
          tone="default"
        />
      </ModalShell>
    );
  }

  if (modalState.kind === "requester-response" && modalState.activityCode) {
    return (
      <ModalShell maxWidthClass="max-w-[560px]" onClose={onClose} zIndexClass="z-[70]">
        <ActionModalHeader
          title="Registrar respuesta del solicitante"
          description={`${modalState.activityCode} - ${modalState.activityName || "Actividad de seguimiento"}.`}
          onClose={onClose}
        />
        <RequestTextareaActionForm
          action={registerRequesterResponseStateAction}
          extraHiddenFields={{
            activityCode: modalState.activityCode,
          }}
          fieldName="note"
          idleLabel="Registrar respuesta"
          onSuccess={onClose}
          pendingLabel="Registrando..."
          placeholder="Resume la respuesta recibida y confirma la reactivacion del trabajo."
          requestId={request.id}
          tone="default"
        />
      </ModalShell>
    );
  }

  return (
    <ModalShell maxWidthClass="max-w-[560px]" onClose={onClose} zIndexClass="z-[70]">
      <ActionModalHeader
        title="Agregar nota"
        description={`Registra una nota operativa para ${request.code}.`}
        onClose={onClose}
      />
      <RequestTextareaActionForm
        action={updateRequestProgressStateAction}
        fieldName="note"
        idleLabel="Guardar nota"
        onSuccess={onClose}
        pendingLabel="Guardando nota..."
        placeholder="Describe el analisis realizado, acuerdos, hallazgos o siguiente paso."
        requestId={request.id}
        tone="default"
      />
    </ModalShell>
  );
}

function AssignRequestForm({
  editors,
  onSuccess,
  request,
}: {
  editors: EditorOptionRecord[];
  onSuccess: () => void;
  request: RequestDetailRecord;
}) {
  const [state, formAction] = useActionState(assignRequestStateAction, initialMutationState);

  useEffect(() => {
    if (state.status === "success") {
      onSuccess();
    }
  }, [onSuccess, state.status]);

  return (
    <form action={formAction} className="space-y-4 px-6 py-5">
      <input type="hidden" name="requestId" value={request.id} />
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-foreground">Editor responsable</span>
        <select
          name="editorId"
          className="field-input"
          defaultValue={request.assignedEditor?.id || ""}
          required
        >
          <option value="">Selecciona un editor</option>
          {editors.map((editor) => (
            <option key={editor.id} value={editor.id}>
              {editor.name} - {editor.username}
            </option>
          ))}
        </select>
      </label>
      <MutationMessage state={state} />
      <div className="flex justify-end">
        <SubmitButton
          idleLabel={request.assignedEditor ? "Guardar reasignacion" : "Guardar asignacion"}
          pendingLabel="Guardando asignacion..."
          className="button-primary disabled:cursor-wait disabled:opacity-70"
        />
      </div>
    </form>
  );
}

function RequestTextareaActionForm({
  action,
  extraHiddenFields,
  fieldName,
  idleLabel,
  onSuccess,
  pendingLabel,
  placeholder,
  requestId,
  tone,
}: {
  action: (previousState: RequestMutationState, formData: FormData) => Promise<RequestMutationState>;
  extraHiddenFields?: Record<string, string>;
  fieldName: "note" | "reason";
  idleLabel: string;
  onSuccess: () => void;
  pendingLabel: string;
  placeholder: string;
  requestId: string;
  tone: "default" | "danger";
}) {
  const [state, formAction] = useActionState(action, initialMutationState);

  useEffect(() => {
    if (state.status === "success") {
      onSuccess();
    }
  }, [onSuccess, state.status]);

  return (
    <form action={formAction} className="space-y-4 px-6 py-5">
      <input type="hidden" name="requestId" value={requestId} />
      {extraHiddenFields
        ? Object.entries(extraHiddenFields).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))
        : null}
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-foreground">Detalle</span>
        <textarea
          name={fieldName}
          className="field-textarea"
          rows={4}
          placeholder={placeholder}
          required
        />
      </label>
      <MutationMessage state={state} />
      <div className="flex justify-end">
        <SubmitButton
          idleLabel={idleLabel}
          pendingLabel={pendingLabel}
          className={
            tone === "danger"
              ? "rounded-full border border-red bg-white px-4 py-2.5 text-sm font-semibold text-red disabled:cursor-wait disabled:opacity-70"
              : "button-primary disabled:cursor-wait disabled:opacity-70"
          }
        />
      </div>
    </form>
  );
}

function StartRequestInlineAction({
  requestId,
  status,
}: {
  requestId: string;
  status: WorkflowStatus;
}) {
  const [state, formAction] = useActionState(startRequestStateAction, initialMutationState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="requestId" value={requestId} />
      <SubmitButton
        idleLabel={status === "IN_PROGRESS" ? "Mantener en gestion" : "Iniciar atencion"}
        pendingLabel="Actualizando estado..."
        className="button-secondary w-full disabled:cursor-wait disabled:opacity-70"
      />
      <MutationMessage state={state} />
    </form>
  );
}

function MutationMessage({ state }: { state: RequestMutationState }) {
  if (state.status !== "error" || !state.message) {
    return null;
  }

  return (
    <div className="rounded-[18px] border border-red/18 bg-red-soft px-4 py-3 text-sm leading-6 text-red">
      {state.message}
    </div>
  );
}

function ActionModalHeader({
  description,
  onClose,
  title,
}: {
  description: string;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
      <div>
        <p className="section-label">Accion sobre solicitud</p>
        <h3 className="panel-title mt-2">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-slate">{description}</p>
      </div>
      <button type="button" className="button-secondary" onClick={onClose}>
        Cerrar
      </button>
    </div>
  );
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-line bg-panel-muted/45 px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate">{label}</p>
      <p className="mt-2 text-sm leading-6 text-foreground">{value}</p>
    </div>
  );
}

function ModalShell({
  children,
  maxWidthClass,
  onClose,
  zIndexClass = "z-50",
}: {
  children: ReactNode;
  maxWidthClass: string;
  onClose: () => void;
  zIndexClass?: string;
}) {
  return (
    <div className={`fixed inset-0 ${zIndexClass} flex items-center justify-center px-4 py-4`}>
      <button
        type="button"
        aria-label="Cerrar modal"
        className="absolute inset-0 bg-foreground/18 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`surface-card relative z-10 flex max-h-[calc(100dvh-2rem)] w-full ${maxWidthClass} flex-col overflow-hidden`}
      >
        {children}
      </div>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 rounded-full bg-panel-muted/80">
      <div
        className="h-full rounded-full bg-accent transition-[width]"
        style={{ width: `${Math.max(0, Math.min(value, 100))}%` }}
      />
    </div>
  );
}

function buildBoardTabs(
  requests: RequestDetailRecord[],
  currentUser: Pick<SessionUser, "id" | "role">,
): BoardTab[] {
  const activeRequests = requests.filter((request) => activeWorkflowStatuses.includes(request.status));
  const pendingRequests = requests.filter((request) => request.status === "PENDING_ASSIGNMENT");
  const closedRequests = requests.filter((request) => request.status === "CLOSED");
  const cancelledRequests = requests.filter((request) => request.status === "CANCELLED");
  const tabs: BoardTab[] = [
    {
      id: "active",
      label: "Activas",
      description: "Solicitudes que ya salieron de la cola de asignacion y siguen en gestion.",
      emptyMessage: "No hay solicitudes activas con los filtros actuales.",
      requests: activeRequests,
    },
  ];

  if (currentUser.role === "EDITOR") {
    tabs.push({
      id: "mine",
      label: "Asignadas a mi",
      description: "Vista concentrada de las solicitudes que te corresponden como editor responsable.",
      emptyMessage: "No tienes solicitudes asignadas activas con los filtros actuales.",
      requests: activeRequests.filter((request) => request.assignedEditor?.id === currentUser.id),
    });
  }

  tabs.push(
    {
      id: "pending",
      label: "Pendientes de asignacion",
      description: "Solicitudes nuevas que aun no tienen editor responsable.",
      emptyMessage: "No hay solicitudes pendientes de asignacion con los filtros actuales.",
      requests: pendingRequests,
    },
    {
      id: "closed",
      label: "Cerradas",
      description: "Solicitudes que completaron el proceso y llegaron al cierre formal.",
      emptyMessage: "No hay solicitudes cerradas con los filtros actuales.",
      requests: closedRequests,
    },
    {
      id: "cancelled",
      label: "Canceladas",
      description: "Solicitudes detenidas por una causa justificada y registradas en bitacora.",
      emptyMessage: "No hay solicitudes canceladas con los filtros actuales.",
      requests: cancelledRequests,
    },
  );

  return tabs;
}

function groupProgressItemsByPhase(items: RequestProgressItemRecord[]) {
  const groups = new Map<string, RequestProgressItemRecord[]>();

  for (const item of items) {
    const group = groups.get(item.phaseName);

    if (group) {
      group.push(item);
      continue;
    }

    groups.set(item.phaseName, [item]);
  }

  return [...groups.entries()];
}

function priorityLabel(priority?: RequestPriority) {
  return priority ? requestPriorityLabels[priority] : "Media";
}

function priorityTone(priority?: RequestPriority) {
  if (priority === "Alta") {
    return "red";
  }

  if (priority === "Baja") {
    return "green";
  }

  return "amber";
}

function progressStatusTone(status: RequestProgressItemStatus) {
  switch (status) {
    case "COMPLETED":
      return "green";
    case "IN_PROGRESS":
      return "amber";
    case "RETURNED":
      return "red";
    case "WAITING":
      return "accent";
    case "NOT_APPLICABLE":
      return "slate";
    default:
      return "slate";
  }
}

function responsibilityTone(role: ResponsibilityRole) {
  switch (role) {
    case "EDITOR":
      return "amber";
    case "REQUESTER":
      return "red";
    default:
      return "accent";
  }
}

function waitingTone(reason: WaitingReason) {
  switch (reason) {
    case "WAITING_REQUESTER_INFO":
      return "red";
    case "WAITING_INTERNAL_RESPONSE":
    case "WAITING_REVIEW":
    case "WAITING_APPROVAL":
      return "amber";
    default:
      return "slate";
  }
}

function progressTransitionTitle(transition: ProgressTransition) {
  switch (transition) {
    case "COMPLETE":
      return "Completar actividad";
    case "REOPEN":
      return "Reabrir actividad";
    case "MARK_NOT_APPLICABLE":
      return "Marcar no aplica";
    case "RESTORE_APPLICABLE":
      return "Restaurar aplicacion";
  }
}

function progressTransitionButtonLabel(transition: ProgressTransition) {
  switch (transition) {
    case "COMPLETE":
      return "Completar actividad";
    case "REOPEN":
      return "Reabrir actividad";
    case "MARK_NOT_APPLICABLE":
      return "Guardar no aplica";
    case "RESTORE_APPLICABLE":
      return "Restaurar aplicacion";
  }
}

function findLatestProgress(activities: RequestActivityRecord[]) {
  return activities.find((activity) =>
    [
      "PROGRESS_UPDATED",
      "STEP_COMPLETED",
      "STEP_REOPENED",
      "WAITING_FOR_REQUESTER",
      "REQUESTER_RESPONSE_RECORDED",
      "STARTED",
      "ASSIGNED",
      "REASSIGNED",
    ].includes(activity.type),
  );
}
