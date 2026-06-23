'use client';

import { useActionState, useDeferredValue, useEffect, useState } from "react";

import {
  addReviewCommentStateAction,
  createDraftFromRequestStateAction,
  type ReviewMutationState,
  officializeVersionStateAction,
  recordReviewDecisionStateAction,
  replaceDraftFileStateAction,
  resolveReviewCommentStateAction,
  submitVersionForReviewStateAction,
} from "@/app/(workspace)/reviews/actions";
import { FilePreviewDialog } from "@/components/file-preview-dialog";
import { SubmitButton } from "@/components/submit-button";
import { StatusChip, workflowTone } from "@/components/status-chip";
import type { SessionUser } from "@/lib/auth/types";
import {
  documentStateLabels,
  documentVersionStatusLabels,
  draftCommentStatusLabels,
  draftCommentTypeLabels,
  requestTypeLabels,
  reviewAssignmentRoleLabels,
  reviewDecisionLabels,
  reviewRoundStatusLabels,
  versionChangeKindLabels,
  workflowStatusLabels,
} from "@/lib/presenters";
import type {
  ReviewAssignmentRecord,
  ReviewDraftCommentRecord,
  ReviewRequestCandidateRecord,
  ReviewRoundRecord,
  ReviewsWorkspaceSnapshot,
  ReviewUserOptionRecord,
  ReviewWorkItemRecord,
} from "@/lib/types";

const initialMutationState: ReviewMutationState = {
  status: "idle",
};

export function ReviewsWorkspace({
  currentUser,
  snapshot,
}: {
  currentUser: Pick<SessionUser, "id" | "role">;
  snapshot: ReviewsWorkspaceSnapshot;
}) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    snapshot.workItems[0]?.versionId ?? null,
  );
  const [draftModalRequestId, setDraftModalRequestId] = useState<string | null>(null);

  const filteredWorkItems = snapshot.workItems.filter((item) =>
    buildWorkItemSearchValue(item).includes(normalizeSearchValue(deferredSearch)),
  );
  const selectedItem =
    filteredWorkItems.find((item) => item.versionId === selectedVersionId) ??
    snapshot.workItems.find((item) => item.versionId === selectedVersionId) ??
    filteredWorkItems[0] ??
    null;

  const metrics = buildWorkspaceMetrics(snapshot);

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="surface-card-compact p-5">
            <p className="section-label">{metric.label}</p>
            <div className="mt-4 flex items-end justify-between gap-4">
              <strong className="text-[2.7rem] font-semibold tracking-[-0.08em] text-foreground">
                {metric.value}
              </strong>
              <StatusChip tone={metric.tone}>{metric.detail}</StatusChip>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <article className="surface-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="section-label">Ingreso al flujo</p>
                <h2 className="panel-title mt-2">Solicitudes listas para borrador</h2>
                <p className="mt-3 text-sm leading-6 text-slate">
                  Solo aparecen solicitudes que ya alcanzaron la etapa 3.1 para convertirlas en
                  borradores documentales e iniciar su revision formal.
                </p>
              </div>
              {snapshot.canCreateDraft ? (
                <button
                  type="button"
                  className="button-primary"
                  onClick={() => setDraftModalRequestId(snapshot.requestCandidates[0]?.id ?? "__manual__")}
                >
                  Nuevo borrador
                </button>
              ) : null}
            </div>

            <div className="mt-5 space-y-3">
              {snapshot.requestCandidates.length === 0 ? (
                <div className="rounded-[18px] border border-line bg-panel-muted/50 px-4 py-4">
                  <p className="text-sm leading-6 text-slate">
                    No hay solicitudes en etapa 3.1 o superior listas para convertirse en
                    borrador.
                  </p>
                </div>
              ) : (
                snapshot.requestCandidates.map((request) => (
                  <button
                    key={request.id}
                    type="button"
                    onClick={() => setDraftModalRequestId(request.id)}
                    className="w-full rounded-[20px] border border-line bg-white/86 px-4 py-4 text-left hover:border-line-strong hover:bg-white"
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <StatusChip tone={workflowTone(workflowStatusLabels[request.status])}>
                        {workflowStatusLabels[request.status]}
                      </StatusChip>
                      <StatusChip tone="slate">
                        {requestTypeLabels[request.requestType]}
                      </StatusChip>
                    </div>
                    <p className="font-semibold tracking-[-0.02em] text-foreground">
                      {request.requestCode}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate">{request.title}</p>
                    <p className="mt-3 text-[11px] text-slate">
                      {request.processLabel}
                    </p>
                    <p className="mt-1 text-[11px] text-slate">
                      {request.documentTypeLabel}
                    </p>
                  </button>
                ))
              )}
            </div>
          </article>

          <article className="surface-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="section-label">Cola activa</p>
                <h2 className="panel-title mt-2">Borradores y rondas</h2>
              </div>
              <StatusChip tone="accent">
                {String(filteredWorkItems.length).padStart(2, "0")} items
              </StatusChip>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por codigo, titulo o proceso"
              className="field-input mt-4"
            />

            <div className="subtle-scroll mt-4 max-h-[780px] space-y-3 overflow-auto pr-1">
              {filteredWorkItems.length === 0 ? (
                <div className="rounded-[18px] border border-line bg-panel-muted/50 px-4 py-4">
                  <p className="text-sm leading-6 text-slate">
                    No hay elementos que coincidan con el filtro actual.
                  </p>
                </div>
              ) : (
                filteredWorkItems.map((item) => {
                  const isSelected = item.versionId === selectedItem?.versionId;

                  return (
                    <button
                      key={item.versionId}
                      type="button"
                      onClick={() => setSelectedVersionId(item.versionId)}
                      className={`w-full rounded-[22px] border px-4 py-4 text-left ${
                        isSelected
                          ? "border-accent bg-accent-soft/45"
                          : "border-line bg-white/86 hover:border-line-strong hover:bg-white"
                      }`}
                    >
                      <div className="mb-3 flex flex-wrap gap-2">
                        <StatusChip tone={workflowTone(documentVersionStatusLabels[item.versionStatus])}>
                          {documentVersionStatusLabels[item.versionStatus]}
                        </StatusChip>
                        <StatusChip tone="slate">{item.versionLabel}</StatusChip>
                      </div>
                      <p className="font-semibold tracking-[-0.02em] text-foreground">
                        {item.documentCode}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate">{item.documentTitle}</p>
                      <p className="mt-3 text-[11px] text-slate">
                        {item.processLabel}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </article>
        </aside>

        <section className="data-grid min-h-[720px] px-6 py-6">
          {selectedItem ? (
            <ReviewDetailPanel
              approverOptions={snapshot.approverOptions}
              canCreateDraft={snapshot.canCreateDraft}
              canOfficialize={snapshot.canOfficialize}
              canSubmitReview={snapshot.canSubmitReview}
              currentUser={currentUser}
              item={selectedItem}
              reviewerOptions={snapshot.reviewerOptions}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-lg text-center">
                <p className="section-label">Sin elementos activos</p>
                <h2 className="panel-title mt-2">Aun no hay borradores en este flujo</h2>
                <p className="mt-3 text-sm leading-7 text-slate">
                  Cuando conviertas una solicitud en borrador o un documento entre a revision,
                  aparecera aqui con sus rondas, comentarios y acciones disponibles.
                </p>
              </div>
            </div>
          )}
        </section>
      </section>

      {draftModalRequestId ? (
        <CreateDraftModal
          currentUserRole={currentUser.role}
          initialRequestId={draftModalRequestId === "__manual__" ? undefined : draftModalRequestId}
          onClose={() => setDraftModalRequestId(null)}
          requestCandidates={snapshot.requestCandidates}
        />
      ) : null}
    </>
  );
}

function ReviewDetailPanel({
  approverOptions,
  canCreateDraft,
  canOfficialize,
  canSubmitReview,
  currentUser,
  item,
  reviewerOptions,
}: {
  approverOptions: ReviewUserOptionRecord[];
  canCreateDraft: boolean;
  canOfficialize: boolean;
  canSubmitReview: boolean;
  currentUser: Pick<SessionUser, "id" | "role">;
  item: ReviewWorkItemRecord;
  reviewerOptions: ReviewUserOptionRecord[];
}) {
  const canManageWorkflow =
    currentUser.role === "ADMINISTRATOR" || item.ownerEditor?.id === currentUser.id;
  const openAssignmentsForCurrentUser =
    item.latestRound?.assignments.filter(
      (assignment) => assignment.user.id === currentUser.id && assignment.status === "PENDING",
    ) ?? [];
  const showReplaceDraft =
    canCreateDraft &&
    canManageWorkflow &&
    (item.versionStatus === "DRAFT" || item.versionStatus === "REJECTED");
  const showSubmitReview =
    canSubmitReview &&
    canManageWorkflow &&
    (item.versionStatus === "DRAFT" || item.versionStatus === "REJECTED");
  const showOfficialize =
    canOfficialize && canManageWorkflow && item.versionStatus === "APPROVED";

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="section-label">Documento en flujo</p>
          <h2 className="panel-title mt-2 break-words">
            {item.documentCode} · {item.documentTitle}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate">
            {item.processLabel} · {item.documentTypeLabel}
          </p>
          {item.request ? (
            <p className="mt-2 text-sm leading-6 text-slate">
              Vinculado a {item.request.requestCode} · {item.request.title}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusChip tone={workflowTone(documentVersionStatusLabels[item.versionStatus])}>
            {documentVersionStatusLabels[item.versionStatus]}
          </StatusChip>
          <StatusChip tone={workflowTone(documentStateLabels[item.documentState])}>
            {documentStateLabels[item.documentState]}
          </StatusChip>
          <StatusChip tone="slate">{item.versionLabel}</StatusChip>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetadataCard label="Codigo mostrado" value={item.fullCode || item.documentCode} />
        <MetadataCard
          label="Responsable"
          value={item.ownerEditor?.name || "Sin editor asignado"}
        />
        <MetadataCard
          label="Ronda vigente"
          value={
            item.latestRound
              ? `Ronda ${item.latestRound.roundNumber}`
              : "Sin ronda enviada"
          }
        />
        <MetadataCard
          label="Comentarios abiertos"
          value={String(item.openCommentCount).padStart(2, "0")}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <div className="space-y-6">
          <ReviewFilesSection item={item} />

          {item.latestRound ? <ReviewRoundSection item={item} /> : null}

          {item.previousRounds.length > 0 ? (
            <ReviewHistorySection rounds={item.previousRounds} />
          ) : null}
        </div>

        <aside className="space-y-5">
          <article className="surface-card-compact p-5">
            <p className="section-label">Contexto del flujo</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate">
              <p>
                <strong className="text-foreground">Estado del borrador:</strong>{" "}
                {documentVersionStatusLabels[item.versionStatus]}
              </p>
              {item.changeKind ? (
                <p>
                  <strong className="text-foreground">Tipo de cambio:</strong>{" "}
                  {versionChangeKindLabels[item.changeKind]}
                </p>
              ) : null}
              {item.changeSummary ? (
                <p>
                  <strong className="text-foreground">Resumen:</strong> {item.changeSummary}
                </p>
              ) : null}
              {item.submittedAt ? (
                <p>
                  <strong className="text-foreground">Enviado:</strong> {item.submittedAt}
                </p>
              ) : null}
              {item.approvedAt ? (
                <p>
                  <strong className="text-foreground">Aprobado:</strong> {item.approvedAt}
                </p>
              ) : null}
              {item.officializedAt ? (
                <p>
                  <strong className="text-foreground">Oficializado:</strong> {item.officializedAt}
                </p>
              ) : null}
            </div>
          </article>

          {showReplaceDraft ? (
            <article className="surface-card-compact p-5">
              <p className="section-label">Borrador corregido</p>
              <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">
                Cargar nueva version de trabajo
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate">
                Usa este formulario para atender observaciones y preparar una nueva ronda.
              </p>
              <ReplaceDraftForm item={item} />
            </article>
          ) : null}

          {showSubmitReview ? (
            <article className="surface-card-compact p-5">
              <p className="section-label">Nueva ronda</p>
              <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">
                Enviar a revision formal
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate">
                Selecciona revisores y aprobadores para la ronda actual.
              </p>
              <SubmitForReviewForm
                approverOptions={approverOptions}
                item={item}
                reviewerOptions={reviewerOptions}
              />
            </article>
          ) : null}

          {openAssignmentsForCurrentUser.map((assignment) => (
            <article key={assignment.id} className="surface-card-compact p-5">
              <p className="section-label">{reviewAssignmentRoleLabels[assignment.assignmentRole]}</p>
              <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">
                Comentarios y decision
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate">
                Registra observaciones y deja la decision final de tu asignacion.
              </p>
              <AddCommentForm assignment={assignment} />
              <div className="mt-5 border-t border-line pt-5">
                <DecisionForm assignment={assignment} />
              </div>
            </article>
          ))}

          {showOfficialize ? (
            <article className="surface-card-compact p-5">
              <p className="section-label">Publicacion final</p>
              <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">
                Oficializar version
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate">
                Carga el archivo definitivo para volverlo visible en los espacios de consulta.
              </p>
              <OfficializeForm item={item} />
            </article>
          ) : null}

          {item.latestRound?.comments.some((comment) => comment.status === "OPEN") && canManageWorkflow ? (
            <article className="surface-card-compact p-5">
              <p className="section-label">Gestion editorial</p>
              <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">
                Resolver observaciones
              </h3>
              <div className="mt-4 space-y-3">
                {item.latestRound.comments
                  .filter((comment) => comment.status === "OPEN")
                  .map((comment) => (
                    <ResolveCommentRow key={comment.id} comment={comment} />
                  ))}
              </div>
            </article>
          ) : null}
        </aside>
      </section>
    </div>
  );
}

function ReviewFilesSection({ item }: { item: ReviewWorkItemRecord }) {
  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <article className="rounded-[22px] border border-line bg-white/82 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="section-label">Borradores cargados</p>
            <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">
              Archivos de trabajo
            </h3>
          </div>
          <StatusChip tone="accent">
            {String(item.draftFiles.length).padStart(2, "0")} archivos
          </StatusChip>
        </div>
        <div className="mt-4 space-y-3">
          {item.draftFiles.length === 0 ? (
            <EmptySlot message="Aun no hay borradores cargados para esta version." />
          ) : (
            item.draftFiles.map((file) => <ReviewFileCard key={file.id} file={file} />)
          )}
        </div>
      </article>

      <article className="rounded-[22px] border border-line bg-white/82 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="section-label">Version oficial</p>
            <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">
              Archivo definitivo
            </h3>
          </div>
          <StatusChip tone={item.officialFiles.length > 0 ? "green" : "slate"}>
            {item.officialFiles.length > 0 ? "Disponible" : "Pendiente"}
          </StatusChip>
        </div>
        <div className="mt-4 space-y-3">
          {item.officialFiles.length === 0 ? (
            <EmptySlot message="La version oficial se cargara cuando exista aprobacion unanime." />
          ) : (
            item.officialFiles.map((file) => <ReviewFileCard key={file.id} file={file} />)
          )}
        </div>
      </article>
    </section>
  );
}

function ReviewRoundSection({ item }: { item: ReviewWorkItemRecord }) {
  const round = item.latestRound;

  if (!round) {
    return null;
  }

  return (
    <section className="space-y-5">
      <article className="rounded-[22px] border border-line bg-white/82 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="section-label">Ronda actual</p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-foreground">
              Ronda {round.roundNumber}
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate">
              Estado {reviewRoundStatusLabels[round.status]}
              {round.submittedAt ? ` · enviada ${round.submittedAt}` : ""}
            </p>
          </div>
          <StatusChip tone={workflowTone(reviewRoundStatusLabels[round.status])}>
            {reviewRoundStatusLabels[round.status]}
          </StatusChip>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {round.assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="rounded-[18px] border border-line bg-panel-muted/45 px-4 py-4"
            >
              <div className="mb-3 flex flex-wrap gap-2">
                <StatusChip tone="slate">
                  {reviewAssignmentRoleLabels[assignment.assignmentRole]}
                </StatusChip>
                <StatusChip tone={workflowTone(reviewDecisionLabels[assignment.status])}>
                  {reviewDecisionLabels[assignment.status]}
                </StatusChip>
              </div>
              <p className="font-semibold tracking-[-0.02em] text-foreground">
                {assignment.user.name}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate">
                Comentarios abiertos {String(assignment.openCommentCount).padStart(2, "0")} ·
                totales {String(assignment.totalCommentCount).padStart(2, "0")}
              </p>
              {assignment.decisionComment ? (
                <p className="mt-3 text-sm leading-6 text-slate">{assignment.decisionComment}</p>
              ) : null}
              {assignment.decidedAt ? (
                <p className="mt-3 text-[10px] uppercase tracking-[0.16em] text-slate">
                  {assignment.decidedAt}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-[22px] border border-line bg-white/82 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="section-label">Comentarios del borrador</p>
            <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">
              Observaciones registradas en la ronda
            </h3>
          </div>
          <StatusChip tone="accent">
            {String(round.comments.length).padStart(2, "0")} registros
          </StatusChip>
        </div>
        <div className="mt-4 space-y-3">
          {round.comments.length === 0 ? (
            <EmptySlot message="Todavia no se han registrado comentarios en esta ronda." />
          ) : (
            round.comments.map((comment) => <ReviewCommentCard key={comment.id} comment={comment} />)
          )}
        </div>
      </article>
    </section>
  );
}

function ReviewHistorySection({ rounds }: { rounds: ReviewRoundRecord[] }) {
  return (
    <article className="rounded-[22px] border border-line bg-white/82 p-5">
      <p className="section-label">Historial de rondas</p>
      <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">
        Rondas previas
      </h3>
      <div className="mt-4 space-y-3">
        {rounds.map((round) => (
          <div key={round.id} className="rounded-[18px] border border-line bg-panel-muted/45 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip tone={workflowTone(reviewRoundStatusLabels[round.status])}>
                {reviewRoundStatusLabels[round.status]}
              </StatusChip>
              <StatusChip tone="slate">Ronda {round.roundNumber}</StatusChip>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate">
              {round.submittedAt ? `Enviada ${round.submittedAt}` : "Sin fecha de envio"}
              {round.closedAt ? ` · cerrada ${round.closedAt}` : ""}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate">
              Asignaciones {round.assignments.length} · comentarios {round.comments.length}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}

function CreateDraftModal({
  currentUserRole,
  initialRequestId,
  onClose,
  requestCandidates,
}: {
  currentUserRole: SessionUser["role"];
  initialRequestId?: string;
  onClose: () => void;
  requestCandidates: ReviewRequestCandidateRecord[];
}) {
  const [state, formAction] = useActionState(
    createDraftFromRequestStateAction,
    initialMutationState,
  );
  const [selectedRequestId, setSelectedRequestId] = useState(
    initialRequestId || requestCandidates[0]?.id || "",
  );
  const selectedRequest =
    requestCandidates.find((request) => request.id === selectedRequestId) ?? null;
  const isUpdateRequest = selectedRequest?.requestType === "UPDATE_EXISTING";

  useEffect(() => {
    if (state.status === "success") {
      onClose();
    }
  }, [onClose, state.status]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/18 px-4 py-4 backdrop-blur-sm">
      <button type="button" aria-label="Cerrar modal" className="absolute inset-0" onClick={onClose} />
      <div className="surface-card relative z-10 flex w-full max-w-[860px] flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <p className="section-label">Nuevo borrador</p>
            <h2 className="panel-title mt-2">Convertir solicitud en documento</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate">
              {currentUserRole === "ADMINISTRATOR"
                ? "Selecciona una solicitud activa, carga el borrador inicial y crea la version de trabajo."
                : "Carga el borrador inicial para la solicitud que tienes asignada y empieza el flujo formal."}
            </p>
          </div>
          <button type="button" className="button-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <form action={formAction} className="space-y-5 px-6 py-5">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-foreground">Solicitud</span>
            <select
              name="requestId"
              value={selectedRequestId}
              onChange={(event) => setSelectedRequestId(event.target.value)}
              className="field-input"
              required
            >
              <option value="">Selecciona una solicitud</option>
              {requestCandidates.map((request) => (
                <option key={request.id} value={request.id}>
                  {request.requestCode} - {request.title}
                </option>
              ))}
            </select>
          </label>

          {selectedRequest ? (
            <div className="rounded-[18px] border border-line bg-accent/4 px-4 py-4 text-sm leading-6 text-slate">
              <p className="font-semibold text-foreground">{selectedRequest.processLabel}</p>
              <p className="mt-2">{selectedRequest.documentTypeLabel}</p>
              <p className="mt-2">
                {requestTypeLabels[selectedRequest.requestType]}
                {selectedRequest.relatedDocumentLabel ? ` · ${selectedRequest.relatedDocumentLabel}` : ""}
              </p>
            </div>
          ) : null}

          {isUpdateRequest ? (
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-foreground">Tipo de cambio</span>
              <select name="changeKind" className="field-input" defaultValue="MINOR">
                <option value="MINOR">Version menor</option>
                <option value="MAJOR">Version mayor</option>
              </select>
            </label>
          ) : null}

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-foreground">Resumen del cambio</span>
            <textarea
              name="changeSummary"
              rows={4}
              className="field-textarea"
              placeholder="Explica brevemente el alcance del borrador o las variaciones relevantes."
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-foreground">Archivo borrador</span>
            <input name="draftFile" type="file" className="field-file" required />
          </label>

          <MutationBanner state={state} />

          <div className="flex justify-end">
            <SubmitButton
              idleLabel="Crear borrador"
              pendingLabel="Creando borrador..."
              className="button-primary disabled:cursor-wait disabled:opacity-70"
            />
          </div>
        </form>
      </div>
    </div>
  );
}

function ReplaceDraftForm({ item }: { item: ReviewWorkItemRecord }) {
  const [state, formAction] = useActionState(
    replaceDraftFileStateAction,
    initialMutationState,
  );

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <input type="hidden" name="versionId" value={item.versionId} />
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-foreground">Nuevo archivo de borrador</span>
        <input name="draftFile" type="file" className="field-file" required />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-foreground">Resumen editorial</span>
        <textarea
          name="changeSummary"
          rows={4}
          className="field-textarea"
          placeholder="Describe como fueron atendidas las observaciones."
        />
      </label>
      <MutationBanner state={state} />
      <SubmitButton
        idleLabel="Guardar borrador"
        pendingLabel="Guardando..."
        className="button-primary w-full disabled:cursor-wait disabled:opacity-70"
      />
    </form>
  );
}

function SubmitForReviewForm({
  approverOptions,
  item,
  reviewerOptions,
}: {
  approverOptions: ReviewUserOptionRecord[];
  item: ReviewWorkItemRecord;
  reviewerOptions: ReviewUserOptionRecord[];
}) {
  const [state, formAction] = useActionState(
    submitVersionForReviewStateAction,
    initialMutationState,
  );

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <input type="hidden" name="versionId" value={item.versionId} />

      <ParticipantSelector
        fieldName="reviewerIds"
        label="Revisores"
        options={reviewerOptions}
      />
      <ParticipantSelector
        fieldName="approverIds"
        label="Aprobadores"
        options={approverOptions}
      />

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-foreground">Nota de envio</span>
        <textarea
          name="note"
          rows={4}
          className="field-textarea"
          placeholder="Contexto adicional para la ronda o puntos que deben validarse."
        />
      </label>

      <MutationBanner state={state} />
      <SubmitButton
        idleLabel="Enviar a revision"
        pendingLabel="Enviando..."
        className="button-primary w-full disabled:cursor-wait disabled:opacity-70"
      />
    </form>
  );
}

function AddCommentForm({ assignment }: { assignment: ReviewAssignmentRecord }) {
  const [state, formAction] = useActionState(
    addReviewCommentStateAction,
    initialMutationState,
  );

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <input type="hidden" name="assignmentId" value={assignment.id} />

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-foreground">Tipo de comentario</span>
        <select name="commentType" className="field-input" defaultValue="OBSERVATION">
          <option value="OBSERVATION">Observacion</option>
          <option value="SUGGESTION">Sugerencia</option>
        </select>
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-foreground">Seccion de referencia</span>
        <input
          name="sectionReference"
          className="field-input"
          placeholder="Ej. 4.2 Alcance o encabezado"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-foreground">Comentario</span>
        <textarea
          name="comment"
          rows={4}
          className="field-textarea"
          placeholder="Describe la observacion o sugerencia de forma concreta."
          required
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-foreground">Texto sugerido</span>
        <textarea
          name="suggestedText"
          rows={3}
          className="field-textarea"
          placeholder="Opcional: propuesta exacta de redaccion."
        />
      </label>

      <MutationBanner state={state} />
      <SubmitButton
        idleLabel="Agregar comentario"
        pendingLabel="Guardando..."
        className="button-secondary w-full disabled:cursor-wait disabled:opacity-70"
      />
    </form>
  );
}

function DecisionForm({ assignment }: { assignment: ReviewAssignmentRecord }) {
  const [state, formAction] = useActionState(
    recordReviewDecisionStateAction,
    initialMutationState,
  );
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED">("APPROVED");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="assignmentId" value={assignment.id} />
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-foreground">Decision</span>
        <select
          name="decision"
          value={decision}
          onChange={(event) => setDecision(event.target.value as "APPROVED" | "REJECTED")}
          className="field-input"
        >
          <option value="APPROVED">Aprobar</option>
          <option value="REJECTED">Rechazar</option>
        </select>
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-foreground">
          {decision === "REJECTED" ? "Observaciones obligatorias" : "Comentario de decision"}
        </span>
        <textarea
          name="decisionComment"
          rows={4}
          className="field-textarea"
          placeholder={
            decision === "REJECTED"
              ? "Explica por que el borrador no puede aprobarse en su estado actual."
              : "Opcional: deja contexto adicional de aprobacion."
          }
        />
      </label>
      <MutationBanner state={state} />
      <SubmitButton
        idleLabel="Registrar decision"
        pendingLabel="Guardando..."
        className="button-primary w-full disabled:cursor-wait disabled:opacity-70"
      />
    </form>
  );
}

function OfficializeForm({ item }: { item: ReviewWorkItemRecord }) {
  const [state, formAction] = useActionState(
    officializeVersionStateAction,
    initialMutationState,
  );

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <input type="hidden" name="versionId" value={item.versionId} />
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-foreground">Archivo oficial</span>
        <input name="officialFile" type="file" className="field-file" required />
      </label>
      <MutationBanner state={state} />
      <SubmitButton
        idleLabel="Oficializar version"
        pendingLabel="Oficializando..."
        className="button-primary w-full disabled:cursor-wait disabled:opacity-70"
      />
    </form>
  );
}

function ResolveCommentRow({ comment }: { comment: ReviewDraftCommentRecord }) {
  const [state, formAction] = useActionState(
    resolveReviewCommentStateAction,
    initialMutationState,
  );

  return (
    <form action={formAction} className="rounded-[18px] border border-line bg-panel-muted/45 px-4 py-4">
      <input type="hidden" name="commentId" value={comment.id} />
      <p className="font-semibold tracking-[-0.02em] text-foreground">
        {comment.sectionReference || "Sin seccion especifica"}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate">{comment.comment}</p>
      <MutationBanner state={state} compact />
      <div className="mt-4">
        <SubmitButton
          idleLabel="Marcar como resuelto"
          pendingLabel="Resolviendo..."
          className="button-secondary w-full disabled:cursor-wait disabled:opacity-70"
        />
      </div>
    </form>
  );
}

function ParticipantSelector({
  fieldName,
  label,
  options,
}: {
  fieldName: "reviewerIds" | "approverIds";
  label: string;
  options: ReviewUserOptionRecord[];
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-foreground">{label}</legend>
      {options.length === 0 ? (
        <EmptySlot message={`No hay usuarios disponibles para ${label.toLowerCase()}.`} />
      ) : (
        <div className="space-y-2">
          {options.map((option) => (
            <label
              key={`${fieldName}-${option.id}`}
              className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-line bg-white/90 px-4 py-3 hover:border-line-strong hover:bg-white"
            >
              <input
                type="checkbox"
                name={fieldName}
                value={option.id}
                className="mt-1 h-4 w-4 rounded border-line text-accent focus:ring-accent"
              />
              <span className="min-w-0">
                <span className="block font-semibold text-foreground">{option.name}</span>
                <span className="block text-sm text-slate">
                  {option.username} · {formatRoleLabel(option.role)}
                </span>
              </span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}

function ReviewCommentCard({ comment }: { comment: ReviewDraftCommentRecord }) {
  return (
    <div className="rounded-[18px] border border-line bg-panel-muted/45 px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip tone={workflowTone(draftCommentStatusLabels[comment.status])}>
          {draftCommentStatusLabels[comment.status]}
        </StatusChip>
        <StatusChip tone="slate">
          {draftCommentTypeLabels[comment.commentType]}
        </StatusChip>
        <StatusChip tone="slate">
          {reviewAssignmentRoleLabels[comment.assignmentRole]}
        </StatusChip>
      </div>
      <p className="mt-3 font-semibold tracking-[-0.02em] text-foreground">
        {comment.sectionReference || "Sin seccion especifica"}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate">{comment.comment}</p>
      {comment.suggestedText ? (
        <div className="mt-3 rounded-[16px] border border-line bg-white/80 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate">
            Texto sugerido
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground">{comment.suggestedText}</p>
        </div>
      ) : null}
      <p className="mt-3 text-[10px] uppercase tracking-[0.16em] text-slate">
        {comment.author.name} · {comment.createdAt}
      </p>
      {comment.resolvedBy ? (
        <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-slate">
          Resuelta por {comment.resolvedBy.name}
          {comment.resolvedAt ? ` · ${comment.resolvedAt}` : ""}
        </p>
      ) : null}
    </div>
  );
}

function ReviewFileCard({ file }: { file: ReviewWorkItemRecord["draftFiles"][number] }) {
  return (
    <div className="rounded-[18px] border border-line bg-panel-muted/45 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold tracking-[-0.02em] text-foreground">
            {file.originalFileName}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate">
            {file.mimeType} · {file.uploadedAt}
          </p>
        </div>
        <StatusChip tone={file.fileRole === "OFFICIAL" ? "green" : "accent"}>
          {file.fileRole}
        </StatusChip>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {file.canPreview ? (
          <FilePreviewDialog
            canDownload={file.canDownload}
            downloadHref={file.downloadHref}
            fileName={file.originalFileName}
            previewHref={file.previewHref}
          />
        ) : null}
        {file.canDownload ? (
          <a href={file.downloadHref} className="button-secondary">
            Descargar
          </a>
        ) : null}
      </div>
    </div>
  );
}

function MetadataCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-line bg-panel-muted/45 px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-foreground">{value}</p>
    </div>
  );
}

function MutationBanner({
  compact = false,
  state,
}: {
  compact?: boolean;
  state: ReviewMutationState;
}) {
  if (state.status === "idle") {
    return null;
  }

  if (state.status === "success") {
    return (
      <p
        className={`rounded-[16px] border border-green/18 bg-green-soft px-4 py-3 text-sm leading-6 text-green ${
          compact ? "mt-3" : ""
        }`}
      >
        Operacion completada correctamente.
      </p>
    );
  }

  return (
    <p
      className={`rounded-[16px] border border-red/18 bg-red-soft px-4 py-3 text-sm leading-6 text-red ${
        compact ? "mt-3" : ""
      }`}
    >
      {state.message || "Ocurrio un error al procesar la operacion."}
    </p>
  );
}

function EmptySlot({ message }: { message: string }) {
  return (
    <div className="rounded-[18px] border border-line bg-panel-muted/45 px-4 py-4">
      <p className="text-sm leading-6 text-slate">{message}</p>
    </div>
  );
}

function buildWorkspaceMetrics(snapshot: ReviewsWorkspaceSnapshot) {
  return [
    {
      label: "Solicitudes para borrador",
      value: String(snapshot.requestCandidates.length).padStart(2, "0"),
      detail: snapshot.requestCandidates.length > 0 ? "Cola lista" : "Sin pendientes",
      tone: snapshot.requestCandidates.length > 0 ? ("accent" as const) : ("green" as const),
    },
    {
      label: "En revision",
      value: String(
        snapshot.workItems.filter((item) => item.versionStatus === "IN_REVIEW").length,
      ).padStart(2, "0"),
      detail: "Rondas activas",
      tone: "amber" as const,
    },
    {
      label: "Observados",
      value: String(
        snapshot.workItems.filter((item) => item.versionStatus === "REJECTED").length,
      ).padStart(2, "0"),
      detail: "Requieren ajuste",
      tone: "red" as const,
    },
    {
      label: "Listos para oficializar",
      value: String(
        snapshot.workItems.filter((item) => item.versionStatus === "APPROVED").length,
      ).padStart(2, "0"),
      detail: "Aprobacion unanime",
      tone: "green" as const,
    },
  ];
}

function buildWorkItemSearchValue(item: ReviewWorkItemRecord) {
  return normalizeSearchValue(
    [
      item.documentCode,
      item.documentTitle,
      item.processLabel,
      item.documentTypeLabel,
      item.request?.requestCode || "",
      item.request?.title || "",
    ].join(" "),
  );
}

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

function formatRoleLabel(role: SessionUser["role"]) {
  switch (role) {
    case "ADMINISTRATOR":
      return "Administrador";
    case "EDITOR":
      return "Editor";
    default:
      return "Lector";
  }
}
