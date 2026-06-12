import { PageHeader } from "@/components/page-header";
import { RequestModalLauncher } from "@/components/request-modal-launcher";
import { StatCard } from "@/components/stat-card";
import { StatusChip, workflowTone } from "@/components/status-chip";
import { reviewDecisionLabels, workflowStatusLabels } from "@/lib/presenters";
import { requireAuthorizedUser } from "@/lib/server/auth";
import { getRequestIntakeSnapshot } from "@/lib/server/request-service";
import { getDashboardSnapshot } from "@/lib/server/mock-data-service";

export default async function DashboardPage() {
  const user = await requireAuthorizedUser("/dashboard");
  const [{ events, metrics, requests, reviews }, intakeSnapshot] = await Promise.all([
    getDashboardSnapshot(),
    getRequestIntakeSnapshot(user),
  ]);

  return (
    <>
      <PageHeader
        title="Gestion documental"
        actions={
          <>
            <button className="button-secondary">Exportar trazabilidad</button>
            <RequestModalLauncher
              allowedExtensionsLabel={intakeSnapshot.attachmentPolicy.allowedExtensionsLabel}
              canCreateRequests={intakeSnapshot.canCreateRequests}
              currentUser={user}
              documentTypeOptions={intakeSnapshot.documentTypeOptions}
              maxAttachmentSizeLabel={intakeSnapshot.attachmentPolicy.maxAttachmentSizeLabel}
              processOptions={intakeSnapshot.processOptions}
              relatedDocumentOptions={intakeSnapshot.relatedDocumentOptions}
              requesterOptions={intakeSnapshot.requesterOptions}
              returnPath="/dashboard"
            />
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <StatCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
        <article className="data-grid">
          <div className="flex flex-col gap-4 border-b border-line px-6 py-6 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <p className="section-label">Cola priorizada</p>
              <h2 className="panel-title mt-2">Solicitudes y documentos con accion inmediata</h2>
            </div>
            <StatusChip tone="accent">Administrador + editor</StatusChip>
          </div>

          <div className="subtle-scroll overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-panel-muted/65 text-[10px] uppercase tracking-[0.22em] text-slate">
                <tr>
                  <th className="px-6 py-4 font-semibold">Solicitud</th>
                  <th className="px-6 py-4 font-semibold">Proceso</th>
                  <th className="px-6 py-4 font-semibold">Prioridad</th>
                  <th className="px-6 py-4 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.code} className="border-t border-line align-top">
                    <td className="px-6 py-5">
                      <p className="font-semibold tracking-[-0.03em] text-foreground">
                        {request.code}
                      </p>
                      <p className="mt-2 max-w-md leading-7 text-slate">{request.title}</p>
                    </td>
                    <td className="px-6 py-5 text-slate">{request.process}</td>
                    <td className="px-6 py-5">
                      <StatusChip tone={request.priority === "Alta" ? "red" : "amber"}>
                        {request.priority}
                      </StatusChip>
                    </td>
                    <td className="px-6 py-5">
                      <StatusChip tone={workflowTone(workflowStatusLabels[request.status])}>
                        {workflowStatusLabels[request.status]}
                      </StatusChip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <div className="space-y-5">
          <article className="surface-card-compact p-5">
            <div className="mb-5">
              <p className="section-label">Pendientes personales</p>
              <h2 className="panel-title mt-2">Revision y aprobacion</h2>
            </div>
            <div className="space-y-3">
              {reviews.map((task) => (
                <div
                  key={`${task.code}-${task.role}`}
                  className="rounded-[18px] border border-line bg-white/72 px-4 py-4"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <StatusChip tone={workflowTone(reviewDecisionLabels[task.status])}>
                      {reviewDecisionLabels[task.status]}
                    </StatusChip>
                    <StatusChip tone="slate">{task.role}</StatusChip>
                  </div>
                  <p className="font-semibold tracking-[-0.02em] text-foreground">
                    {task.code}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate">{task.title}</p>
                  <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-slate">
                    {task.owner} · {task.dueDate}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="surface-card-compact p-5">
            <div className="mb-5">
              <p className="section-label">Actividad reciente</p>
              <h2 className="panel-title mt-2">Auditoria y bitacora</h2>
            </div>
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={`${event.actor}-${event.timestamp}`}
                  className="rounded-[18px] border border-line bg-accent/4 px-4 py-4"
                >
                  <p className="text-sm font-semibold tracking-[-0.02em] text-foreground">
                    {event.action}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate">
                    {event.actor} · {event.target}
                  </p>
                  <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-slate">
                    {event.timestamp}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
