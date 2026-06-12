import { PageHeader } from "@/components/page-header";
import { StatusChip, workflowTone } from "@/components/status-chip";
import { reviewDecisionLabels } from "@/lib/presenters";
import { requireAuthorizedUser } from "@/lib/server/auth";
import { getReviewsSnapshot } from "@/lib/server/mock-data-service";

export default async function ReviewsPage() {
  await requireAuthorizedUser("/reviews");
  const { accessRules, comments, reviews } = await getReviewsSnapshot();

  return (
    <>
      <PageHeader
        title="Revision, aprobacion y oficializacion"
        actions={
          <>
            <button className="button-secondary">Cargar borrador</button>
            <button className="button-primary">Enviar a revision</button>
          </>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_360px]">
        <article className="data-grid px-6 py-6">
          <div className="mb-6">
            <p className="section-label">Ronda activa</p>
            <h2 className="panel-title mt-2">PRO-077-V1.3 · Ronda 3</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {reviews.map((task) => (
              <div
                key={`${task.code}-${task.owner}`}
                className="rounded-[18px] border border-line bg-white/80 px-4 py-4"
              >
                <div className="mb-3 flex flex-wrap gap-2">
                  <StatusChip tone="slate">{task.role}</StatusChip>
                  <StatusChip tone={workflowTone(reviewDecisionLabels[task.status])}>
                    {reviewDecisionLabels[task.status]}
                  </StatusChip>
                </div>
                <p className="font-semibold tracking-[-0.02em] text-foreground">{task.owner}</p>
                <p className="mt-2 text-sm leading-6 text-slate">{task.title}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[22px] border border-line bg-accent/4 p-5">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="section-label">Observaciones</p>
                <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">
                  Consolidacion editorial
                </h3>
              </div>
            </div>
            <div className="space-y-3">
              {comments.map((comment) => (
                <div
                  key={`${comment.author}-${comment.section}`}
                  className="rounded-[18px] border border-line bg-white/88 px-4 py-4"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <StatusChip tone={workflowTone(comment.status)}>{comment.status}</StatusChip>
                    <StatusChip tone="slate">{comment.role}</StatusChip>
                  </div>
                  <p className="font-semibold tracking-[-0.02em] text-foreground">
                    {comment.section}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate">{comment.note}</p>
                  <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-slate">
                    {comment.author}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </article>

        <aside className="space-y-5">
          <article className="surface-card-compact p-5">
            <p className="section-label">Permisos del documento</p>
            <h2 className="panel-title mt-2">Politica de acceso</h2>
            <div className="mt-4 space-y-3">
              {accessRules.map((rule) => (
                <div
                  key={`${rule.subject}-${rule.scope}`}
                  className="rounded-[18px] border border-line bg-white/80 px-4 py-4"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <StatusChip tone={rule.effect === "ALLOW" ? "green" : "red"}>
                      {rule.effect}
                    </StatusChip>
                    <StatusChip tone="slate">{rule.scope}</StatusChip>
                  </div>
                  <p className="font-semibold tracking-[-0.02em] text-foreground">
                    {rule.subject}
                  </p>
                  {rule.expiresAt ? (
                    <p className="mt-2 text-sm text-slate">Vence {rule.expiresAt}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </article>

          <article className="surface-card-compact p-5">
            <p className="section-label">Reglas criticas</p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate">
              <li>Un rechazo sin observaciones no debe registrarse.</li>
              <li>La oficializacion solo ocurre con aprobacion unanime.</li>
              <li>La version oficial dispara indexacion asincrona para IA.</li>
            </ul>
          </article>
        </aside>
      </section>
    </>
  );
}
