'use client';

import type { ReactNode } from "react";
import { useActionState, useDeferredValue, useEffect, useState } from "react";

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
  RequestActivityRecord,
  EditorOptionRecord,
  RequestDetailRecord,
  RequestPriority,
  RequestTrackingStageRecord,
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
type DetailTabId = "summary" | "content" | "tracking" | "history";
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

type RequestActionKind = ActionModalKind | "start";
type RequestActionGroup = "operational" | "tracking" | "critical";
type RequestActionTone = "default" | "primary" | "danger";
type RequestActionInteraction = "modal" | "submit";

type RequestActionDefinition = {
  group: RequestActionGroup;
  interaction: RequestActionInteraction;
  isVisible: boolean;
  kind: RequestActionKind;
  label: string;
  tone: RequestActionTone;
};

type RequestStageVisitRecord = {
  activities: RequestActivityRecord[];
  durationLabel: string;
  endedAt?: string;
  endedAtMs?: number;
  durationMs: number;
  lastActivityAt: string;
  lastActivityAtMs: number;
  stage: RequestTrackingStageRecord;
  startedAt: string;
  startedAtMs: number;
  visitNumber: number;
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
  const [actionsRequestId, setActionsRequestId] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<ActionModalState | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const modalOpen = Boolean(detailRequestId || actionsRequestId || actionModal);

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

      if (actionsRequestId) {
        setActionsRequestId(null);
        return;
      }

      setDetailRequestId(null);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [actionModal, actionsRequestId, detailRequestId]);

  const currentTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const selectedRequest = detailRequestId
    ? requests.find((request) => request.id === detailRequestId) ?? null
    : null;
  const selectedActionsRequest = actionsRequestId
    ? requests.find((request) => request.id === actionsRequestId) ?? null
    : null;
  const selectedActionRequest = actionModal
    ? requests.find((request) => request.id === actionModal.requestId) ?? null
    : null;
  const openActionModal = (requestId: string, kind: ActionModalKind) => {
    setActionModal({
      kind,
      requestId,
    });
  };
  const openActionsPanel = (requestId: string) => {
    setActionsRequestId(requestId);
  };

  return (
    <>
      <section className="space-y-4">
        <div className="rounded-[20px] border border-line bg-accent/5 px-5 py-4">
          <p className="text-sm font-semibold text-foreground">Como operar el seguimiento</p>
          <p className="mt-2 text-sm leading-6 text-slate">
            Usa <span className="font-semibold text-foreground">Ver detalle</span> para consultar
            la solicitud y <span className="font-semibold text-foreground">Acciones</span> para
            ejecutar cambios operativos sin abrir el modal principal.
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
              setActionsRequestId(null);
              setActionModal(null);
            }}
            onOpenActions={(requestId) => {
              setDetailRequestId(null);
              setActionModal(null);
              openActionsPanel(requestId);
            }}
            requests={currentTab.requests}
          />
        </div>
      </section>

      {selectedRequest ? (
        <RequestDetailModal
          key={selectedRequest.id}
          onClose={() => {
            setDetailRequestId(null);
            setActionsRequestId(null);
            setActionModal(null);
          }}
          onOpenActions={() => openActionsPanel(selectedRequest.id)}
          request={selectedRequest}
        />
      ) : null}

      {selectedActionsRequest ? (
        <RequestActionsModal
          actions={getRequestAvailableActions({
            canAssignRequests,
            currentUser,
            request: selectedActionsRequest,
          })}
          onClose={() => setActionsRequestId(null)}
          onOpenAction={(kind) => {
            setActionsRequestId(null);
            openActionModal(selectedActionsRequest.id, kind);
          }}
          request={selectedActionsRequest}
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
  onOpenActions,
  requests,
}: {
  currentUserRole: SessionUser["role"];
  emptyMessage: string;
  onOpenDetail: (requestId: string) => void;
  onOpenActions: (requestId: string) => void;
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
            <th className="sticky right-0 z-10 bg-panel-muted/45 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate shadow-[-10px_0_18px_rgba(15,23,32,0.05)]">
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
                    <InfoStatusChip text="Responsable actual" tone={responsibilityTone(request.currentResponsibilityRole)}>
                      {responsibilityRoleLabels[request.currentResponsibilityRole]}
                    </InfoStatusChip>
                    {request.waitingReason !== "NONE" ? (
                      <InfoStatusChip text="Estado de espera" tone={waitingTone(request.waitingReason)}>
                        {waitingReasonLabels[request.waitingReason]}
                      </InfoStatusChip>
                    ) : null}
                  </div>
                  <p className="text-sm leading-6 text-slate">
                    {request.currentActivityName || "Sin etapa activa"}
                  </p>
                </div>
              </td>
              <td className="px-5 py-4 align-top">
                <div className="flex flex-wrap gap-2">
                  <InfoStatusChip text="Estado actual" tone={workflowTone(workflowStatusLabels[request.status])}>
                    {workflowStatusLabels[request.status]}
                  </InfoStatusChip>
                  {request.hasPendingCancellation ? (
                    <InfoStatusChip text="Estado de cancelacion" tone="red">
                      Cancelacion pendiente
                    </InfoStatusChip>
                  ) : null}
                  <InfoStatusChip text="Prioridad" tone={priorityTone(request.priority)}>
                    {priorityLabel(request.priority)}
                  </InfoStatusChip>
                </div>
              </td>
              <td className="px-5 py-4 align-top text-sm leading-6 text-slate">
                {request.updatedAt}
              </td>
              <td className="sticky right-0 z-[1] bg-white px-5 py-4 align-top shadow-[-10px_0_18px_rgba(15,23,32,0.05)]">
                <div className="flex min-w-[188px] flex-col items-stretch gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenDetail(request.id)}
                    className="button-secondary"
                  >
                    Ver detalle
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenActions(request.id)}
                    className="button-secondary"
                  >
                    Acciones
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RequestDetailModal({
  onClose,
  onOpenActions,
  request,
}: {
  onClose: () => void;
  onOpenActions: () => void;
  request: RequestDetailRecord;
}) {
  const [activeTab, setActiveTab] = useState<DetailTabId>("summary");

  return (
    <ModalShell maxWidthClass="max-w-[1240px]" onClose={onClose}>
      <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
        <div className="min-w-0">
          <p className="section-label">Solicitud {request.code}</p>
          <h2 className="panel-title mt-2">{request.title}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <TooltipBadge text="Estado actual">
              <StatusChip tone={workflowTone(workflowStatusLabels[request.status])}>
                {workflowStatusLabels[request.status]}
              </StatusChip>
            </TooltipBadge>
            {request.hasPendingCancellation ? (
              <TooltipBadge text="Estado de cancelacion">
                <StatusChip tone="red">Cancelacion pendiente</StatusChip>
              </TooltipBadge>
            ) : null}
            <TooltipBadge text="Prioridad">
              <StatusChip tone={priorityTone(request.priority)}>{priorityLabel(request.priority)}</StatusChip>
            </TooltipBadge>
            <TooltipBadge text="Tipo de solicitud">
              <StatusChip tone="slate">{requestTypeLabels[request.requestType]}</StatusChip>
            </TooltipBadge>
            <TooltipBadge text="Responsable actual">
              <StatusChip tone={responsibilityTone(request.currentResponsibilityRole)}>
                {responsibilityRoleLabels[request.currentResponsibilityRole]}
              </StatusChip>
            </TooltipBadge>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" className="button-secondary" onClick={onOpenActions}>
            Acciones
          </button>
          <button type="button" className="button-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>

      <div className="border-b border-line px-6 py-4">
        <div className="flex flex-wrap gap-2">
          {detailTabs.map((tab) => {
            const isActive = tab.id === activeTab;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={isActive ? "button-primary" : "button-secondary"}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="subtle-scroll min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {activeTab === "summary" ? <RequestSummaryTab request={request} /> : null}
        {activeTab === "content" ? <RequestContentTab request={request} /> : null}
        {activeTab === "tracking" ? <RequestTrackingTab request={request} /> : null}
        {activeTab === "history" ? <RequestHistoryTab request={request} /> : null}
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
  className = "button-secondary w-full disabled:cursor-wait disabled:opacity-70",
  onSuccess,
  requestId,
}: {
  className?: string;
  onSuccess?: () => void;
  requestId: string;
}) {
  const [state, formAction] = useActionState(startRequestStateAction, initialMutationState);

  useEffect(() => {
    if (state.status === "success") {
      onSuccess?.();
    }
  }, [onSuccess, state.status]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="requestId" value={requestId} />
      <SubmitButton
        idleLabel="Iniciar trabajo"
        pendingLabel="Actualizando..."
        className={className}
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

const detailTabs: Array<{ id: DetailTabId; label: string }> = [
  { id: "summary", label: "Resumen" },
  { id: "content", label: "Contenido" },
  { id: "tracking", label: "Seguimiento" },
  { id: "history", label: "Historial" },
];

const actionGroupLabels: Record<RequestActionGroup, string> = {
  operational: "Operativas",
  tracking: "Seguimiento",
  critical: "Criticas",
};

function RequestActionsModal({
  actions,
  onClose,
  onOpenAction,
  request,
}: {
  actions: RequestActionDefinition[];
  onClose: () => void;
  onOpenAction: (kind: ActionModalKind) => void;
  request: RequestDetailRecord;
}) {
  const groupedActions = groupRequestActions(actions);

  return (
    <ModalShell maxWidthClass="max-w-[560px]" onClose={onClose} zIndexClass="z-[70]">
      <div className="border-b border-line px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="section-label">Acciones disponibles</p>
            <h3 className="panel-title mt-2">{request.code}</h3>
            <p className="mt-2 text-sm leading-6 text-slate">
              {request.title}
            </p>
          </div>
          <button type="button" className="button-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>

      <div className="subtle-scroll overflow-y-auto px-6 py-5">
        {groupedActions.length > 0 ? (
          <div className="space-y-5">
            {groupedActions.map((group) => (
              <section key={group.group} className="rounded-[22px] border border-line bg-white/86 p-4">
                <p className="section-label">{actionGroupLabels[group.group]}</p>
                <div className="mt-3 space-y-3">
                  {group.actions.map((action) =>
                    action.interaction === "submit" ? (
                      <StartRequestInlineAction
                        key={action.kind}
                        className={actionButtonClassName(action.tone)}
                        onSuccess={onClose}
                        requestId={request.id}
                      />
                    ) : (
                      <button
                        key={action.kind}
                        type="button"
                        className={actionButtonClassName(action.tone)}
                        onClick={() => onOpenAction(action.kind as ActionModalKind)}
                      >
                        {action.label}
                      </button>
                    ),
                  )}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="rounded-[22px] border border-line bg-panel-muted/45 px-4 py-4">
            <p className="text-sm leading-6 text-slate">
              No hay acciones operativas disponibles para esta solicitud en su estado actual.
            </p>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

function RequestSummaryTab({ request }: { request: RequestDetailRecord }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_360px]">
      <div className="space-y-4">
        <section className="rounded-[20px] border border-line bg-white/82 p-4">
          <p className="section-label">Resumen operativo</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetadataItem label="Solicitante" value={request.requester?.name || "Sin usuario"} />
            <MetadataItem
              label="Capturada por"
              value={request.createdBy?.name || request.requester?.name || "Sin usuario"}
            />
            <MetadataItem
              label="Responsable actual"
              value={responsibilityRoleLabels[request.currentResponsibilityRole]}
            />
            <MetadataItem label="Creada" value={request.createdAt} />
            <MetadataItem label="Actualizada" value={request.updatedAt} />
            <MetadataItem label="Inicio formal" value={request.startedAt || "Pendiente"} />
          </div>
        </section>

        <section className="rounded-[20px] border border-line bg-white/82 p-4">
          <p className="section-label">Contexto</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetadataItem
              label="Estado actual"
              value={
                <div className="flex flex-wrap items-center gap-2">
                  <span>{workflowStatusLabels[request.status]}</span>
                  {request.hasPendingCancellation ? (
                    <InfoStatusChip text="Estado de cancelacion" tone="red">
                      Cancelacion pendiente
                    </InfoStatusChip>
                  ) : null}
                </div>
              }
            />
            <MetadataItem label="Prioridad" value={priorityLabel(request.priority)} />
            <MetadataItem label="Tipo de solicitud" value={requestTypeLabels[request.requestType]} />
            <MetadataItem
              label="Responsable actual"
              value={responsibilityRoleLabels[request.currentResponsibilityRole]}
            />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <MetadataItem label="Area solicitante" value={request.requesterArea || "Sin area"} />
            <MetadataItem label="Fecha requerida" value={request.requiredDate || "Sin fecha"} />
            <MetadataItem label="Fase actual" value={request.currentPhaseName || "Sin fase"} />
            <MetadataItem label="Etapa actual" value={request.currentActivityName || "Sin etapa"} />
          </div>
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
              <InfoStatusChip text="Estado de asignacion" tone="slate">
                Sin asignar
              </InfoStatusChip>
              <p>Aun no se ha designado editor responsable.</p>
            </div>
          )}
        </section>

        <section className="rounded-[20px] border border-line bg-white/82 p-4">
          <p className="section-label">Lectura rapida</p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate">
            <div className="rounded-[18px] border border-line bg-panel-muted/45 px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate">
                Progreso acumulado
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                {request.progressPercent}%
              </p>
              <div className="mt-3">
                <ProgressBar value={request.progressPercent} />
              </div>
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
          </div>
        </section>
      </aside>
    </div>
  );
}

function RequestContentTab({ request }: { request: RequestDetailRecord }) {
  return (
    <div className="space-y-4">
      <section className="rounded-[20px] border border-line bg-white/82 p-4">
        <p className="section-label">Descripcion</p>
        <p className="mt-3 text-sm leading-7 text-slate">{request.description}</p>
        <p className="section-label mt-5">Justificacion</p>
        <p className="mt-3 text-sm leading-7 text-slate">
          {request.justification || "Sin justificacion registrada."}
        </p>
      </section>

      <section className="rounded-[20px] border border-line bg-white/82 p-4">
        <p className="section-label">Soporte documental</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <MetadataItem label="Proceso sugerido" value={request.process?.label || "Sin proceso sugerido"} />
          <MetadataItem
            label="Tipo documental"
            value={request.documentType?.label || "Sin tipo sugerido"}
          />
        </div>
      </section>

      <RequestAttachmentsSection request={request} />
    </div>
  );
}

function RequestTrackingTab({ request }: { request: RequestDetailRecord }) {
  const [selectedStageCode, setSelectedStageCode] = useState<string | null>(null);
  const stageVisits = buildRequestStageVisits(request);
  const stageMetrics = buildCurrentStageMetrics(request, stageVisits);
  const selectedStage = selectedStageCode
    ? request.stageCatalog.find((stage) => stage.code === selectedStageCode) ?? null
    : null;
  const selectedStageVisits = selectedStageCode
    ? stageVisits.filter((visit) => visit.stage.code === selectedStageCode)
    : [];

  return (
    <>
      <div className="space-y-4">
        <section className="rounded-[20px] border border-line bg-white/82 p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="section-label">Seguimiento objetivo</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                {request.progressPercent}%
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate">
                {request.currentPhaseName || "Sin fase activa"} -{" "}
                {request.currentActivityName || "Sin etapa activa"}
              </p>
              {request.currentActivityDescription ? (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate">
                  {request.currentActivityDescription}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <TooltipBadge text="Responsable actual">
                <StatusChip tone={responsibilityTone(request.currentResponsibilityRole)}>
                  {responsibilityRoleLabels[request.currentResponsibilityRole]}
                </StatusChip>
              </TooltipBadge>
              <TooltipBadge text="Estado de espera">
                <StatusChip tone={waitingTone(request.waitingReason)}>
                  {waitingReasonLabels[request.waitingReason]}
                </StatusChip>
              </TooltipBadge>
            </div>
          </div>

          <div className="mt-4">
            <ProgressBar value={request.progressPercent} />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetadataItem
              label="Etapa actual"
              value={
                request.currentActivityCode
                  ? `${request.currentActivityCode} - ${request.currentActivityName || "Sin nombre"}`
                  : "Sin etapa activa"
              }
            />
            <MetadataItem label="Tiempo en etapa actual" value={stageMetrics.currentVisitElapsedLabel} />
            <MetadataItem label="Tiempo desde ultimo cambio" value={stageMetrics.timeSinceLastChangeLabel} />
            <MetadataItem label="Tiempo total en etapa" value={stageMetrics.totalStageElapsedLabel} />
            <MetadataItem label="Eventos en etapa" value={String(stageMetrics.eventsInStage)} />
            <MetadataItem label="Visitas a etapa" value={String(stageMetrics.visitsInStage)} />
            <MetadataItem label="Tiempo total del seguimiento" value={request.totalElapsedLabel} />
          </div>
        </section>

        <section className="rounded-[20px] border border-line bg-white/82 p-4">
          <p className="section-label">Control del flujo</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetadataItem
              label="Responsable actual"
              value={responsibilityRoleLabels[request.currentResponsibilityRole]}
            />
            <MetadataItem label="Motivo de espera" value={waitingReasonLabels[request.waitingReason]} />
            <MetadataItem
              label="Ultima respuesta del solicitante"
              value={request.lastRequesterResponseAt || "Sin registro"}
            />
          </div>
          {request.waitingSince ? (
            <p className="mt-3 text-sm leading-6 text-slate">En espera desde {request.waitingSince}</p>
          ) : null}
          {request.hasPendingCancellation ? (
            <div className="mt-4 rounded-[18px] border border-red/18 bg-red-soft px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red">
                Cancelacion pendiente
              </p>
              <p className="mt-2 font-semibold text-foreground">
                Solicitada por {request.cancellationRequestedBy?.name || "Usuario no resuelto"}
              </p>
              {request.cancellationRequestedAt ? (
                <p className="mt-1 text-sm leading-6 text-slate">
                  Registrada el {request.cancellationRequestedAt}
                </p>
              ) : null}
              <p className="mt-3 text-sm leading-6 text-slate">
                {request.cancellationRequestReason || "Sin justificacion registrada."}
              </p>
            </div>
          ) : null}
        </section>

        <section className="rounded-[20px] border border-line bg-white/82 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-label">Matriz de seguimiento</p>
              <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-foreground">
                Catalogo maestro de etapas
              </h3>
            </div>
            <InfoStatusChip text="Etapa vigente" tone="slate">
              Etapa vigente: {request.currentActivityCode || "Sin etapa"}
            </InfoStatusChip>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate">
            Haz clic en una etapa para revisar el historial registrado dentro de esa fase.
          </p>
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
                      onClick={() => setSelectedStageCode(stage.code)}
                      className={`cursor-pointer border-b border-line transition-colors hover:bg-panel-muted/35 ${
                        isCurrent ? "bg-accent/6" : ""
                      }`}
                    >
                      <td className="px-3 py-3 align-top text-slate">{stage.phaseName}</td>
                      <td className="px-3 py-3 align-top">
                        <p className="font-semibold text-foreground">
                          {stage.code} - {stage.activityName}
                        </p>
                      </td>
                      <td className="px-3 py-3 align-top text-slate">
                        {stage.description || "Sin descripcion"}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <InfoStatusChip text="Avance de la etapa" tone={isCurrent ? "accent" : "slate"}>
                          {stage.progressPercent}%
                        </InfoStatusChip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {selectedStage ? (
        <RequestStageHistoryModal
          onClose={() => setSelectedStageCode(null)}
          stage={selectedStage}
          visits={selectedStageVisits}
        />
      ) : null}
    </>
  );
}

function RequestStageHistoryModal({
  onClose,
  stage,
  visits,
}: {
  onClose: () => void;
  stage: RequestTrackingStageRecord;
  visits: RequestStageVisitRecord[];
}) {
  return (
    <ModalShell maxWidthClass="max-w-[760px]" onClose={onClose} zIndexClass="z-[70]">
      <div className="border-b border-line px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="section-label">Historial por etapa</p>
            <h3 className="panel-title mt-2">
              {stage.code} - {stage.activityName}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate">
              {stage.phaseName} · {String(visits.length).padStart(2, "0")} visita(s) registradas
            </p>
          </div>
          <button type="button" className="button-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>

      <div className="subtle-scroll overflow-y-auto px-6 py-5">
        {visits.length === 0 ? (
          <div className="rounded-[20px] border border-line bg-panel-muted/45 px-4 py-4">
            <p className="text-sm leading-6 text-slate">
              Aun no hay movimientos registrados para esta etapa.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visits.map((visit) => (
              <section key={`${visit.stage.code}-${visit.visitNumber}`} className="rounded-[20px] border border-line bg-white/86 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="section-label">Visita {visit.visitNumber}</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-foreground">
                      Ingreso: {visit.startedAt}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate">
                      {visit.endedAt ? `Salida: ${visit.endedAt}` : "Etapa actualmente vigente"}
                    </p>
                  </div>
                  <InfoStatusChip text="Tiempo acumulado en esta visita" tone="slate">
                    {visit.durationLabel}
                  </InfoStatusChip>
                </div>

                <div className="mt-4 space-y-3">
                  {visit.activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="rounded-[18px] border border-line bg-panel-muted/45 px-4 py-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <InfoStatusChip text="Tipo de evento" tone="accent">
                          {requestActivityLabels[activity.type]}
                        </InfoStatusChip>
                        {activity.responsibilityRole ? (
                          <InfoStatusChip
                            text="Responsable actual"
                            tone={responsibilityTone(activity.responsibilityRole)}
                          >
                            {responsibilityRoleLabels[activity.responsibilityRole]}
                          </InfoStatusChip>
                        ) : null}
                        {activity.waitingReason ? (
                          <InfoStatusChip text="Estado de espera" tone={waitingTone(activity.waitingReason)}>
                            {waitingReasonLabels[activity.waitingReason]}
                          </InfoStatusChip>
                        ) : null}
                        {activity.statusAfter ? (
                          <InfoStatusChip
                            text="Estado resultante"
                            tone={workflowTone(workflowStatusLabels[activity.statusAfter])}
                          >
                            {workflowStatusLabels[activity.statusAfter]}
                          </InfoStatusChip>
                        ) : null}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-foreground">
                        {activity.note || "Movimiento registrado sin comentario adicional."}
                      </p>
                      <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-slate">
                        {activity.actor?.name || "Sistema"} - {activity.createdAt}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </ModalShell>
  );
}

function RequestHistoryTab({ request }: { request: RequestDetailRecord }) {
  const [keywordFilter, setKeywordFilter] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const deferredKeywordFilter = useDeferredValue(keywordFilter);
  const normalizedKeywordFilter = normalizeSearchValue(deferredKeywordFilter);
  const hasActiveFilters = Boolean(normalizedKeywordFilter || dateFromFilter || dateToFilter);
  const lastActivity = request.activities[0];

  const filteredActivities = request.activities.filter((activity) => {
    const activityDateKey = formatDateKeyInMexicoCity(activity.createdAtMs);

    if (dateFromFilter && activityDateKey < dateFromFilter) {
      return false;
    }

    if (dateToFilter && activityDateKey > dateToFilter) {
      return false;
    }

    if (!normalizedKeywordFilter) {
      return true;
    }

    return buildHistoryActivitySearchValue(activity).includes(normalizedKeywordFilter);
  });

  return (
    <div className="space-y-4">
      <section className="rounded-[20px] border border-line bg-white/82 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="section-label">Historial</p>
            <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-foreground">
              Trazabilidad completa de la solicitud
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate">
              Revisa el inicio del requerimiento, el tiempo acumulado y filtra eventos por fecha o
              palabras clave.
            </p>
          </div>
          <InfoStatusChip text="Cantidad de eventos visibles" tone="slate">
            {String(filteredActivities.length).padStart(2, "0")} de{" "}
            {String(request.activities.length).padStart(2, "0")} eventos
          </InfoStatusChip>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetadataItem label="Solicitud registrada" value={request.createdAt} />
          <MetadataItem label="Inicio formal" value={request.startedAt || "Pendiente"} />
          <MetadataItem label="Tiempo total transcurrido" value={request.totalElapsedLabel} />
          <MetadataItem
            label="Ultimo movimiento"
            value={lastActivity ? `${lastActivity.createdAt} (${formatElapsedDuration(lastActivity.createdAtMs)})` : "Sin movimientos"}
          />
        </div>
      </section>

      <section className="rounded-[20px] border border-line bg-white/82 p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="section-label">Segmentacion</p>
            <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-foreground">
              Filtros del historial
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate">
              El rango de fechas se aplica sobre la fecha de cada evento del historial.
            </p>
          </div>
          <button
            type="button"
            className="button-ghost"
            onClick={() => {
              setKeywordFilter("");
              setDateFromFilter("");
              setDateToFilter("");
            }}
          >
            Limpiar filtros
          </button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,1fr))]">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-foreground">Palabras clave</span>
            <input
              type="search"
              className="field-input"
              placeholder="Actor, etapa, comentario, estado o tipo de evento"
              value={keywordFilter}
              onChange={(event) => setKeywordFilter(event.target.value)}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-foreground">Desde</span>
            <input
              type="date"
              className="field-input"
              value={dateFromFilter}
              onChange={(event) => setDateFromFilter(event.target.value)}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-foreground">Hasta</span>
            <input
              type="date"
              className="field-input"
              value={dateToFilter}
              onChange={(event) => setDateToFilter(event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="rounded-[20px] border border-line bg-white/82 p-4">
        {request.activities.length === 0 ? (
          <p className="text-sm leading-6 text-slate">
            Aun no hay movimientos registrados en esta solicitud.
          </p>
        ) : filteredActivities.length === 0 ? (
          <div className="rounded-[18px] border border-line bg-panel-muted/45 px-4 py-4">
            <p className="text-sm leading-6 text-slate">
              No hay eventos que coincidan con los filtros activos.
            </p>
            {hasActiveFilters ? (
              <p className="mt-2 text-sm leading-6 text-slate">
                Ajusta el rango de fechas o las palabras clave para ampliar la busqueda.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredActivities.map((activity) => (
              <div key={activity.id} className="rounded-[18px] border border-line bg-panel-muted/45 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <InfoStatusChip text="Tipo de evento" tone="accent">
                    {requestActivityLabels[activity.type]}
                  </InfoStatusChip>
                  {activity.trackingStage ? (
                    <InfoStatusChip text="Etapa registrada" tone="slate">
                      {activity.trackingStage.code} - {activity.trackingStage.progressPercent}%
                    </InfoStatusChip>
                  ) : null}
                  {activity.responsibilityRole ? (
                    <InfoStatusChip
                      text="Responsable actual"
                      tone={responsibilityTone(activity.responsibilityRole)}
                    >
                      {responsibilityRoleLabels[activity.responsibilityRole]}
                    </InfoStatusChip>
                  ) : null}
                  {activity.waitingReason && activity.waitingReason !== "NONE" ? (
                    <InfoStatusChip text="Estado de espera" tone={waitingTone(activity.waitingReason)}>
                      {waitingReasonLabels[activity.waitingReason]}
                    </InfoStatusChip>
                  ) : null}
                  {activity.statusAfter ? (
                    <InfoStatusChip
                      text="Estado resultante"
                      tone={workflowTone(workflowStatusLabels[activity.statusAfter])}
                    >
                      {workflowStatusLabels[activity.statusAfter]}
                    </InfoStatusChip>
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
  );
}

function RequestAttachmentsSection({ request }: { request: RequestDetailRecord }) {
  return (
    <section className="rounded-[20px] border border-line bg-white/82 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="section-label">Anexos de insumo</p>
        <InfoStatusChip text="Cantidad de archivos" tone="slate">
          {String(request.attachments.length).padStart(2, "0")} archivos
        </InfoStatusChip>
      </div>
      {request.attachments.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-slate">Esta solicitud no tiene anexos cargados.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {request.attachments.map((attachment) => (
            <div key={attachment.id} className="rounded-[18px] border border-line bg-panel-muted/45 px-4 py-4">
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
  );
}

function MetadataItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-[18px] border border-line bg-panel-muted/45 px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate">{label}</p>
      <div className="mt-2 text-sm font-semibold leading-6 text-foreground">{value}</div>
    </div>
  );
}

function TooltipBadge({
  children,
  text,
}: {
  children: ReactNode;
  text: string;
}) {
  return (
    <span className="group relative inline-flex items-center">
      <span aria-label={text}>
        {children}
      </span>
      <span className="pointer-events-none absolute bottom-[calc(100%+0.375rem)] left-1/2 z-10 hidden min-w-max max-w-[180px] -translate-x-1/2 whitespace-nowrap rounded-[10px] border border-line bg-white px-2.5 py-1.5 text-[11px] font-medium normal-case tracking-normal text-slate shadow-[0_10px_24px_rgba(15,23,32,0.12)] group-hover:block group-focus-within:block">
        {text}
      </span>
    </span>
  );
}

function InfoStatusChip({
  children,
  text,
  tone,
}: {
  children: ReactNode;
  text: string;
  tone: Parameters<typeof StatusChip>[0]["tone"];
}) {
  return (
    <TooltipBadge text={text}>
      <StatusChip tone={tone}>{children}</StatusChip>
    </TooltipBadge>
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

function getRequestAvailableActions({
  canAssignRequests,
  currentUser,
  request,
}: {
  canAssignRequests: boolean;
  currentUser: Pick<SessionUser, "id" | "role">;
  request: RequestDetailRecord;
}) {
  const isFinalStatus = request.status === "CLOSED" || request.status === "CANCELLED";
  const currentStage =
    request.stageCatalog.find((stage) => stage.code === request.currentActivityCode) ??
    request.stageCatalog[0];
  const hasStarted =
    Boolean(request.startedAt) || Boolean(currentStage && currentStage.sortOrder >= 40);
  const isAssignedEditor = request.assignedEditor?.id === currentUser.id;
  const isRequesterOwner = currentUser.role === "READER" && request.requester?.id === currentUser.id;
  const canManageAssignedRequest = currentUser.role === "ADMINISTRATOR" || isAssignedEditor;
  const canStartRequest =
    isAssignedEditor && request.status === "ASSIGNED" && !hasStarted && !request.hasPendingCancellation;
  const canUpdateTracking =
    canManageAssignedRequest && hasStarted && !isFinalStatus && !request.hasPendingCancellation;
  const canAddNote = canUpdateTracking;
  const canCloseRequest =
    canManageAssignedRequest && hasStarted && !isFinalStatus && !request.hasPendingCancellation;
  const canAssignOrReassign = canAssignRequests && !isFinalStatus && !request.hasPendingCancellation;
  const canRequestCancellation =
    !isFinalStatus &&
    !request.hasPendingCancellation &&
    request.status !== "OFFICIALIZED" &&
    (isAssignedEditor || isRequesterOwner);
  const canModerateCancellation =
    currentUser.role === "ADMINISTRATOR" && request.hasPendingCancellation && !isFinalStatus;

  const actions: RequestActionDefinition[] = [
    {
      group: "operational",
      interaction: "modal",
      isVisible: canAssignOrReassign,
      kind: "assign",
      label: request.assignedEditor ? "Reasignar solicitud" : "Asignar solicitud",
      tone: request.assignedEditor ? "default" : "primary",
    },
    {
      group: "tracking",
      interaction: "submit",
      isVisible: canStartRequest,
      kind: "start",
      label: "Iniciar trabajo",
      tone: "primary",
    },
    {
      group: "tracking",
      interaction: "modal",
      isVisible: canUpdateTracking,
      kind: "tracking",
      label: "Actualizar seguimiento",
      tone: "default",
    },
    {
      group: "tracking",
      interaction: "modal",
      isVisible: canAddNote,
      kind: "note",
      label: "Agregar nota",
      tone: "default",
    },
    {
      group: "critical",
      interaction: "modal",
      isVisible: canCloseRequest,
      kind: "close",
      label: "Cerrar solicitud",
      tone: "default",
    },
    {
      group: "critical",
      interaction: "modal",
      isVisible: canRequestCancellation,
      kind: "request-cancel",
      label: "Solicitar cancelacion",
      tone: "danger",
    },
    {
      group: "critical",
      interaction: "modal",
      isVisible: canModerateCancellation,
      kind: "approve-cancel",
      label: "Aprobar cancelacion",
      tone: "danger",
    },
    {
      group: "critical",
      interaction: "modal",
      isVisible: canModerateCancellation,
      kind: "reject-cancel",
      label: "Rechazar cancelacion",
      tone: "default",
    },
  ];

  return actions.filter((action) => action.isVisible);
}

function groupRequestActions(actions: RequestActionDefinition[]) {
  return (["operational", "tracking", "critical"] as const)
    .map((group) => ({
      actions: actions.filter((action) => action.group === group),
      group,
    }))
    .filter((group) => group.actions.length > 0);
}

function actionButtonClassName(tone: RequestActionTone) {
  if (tone === "primary") {
    return "button-primary w-full";
  }

  if (tone === "danger") {
    return "w-full rounded-full border border-red bg-white px-4 py-2.5 text-sm font-semibold text-red hover:bg-red-soft/70";
  }

  return "button-secondary w-full";
}

function buildRequestStageVisits(request: RequestDetailRecord) {
  const chronologicalActivities = request.activities
    .filter((activity) => activity.trackingStage)
    .sort((left, right) => left.createdAtMs - right.createdAtMs);
  const visits: RequestStageVisitRecord[] = [];

  let currentVisit:
    | {
        activities: RequestActivityRecord[];
        stage: RequestTrackingStageRecord;
        startedAt: string;
        startedAtMs: number;
      }
    | null = null;

  for (let index = 0; index < chronologicalActivities.length; index += 1) {
    const activity = chronologicalActivities[index];
    const stage = activity.trackingStage;

    if (!stage) {
      continue;
    }

    if (!currentVisit || currentVisit.stage.code !== stage.code) {
      if (currentVisit) {
        const nextActivity = activity;
        const visitStageCode = currentVisit.stage.code;

        visits.push({
          activities: currentVisit.activities,
          durationLabel: formatElapsedDuration(
            currentVisit.startedAtMs,
            nextActivity.createdAtMs,
          ),
          endedAt: nextActivity.createdAt,
          endedAtMs: nextActivity.createdAtMs,
          durationMs: Math.max(nextActivity.createdAtMs - currentVisit.startedAtMs, 0),
          lastActivityAt:
            currentVisit.activities[currentVisit.activities.length - 1]?.createdAt || currentVisit.startedAt,
          lastActivityAtMs:
            currentVisit.activities[currentVisit.activities.length - 1]?.createdAtMs ||
            currentVisit.startedAtMs,
          stage: currentVisit.stage,
          startedAt: currentVisit.startedAt,
          startedAtMs: currentVisit.startedAtMs,
          visitNumber:
            visits.filter((visit) => visit.stage.code === visitStageCode).length + 1,
        });
      }

      currentVisit = {
        activities: [activity],
        stage,
        startedAt: activity.createdAt,
        startedAtMs: activity.createdAtMs,
      };

      continue;
    }

    currentVisit.activities.push(activity);

    if (index === chronologicalActivities.length - 1) {
      const visitStageCode = currentVisit.stage.code;

      visits.push({
        activities: currentVisit.activities,
        durationLabel: formatElapsedDuration(currentVisit.startedAtMs),
        durationMs: Math.max(Date.now() - currentVisit.startedAtMs, 0),
        lastActivityAt:
          currentVisit.activities[currentVisit.activities.length - 1]?.createdAt || currentVisit.startedAt,
        lastActivityAtMs:
          currentVisit.activities[currentVisit.activities.length - 1]?.createdAtMs ||
          currentVisit.startedAtMs,
        stage: currentVisit.stage,
        startedAt: currentVisit.startedAt,
        startedAtMs: currentVisit.startedAtMs,
        visitNumber:
          visits.filter((visit) => visit.stage.code === visitStageCode).length + 1,
      });
      currentVisit = null;
    }
  }

  if (currentVisit) {
    visits.push({
      activities: currentVisit.activities,
      durationLabel: formatElapsedDuration(currentVisit.startedAtMs),
      durationMs: Math.max(Date.now() - currentVisit.startedAtMs, 0),
      lastActivityAt:
        currentVisit.activities[currentVisit.activities.length - 1]?.createdAt || currentVisit.startedAt,
      lastActivityAtMs:
        currentVisit.activities[currentVisit.activities.length - 1]?.createdAtMs ||
        currentVisit.startedAtMs,
      stage: currentVisit.stage,
      startedAt: currentVisit.startedAt,
      startedAtMs: currentVisit.startedAtMs,
      visitNumber:
        visits.filter((visit) => visit.stage.code === currentVisit.stage.code).length + 1,
    });
  }

  return visits;
}

function formatElapsedDuration(startedAtMs: number, endedAtMs = Date.now()) {
  const diffMs = Math.max(endedAtMs - startedAtMs, 0);
  return formatElapsedDurationFromMs(diffMs);
}

function formatElapsedDurationFromMs(diffMs: number) {
  const totalMinutes = Math.floor(diffMs / 60000);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days} dia${days === 1 ? "" : "s"} ${hours} h`;
  }

  if (totalHours > 0) {
    return `${totalHours} h ${minutes} min`;
  }

  return `${Math.max(totalMinutes, 1)} min`;
}

function buildHistoryActivitySearchValue(activity: RequestActivityRecord) {
  return normalizeSearchValue(
    [
      requestActivityLabels[activity.type],
      activity.actor?.name || "Sistema",
      activity.note || "",
      activity.createdAt,
      activity.trackingStage?.code || "",
      activity.trackingStage?.activityName || "",
      activity.statusAfter ? workflowStatusLabels[activity.statusAfter] : "",
      activity.responsibilityRole ? responsibilityRoleLabels[activity.responsibilityRole] : "",
      activity.waitingReason ? waitingReasonLabels[activity.waitingReason] : "",
    ].join(" "),
  );
}

function formatDateKeyInMexicoCity(dateMs: number) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Mexico_City",
    year: "numeric",
  });
  const parts = formatter.formatToParts(new Date(dateMs));
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

function buildCurrentStageMetrics(
  request: RequestDetailRecord,
  stageVisits: RequestStageVisitRecord[],
) {
  const currentStageCode = request.currentActivityCode;
  const currentStageVisits = currentStageCode
    ? stageVisits.filter((visit) => visit.stage.code === currentStageCode)
    : [];
  const currentVisit =
    currentStageVisits.length > 0 ? currentStageVisits[currentStageVisits.length - 1] : null;
  const totalStageDurationMs = currentStageVisits.reduce((sum, visit) => sum + visit.durationMs, 0);
  const eventsInStage = currentStageVisits.reduce((sum, visit) => sum + visit.activities.length, 0);

  return {
    currentVisitElapsedLabel: currentVisit
      ? formatElapsedDuration(currentVisit.startedAtMs)
      : "Sin dato",
    eventsInStage,
    timeSinceLastChangeLabel: currentVisit
      ? formatElapsedDuration(currentVisit.lastActivityAtMs)
      : "Sin dato",
    totalStageElapsedLabel:
      totalStageDurationMs > 0 ? formatElapsedDurationFromMs(totalStageDurationMs) : "Sin dato",
    visitsInStage: currentStageVisits.length,
  };
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
