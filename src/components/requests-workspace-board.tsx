'use client';

import type { ReactNode } from "react";
import { useActionState, useEffect, useState } from "react";

import {
  approveCancellationStateAction,
  assignRequestStateAction,
  closeRequestStateAction,
  rejectCancellationStateAction,
  requestCancellationStateAction,
  startRequestStateAction,
  type RequestMutationState,
  updateRequestProgressStateAction,
  updateRequestTrackingStateAction,
} from "@/app/(workspace)/requests/actions";
import { SubmitButton } from "@/components/submit-button";
import { StatusChip, workflowTone } from "@/components/status-chip";
import type { SessionUser } from "@/lib/auth/types";
import {
  requestActivityLabels,
  requestPriorityLabels,
  requestTypeLabels,
  responsibilityRoleLabels,
  waitingReasonLabels,
  workflowStatusLabels,
} from "@/lib/presenters";
import type {
  EditorOptionRecord,
  RequestDetailRecord,
  RequestPriority,
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
type ActionModalKind =
  | "assign"
  | "request-cancel"
  | "approve-cancel"
  | "reject-cancel"
  | "note"
  | "close"
  | "tracking";

type RequestsWorkspaceBoardProps = {
  canAssignRequests: boolean;
  currentUser: Pick<SessionUser, "id" | "role">;
  editors: EditorOptionRecord[];
  initialDetailRequestId?: string;
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
};

export function RequestsWorkspaceBoard({
  canAssignRequests,
  currentUser,
  editors,
  initialDetailRequestId,
  requests,
}: RequestsWorkspaceBoardProps) {
  const tabs = buildBoardTabs(requests, currentUser);
  const [activeTab, setActiveTab] = useState<BoardTabId>(tabs[0]?.id ?? "active");
  const [detailRequestId, setDetailRequestId] = useState<string | null>(
    initialDetailRequestId && requests.some((request) => request.id === initialDetailRequestId)
      ? initialDetailRequestId
      : null,
  );
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
        <div className="rounded-[20px] border border-line bg-accent/5 px-5 py-4">
          <p className="text-sm font-semibold text-foreground">Como operar el seguimiento</p>
          <p className="mt-2 text-sm leading-6 text-slate">
            La solicitud siempre tiene una sola etapa vigente. Usa{" "}
            <span className="font-semibold text-foreground">Gestionar seguimiento</span> para
            seleccionar la etapa actual, actualizar la responsabilidad, registrar una espera y
            dejar el comentario en bitacora.
          </p>
        </div>

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
      <table className="min-w-[1240px] w-full border-collapse">
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
                      <span>{request.progressPercent}% acumulado</span>
                      <span>{request.currentActivityCode || "Sin etapa"}</span>
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
                    {request.currentActivityName || "Sin etapa activa"}
                  </p>
                </div>
              </td>
              <td className="px-5 py-4 align-top">
                <div className="flex flex-wrap gap-2">
                  <StatusChip tone={workflowTone(workflowStatusLabels[request.status])}>
                    {workflowStatusLabels[request.status]}
                  </StatusChip>
                  {request.hasPendingCancellation ? (
                    <StatusChip tone="red">Cancelacion pendiente</StatusChip>
                  ) : null}
                  <StatusChip tone={priorityTone(request.priority)}>{priorityLabel(request.priority)}</StatusChip>
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
                  Gestionar seguimiento
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
  const currentStage =
    request.stageCatalog.find((stage) => stage.code === request.currentActivityCode) ??
    request.stageCatalog[0];
  const hasStarted = Boolean(request.startedAt) || Boolean(currentStage && currentStage.sortOrder >= 40);
  const isAssignedEditor = request.assignedEditor?.id === currentUser.id;
  const isRequesterOwner =
    currentUser.role === "READER" && request.requester?.id === currentUser.id;
  const canManageAssignedRequest = currentUser.role === "ADMINISTRATOR" || isAssignedEditor;
  const canStartRequest =
    isAssignedEditor && request.status === "ASSIGNED" && !hasStarted && !request.hasPendingCancellation;
  const canUpdateTracking =
    canManageAssignedRequest && hasStarted && !isFinalStatus && !request.hasPendingCancellation;
  const canAddNote = canUpdateTracking;
  const canCloseRequest =
    canManageAssignedRequest && hasStarted && !isFinalStatus && !request.hasPendingCancellation;
  const canAssignOrReassign =
    canAssignRequests && !isFinalStatus && !request.hasPendingCancellation;
  const canRequestCancellation =
    !isFinalStatus &&
    !request.hasPendingCancellation &&
    request.status !== "OFFICIALIZED" &&
    (isAssignedEditor || isRequesterOwner);
  const canModerateCancellation =
    currentUser.role === "ADMINISTRATOR" && request.hasPendingCancellation && !isFinalStatus;
  const latestActivity = request.activities[0];
  const actionCount =
    Number(canAssignOrReassign) +
    Number(canStartRequest) +
    Number(canUpdateTracking) +
    Number(canAddNote) +
    Number(canCloseRequest) +
    Number(canRequestCancellation) +
    Number(canModerateCancellation ? 2 : 0);

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
            {request.hasPendingCancellation ? (
              <StatusChip tone="red">Cancelacion pendiente</StatusChip>
            ) : null}
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

      <div className="subtle-scroll min-h-0 flex-1 overflow-y-auto px-6 py-5">
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
                {request.startedAt ? (
                  <MetadataItem label="Inicio formal" value={request.startedAt} />
                ) : null}
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
                    {request.currentPhaseName || "Sin fase activa"} ·{" "}
                    {request.currentActivityName || "Sin etapa activa"}
                  </p>
                  {request.currentActivityDescription ? (
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate">
                      {request.currentActivityDescription}
                    </p>
                  ) : null}
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
                <MetadataItem label="Etapa actual" value={request.currentActivityCode || "Sin codigo"} />
                <MetadataItem label="Tiempo en etapa" value={request.currentStageElapsedLabel || "Sin dato"} />
                <MetadataItem label="Veces en etapa" value={String(request.currentStageVisits)} />
                <MetadataItem label="Tiempo total" value={request.totalElapsedLabel} />
              </div>
            </section>

            <section className="rounded-[20px] border border-line bg-white/82 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">Matriz de seguimiento</p>
                  <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-foreground">
                    Catalogo maestro de etapas
                  </h3>
                </div>
                <StatusChip tone="slate">
                  Etapa vigente: {request.currentActivityCode || "Sin etapa"}
                </StatusChip>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line bg-panel-muted/40 text-left text-[10px] uppercase tracking-[0.16em] text-slate">
                      <th className="px-3 py-3 font-semibold">Fase</th>
                      <th className="px-3 py-3 font-semibold">Etapa</th>
                      <th className="px-3 py-3 font-semibold">Descripcion</th>
                      <th className="px-3 py-3 font-semibold">Avance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {request.stageCatalog.map((stage) => {
                      const isCurrent = stage.code === request.currentActivityCode;

                      return (
                        <tr
                          key={stage.code}
                          className={isCurrent ? "border-b border-line bg-accent/6" : "border-b border-line"}
                        >
                          <td className="px-3 py-3 align-top text-slate">{stage.phaseName}</td>
                          <td className="px-3 py-3 align-top">
                            <p className="font-semibold text-foreground">
                              {stage.code} · {stage.activityName}
                            </p>
                          </td>
                          <td className="px-3 py-3 align-top text-slate">
                            {stage.description || "Sin descripcion"}
                          </td>
                          <td className="px-3 py-3 align-top">
                            <StatusChip tone={isCurrent ? "accent" : "slate"}>
                              {stage.progressPercent}%
                            </StatusChip>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
                        {activity.trackingStage ? (
                          <StatusChip tone="slate">
                            {activity.trackingStage.code} · {activity.trackingStage.progressPercent}%
                          </StatusChip>
                        ) : null}
                        {activity.responsibilityRole ? (
                          <StatusChip tone={responsibilityTone(activity.responsibilityRole)}>
                            {responsibilityRoleLabels[activity.responsibilityRole]}
                          </StatusChip>
                        ) : null}
                        {activity.waitingReason && activity.waitingReason !== "NONE" ? (
                          <StatusChip tone={waitingTone(activity.waitingReason)}>
                            {waitingReasonLabels[activity.waitingReason]}
                          </StatusChip>
                        ) : null}
                        {activity.statusAfter ? (
                          <StatusChip tone={workflowTone(workflowStatusLabels[activity.statusAfter])}>
                            {workflowStatusLabels[activity.statusAfter]}
                          </StatusChip>
                        ) : null}
                      </div>
                      {activity.trackingStage ? (
                        <p className="mt-3 text-sm leading-6 text-foreground">
                          {activity.trackingStage.activityName}
                        </p>
                      ) : null}
                      <p className="mt-2 text-sm leading-6 text-slate">
                        {activity.note || "Movimiento registrado sin comentario adicional."}
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

              {latestActivity ? (
                <div className="mt-4 rounded-[18px] border border-line bg-white/80 px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate">
                    Ultimo movimiento visible
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground">
                    {latestActivity.note || requestActivityLabels[latestActivity.type]}
                  </p>
                  <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-slate">
                    {latestActivity.actor?.name || "Sistema"} - {latestActivity.createdAt}
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
                <div className="rounded-[18px] border border-line bg-panel-muted/45 px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate">
                    Ultima respuesta del solicitante
                  </p>
                  <p className="mt-2 font-semibold text-foreground">
                    {request.lastRequesterResponseAt || "Sin registro"}
                  </p>
                </div>
                {request.hasPendingCancellation ? (
                  <div className="rounded-[18px] border border-red/18 bg-red-soft px-4 py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red">
                      Cancelacion pendiente
                    </p>
                    <p className="mt-2 font-semibold text-foreground">
                      Solicitada por {request.cancellationRequestedBy?.name || "Usuario no resuelto"}
                    </p>
                    {request.cancellationRequestedAt ? (
                      <p className="mt-1">Registrada el {request.cancellationRequestedAt}</p>
                    ) : null}
                    <p className="mt-3 text-sm leading-6 text-slate">
                      {request.cancellationRequestReason || "Sin justificacion registrada."}
                    </p>
                  </div>
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
                {canAssignOrReassign ? (
                  <button
                    type="button"
                    className="button-primary w-full"
                    onClick={() => onOpenAction({ kind: "assign" })}
                  >
                    {request.assignedEditor ? "Reasignar solicitud" : "Asignar solicitud"}
                  </button>
                ) : null}

                {canStartRequest ? (
                  <StartRequestInlineAction requestId={request.id} />
                ) : null}

                {canUpdateTracking ? (
                  <button
                    type="button"
                    className="button-secondary w-full"
                    onClick={() => onOpenAction({ kind: "tracking" })}
                  >
                    Actualizar seguimiento
                  </button>
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

                {canCloseRequest ? (
                  <button
                    type="button"
                    className="button-secondary w-full"
                    onClick={() => onOpenAction({ kind: "close" })}
                  >
                    Cerrar solicitud
                  </button>
                ) : null}

                {canRequestCancellation ? (
                  <button
                    type="button"
                    className="w-full rounded-full border border-red bg-white px-4 py-2.5 text-sm font-semibold text-red hover:bg-red-soft/70"
                    onClick={() => onOpenAction({ kind: "request-cancel" })}
                  >
                    Solicitar cancelacion
                  </button>
                ) : null}

                {canModerateCancellation ? (
                  <button
                    type="button"
                    className="button-primary w-full"
                    onClick={() => onOpenAction({ kind: "approve-cancel" })}
                  >
                    Aprobar cancelacion
                  </button>
                ) : null}

                {canModerateCancellation ? (
                  <button
                    type="button"
                    className="button-secondary w-full"
                    onClick={() => onOpenAction({ kind: "reject-cancel" })}
                  >
                    Rechazar cancelacion
                  </button>
                ) : null}

                {actionCount === 0 ? (
                  <p className="text-sm leading-6 text-slate">
                    No hay acciones operativas disponibles para tu rol o para el estado actual de
                    esta solicitud.
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

  if (modalState.kind === "request-cancel") {
    return (
      <ModalShell maxWidthClass="max-w-[560px]" onClose={onClose} zIndexClass="z-[70]">
        <ActionModalHeader
          title="Solicitar cancelacion"
          description={`Registra la causa justificada para solicitar la cancelacion de ${request.code}.`}
          onClose={onClose}
        />
        <RequestTextareaActionForm
          action={requestCancellationStateAction}
          fieldName="reason"
          idleLabel="Solicitar cancelacion"
          onSuccess={onClose}
          pendingLabel="Solicitando..."
          placeholder="Registra la justificacion para que el administrador revise la cancelacion."
          requestId={request.id}
          tone="danger"
        />
      </ModalShell>
    );
  }

  if (modalState.kind === "approve-cancel") {
    return (
      <ModalShell maxWidthClass="max-w-[560px]" onClose={onClose} zIndexClass="z-[70]">
        <ActionModalHeader
          title="Aprobar cancelacion"
          description={`Confirma la cancelacion administrativa de ${request.code}.`}
          onClose={onClose}
        />
        <RequestTextareaActionForm
          action={approveCancellationStateAction}
          fieldName="note"
          idleLabel="Aprobar cancelacion"
          onSuccess={onClose}
          pendingLabel="Aprobando..."
          placeholder="Registra la aprobacion administrativa de la cancelacion."
          requestId={request.id}
          tone="danger"
        />
      </ModalShell>
    );
  }

  if (modalState.kind === "reject-cancel") {
    return (
      <ModalShell maxWidthClass="max-w-[560px]" onClose={onClose} zIndexClass="z-[70]">
        <ActionModalHeader
          title="Rechazar cancelacion"
          description={`Documenta la razon por la que la solicitud ${request.code} debe continuar activa.`}
          onClose={onClose}
        />
        <RequestTextareaActionForm
          action={rejectCancellationStateAction}
          fieldName="note"
          idleLabel="Rechazar cancelacion"
          onSuccess={onClose}
          pendingLabel="Rechazando..."
          placeholder="Describe la razon administrativa para rechazar la cancelacion."
          requestId={request.id}
          tone="default"
        />
      </ModalShell>
    );
  }

  if (modalState.kind === "close") {
    return (
      <ModalShell maxWidthClass="max-w-[560px]" onClose={onClose} zIndexClass="z-[70]">
        <ActionModalHeader
          title="Cerrar solicitud"
          description={`Confirma el cierre formal de ${request.code}.`}
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

  if (modalState.kind === "tracking") {
    return (
      <ModalShell maxWidthClass="max-w-[620px]" onClose={onClose} zIndexClass="z-[70]">
        <ActionModalHeader
          title="Actualizar seguimiento"
          description={`Selecciona la etapa vigente y registra la responsabilidad actual de ${request.code}.`}
          onClose={onClose}
        />
        <UpdateTrackingForm onSuccess={onClose} request={request} />
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

function UpdateTrackingForm({
  onSuccess,
  request,
}: {
  onSuccess: () => void;
  request: RequestDetailRecord;
}) {
  const [state, formAction] = useActionState(updateRequestTrackingStateAction, initialMutationState);
  const availableStages = request.stageCatalog.filter((stage) => stage.sortOrder >= 40);

  useEffect(() => {
    if (state.status === "success") {
      onSuccess();
    }
  }, [onSuccess, state.status]);

  return (
    <form action={formAction} className="space-y-4 px-6 py-5">
      <input type="hidden" name="requestId" value={request.id} />

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-foreground">Etapa vigente</span>
        <select
          name="stageCode"
          className="field-input"
          defaultValue={request.currentActivityCode || availableStages[0]?.code || ""}
          required
        >
          {availableStages.map((stage) => (
            <option key={stage.code} value={stage.code}>
              {stage.code} - {stage.activityName} ({stage.progressPercent}%)
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-foreground">Responsabilidad actual</span>
          <select
            name="responsibilityRole"
            className="field-input"
            defaultValue={request.currentResponsibilityRole}
            required
          >
            {(
              ["ADMINISTRATOR", "EDITOR", "REQUESTER"] as const satisfies ResponsibilityRole[]
            ).map((role) => (
              <option key={role} value={role}>
                {responsibilityRoleLabels[role]}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-foreground">Motivo de espera</span>
          <select
            name="waitingReason"
            className="field-input"
            defaultValue={request.waitingReason}
            required
          >
            {(
              [
                "NONE",
                "WAITING_REQUESTER_INFO",
                "WAITING_INTERNAL_RESPONSE",
                "WAITING_REVIEW",
                "WAITING_APPROVAL",
              ] as const satisfies WaitingReason[]
            ).map((reason) => (
              <option key={reason} value={reason}>
                {waitingReasonLabels[reason]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-foreground">Comentario del movimiento</span>
        <textarea
          name="note"
          className="min-h-[130px] w-full rounded-[20px] border border-line bg-white px-4 py-3 text-sm leading-6 text-foreground outline-none focus:border-accent focus:shadow-[0_0_0_4px_rgba(15,77,93,0.08)]"
          placeholder="Describe por que la solicitud queda en esta etapa y quien debe darle continuidad."
          required
        />
      </label>

      <MutationMessage state={state} />
      <div className="flex justify-end">
        <SubmitButton
          idleLabel="Guardar seguimiento"
          pendingLabel="Guardando seguimiento..."
          className="button-primary disabled:cursor-wait disabled:opacity-70"
        />
      </div>
    </form>
  );
}

function RequestTextareaActionForm({
  action,
  fieldName,
  idleLabel,
  onSuccess,
  pendingLabel,
  placeholder,
  requestId,
  tone,
}: {
  action: (previousState: RequestMutationState, formData: FormData) => Promise<RequestMutationState>;
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
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-foreground">Comentario</span>
        <textarea
          name={fieldName}
          className="min-h-[130px] w-full rounded-[20px] border border-line bg-white px-4 py-3 text-sm leading-6 text-foreground outline-none focus:border-accent focus:shadow-[0_0_0_4px_rgba(15,77,93,0.08)]"
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
              ? "w-full rounded-full border border-red bg-white px-4 py-2.5 text-sm font-semibold text-red disabled:cursor-wait disabled:opacity-70"
              : "button-primary disabled:cursor-wait disabled:opacity-70"
          }
        />
      </div>
    </form>
  );
}

function StartRequestInlineAction({
  requestId,
}: {
  requestId: string;
}) {
  const [state, formAction] = useActionState(startRequestStateAction, initialMutationState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="requestId" value={requestId} />
      <SubmitButton
        idleLabel="Iniciar trabajo"
        pendingLabel="Actualizando..."
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
    <p className="rounded-[16px] border border-red/18 bg-red-soft px-4 py-3 text-sm leading-6 text-red">
      {state.message}
    </p>
  );
}

function ModalShell({
  children,
  maxWidthClass,
  onClose,
  zIndexClass = "z-[60]",
}: {
  children: ReactNode;
  maxWidthClass: string;
  onClose: () => void;
  zIndexClass?: string;
}) {
  return (
    <div className={`fixed inset-0 ${zIndexClass} flex items-center justify-center px-4 py-6`}>
      <button
        type="button"
        aria-label="Cerrar modal"
        className="absolute inset-0 bg-[#0f1720]/55 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className={`relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[28px] border border-line bg-white/96 shadow-[0_32px_80px_rgba(15,23,32,0.24)] ${maxWidthClass}`}
      >
        {children}
      </div>
    </div>
  );
}

function ActionModalHeader({
  title,
  description,
  onClose,
}: {
  title: string;
  description: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
      <div>
        <p className="section-label">Seguimiento</p>
        <h3 className="panel-title mt-2">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate">{description}</p>
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
      <p className="mt-2 text-sm font-semibold leading-6 text-foreground">{value}</p>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-panel-muted/80">
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-300"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function priorityLabel(priority?: RequestPriority) {
  return priority ? requestPriorityLabels[priority] : "Media";
}

function priorityTone(priority?: RequestPriority) {
  if (priority === "Alta") {
    return "red" as const;
  }

  if (priority === "Baja") {
    return "green" as const;
  }

  return "amber" as const;
}

function responsibilityTone(role: ResponsibilityRole) {
  switch (role) {
    case "EDITOR":
      return "accent" as const;
    case "REQUESTER":
      return "amber" as const;
    default:
      return "slate" as const;
  }
}

function waitingTone(reason: WaitingReason) {
  if (reason === "NONE") {
    return "green" as const;
  }

  if (reason === "WAITING_REQUESTER_INFO") {
    return "amber" as const;
  }

  return "slate" as const;
}

function buildBoardTabs(
  requests: RequestDetailRecord[],
  currentUser: Pick<SessionUser, "id" | "role">,
): BoardTab[] {
  const mineRequests =
    currentUser.role === "READER"
      ? requests
      : requests.filter((request) => request.assignedEditor?.id === currentUser.id);

  return [
    {
      id: "active",
      label: "Activas",
      description: "Solicitudes en trabajo, revision, aprobacion o publicacion.",
      emptyMessage: "No hay solicitudes activas en este momento.",
      requests: requests.filter((request) => activeWorkflowStatuses.includes(request.status)),
    },
    {
      id: "mine",
      label: currentUser.role === "READER" ? "Mis solicitudes" : "Mis asignadas",
      description:
        currentUser.role === "READER"
          ? "Solicitudes registradas por el solicitante autenticado."
          : "Solicitudes asignadas al editor autenticado.",
      emptyMessage:
        currentUser.role === "READER"
          ? "No tienes solicitudes registradas."
          : "No tienes solicitudes asignadas.",
      requests: mineRequests,
    },
    {
      id: "pending",
      label: "Pendientes",
      description: "Solicitudes que aun no tienen asignacion o no han arrancado el trabajo.",
      emptyMessage: "No hay solicitudes pendientes por atender.",
      requests: requests.filter(
        (request) => request.status === "PENDING_ASSIGNMENT" || request.status === "ASSIGNED",
      ),
    },
    {
      id: "closed",
      label: "Cerradas",
      description: "Solicitudes con cierre formal registrado.",
      emptyMessage: "No hay solicitudes cerradas.",
      requests: requests.filter((request) => request.status === "CLOSED"),
    },
    {
      id: "cancelled",
      label: "Canceladas",
      description: "Solicitudes canceladas con justificacion registrada.",
      emptyMessage: "No hay solicitudes canceladas.",
      requests: requests.filter((request) => request.status === "CANCELLED"),
    },
  ];
}
