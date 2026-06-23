import { redirect } from "next/navigation";

import { createAdminAreaAction, updateAdminAreaAction } from "@/app/(workspace)/admin/catalogs/actions";
import { AdminSectionTabs } from "@/components/admin-section-tabs";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusChip } from "@/components/status-chip";
import { SubmitButton } from "@/components/submit-button";
import { getDefaultRouteForRole } from "@/lib/auth/policy";
import { requireAuthorizedUser } from "@/lib/server/auth";
import {
  type AdminCatalogSnapshot,
  getAdminCatalogSnapshot,
} from "@/lib/server/admin-catalog-service";
import type { MetricCard } from "@/lib/types";

export default async function AdminCatalogsPage() {
  const user = await requireAuthorizedUser("/admin/catalogs");

  if (!user.permissions.includes("catalogs.manage")) {
    redirect(getDefaultRouteForRole(user.role));
  }

  const snapshot = await getAdminCatalogSnapshot();
  const metrics = buildMetrics(snapshot);
  const activeReplacementCandidates = snapshot.areas.filter((area) => area.isActive);

  return (
    <>
      <PageHeader
        title="Centro de maestros"
        description="Administracion centralizada de catalogos operativos. En esta primera fase, las areas funcionales ya pueden crearse, editarse, inactivarse y sustituirse desde una sola vista, mientras procesos y tipos documentales quedan visibles dentro del mismo centro."
      />

      <AdminSectionTabs />

      {!snapshot.isDatabaseMode ? (
        <article className="surface-card p-6">
          <p className="section-label">Modo no disponible</p>
          <p className="mt-3 text-sm leading-6 text-slate">
            El centro de maestros requiere autenticacion en base de datos.
          </p>
        </article>
      ) : (
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <StatCard key={metric.label} metric={metric} />
            ))}
          </div>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
            <div className="space-y-4">
              <article className="surface-card p-5">
                <div className="flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="section-label">Catalogo funcional</p>
                    <h2 className="panel-title mt-2">Areas del negocio</h2>
                    <p className="mt-3 text-sm leading-6 text-slate">
                      Las areas se administran como maestros estables. Si una deja de operar y
                      tiene solicitudes abiertas, la inactivacion exige un reemplazo para migrar
                      los casos vigentes.
                    </p>
                  </div>
                  <StatusChip tone="accent">{snapshot.areas.length} areas registradas</StatusChip>
                </div>

                <div className="mt-5 space-y-4">
                  {snapshot.areas.map((area) => (
                    <article key={area.id} className="rounded-[22px] border border-line bg-white/86 p-5">
                      <div className="flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-2">
                            <StatusChip tone={area.isActive ? "green" : "red"}>
                              {area.isActive ? "Activa" : "Inactiva"}
                            </StatusChip>
                            {area.replacementAreaLabel ? (
                              <StatusChip tone="amber">Con reemplazo</StatusChip>
                            ) : null}
                          </div>
                          <p className="mt-4 text-lg font-semibold tracking-[-0.03em] text-foreground">
                            {area.name}
                          </p>
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate">
                            {area.code}
                          </p>
                          <p className="mt-3 text-sm leading-6 text-slate">
                            {area.description || "Sin descripcion registrada."}
                          </p>
                          {area.replacementAreaLabel ? (
                            <p className="mt-3 text-sm leading-6 text-slate">
                              Reemplazo configurado: {area.replacementAreaLabel}
                            </p>
                          ) : null}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <SummaryBox
                            label="Solicitudes abiertas"
                            value={String(area.openLinkedRequests).padStart(2, "0")}
                          />
                          <SummaryBox
                            label="Solicitudes historicas"
                            value={String(area.totalLinkedRequests).padStart(2, "0")}
                          />
                        </div>
                      </div>

                      <form action={updateAdminAreaAction} className="mt-5 space-y-5">
                        <input type="hidden" name="areaId" value={area.id} />

                        <div className="grid gap-4 lg:grid-cols-2">
                          <label className="block space-y-2">
                            <span className="text-sm font-semibold text-foreground">Nombre visible</span>
                            <input
                              name="name"
                              className="field-input"
                              defaultValue={area.name}
                              required
                            />
                          </label>

                          <label className="block space-y-2">
                            <span className="text-sm font-semibold text-foreground">Codigo</span>
                            <input className="field-input" value={area.code} disabled readOnly />
                          </label>
                        </div>

                        <label className="block space-y-2">
                          <span className="text-sm font-semibold text-foreground">Descripcion</span>
                          <textarea
                            name="description"
                            className="field-textarea"
                            rows={3}
                            defaultValue={area.description || ""}
                          />
                        </label>

                        <div className="grid gap-4 lg:grid-cols-3">
                          <label className="block space-y-2">
                            <span className="text-sm font-semibold text-foreground">Estado</span>
                            <select
                              name="isActive"
                              className="field-input"
                              defaultValue={area.isActive ? "true" : "false"}
                            >
                              <option value="true">Activa</option>
                              <option value="false">Inactiva</option>
                            </select>
                          </label>

                          <label className="block space-y-2">
                            <span className="text-sm font-semibold text-foreground">Orden visual</span>
                            <input
                              name="sortOrder"
                              type="number"
                              className="field-input"
                              defaultValue={area.sortOrder}
                              min={0}
                            />
                          </label>

                          <label className="block space-y-2">
                            <span className="text-sm font-semibold text-foreground">Area reemplazo</span>
                            <select
                              name="replacementAreaId"
                              className="field-input"
                              defaultValue={area.replacementAreaId || ""}
                            >
                              <option value="">Sin reemplazo</option>
                              {activeReplacementCandidates
                                .filter((candidate) => candidate.id !== area.id)
                                .map((candidate) => (
                                  <option key={candidate.id} value={candidate.id}>
                                    {candidate.code} - {candidate.name}
                                  </option>
                                ))}
                            </select>
                          </label>
                        </div>

                        <div className="flex justify-end">
                          <SubmitButton
                            idleLabel="Guardar area"
                            pendingLabel="Guardando..."
                            className="button-primary disabled:cursor-wait disabled:opacity-70"
                          />
                        </div>
                      </form>
                    </article>
                  ))}
                </div>
              </article>
            </div>

            <aside className="space-y-5">
              <article className="surface-card p-5">
                <p className="section-label">Nueva area</p>
                <h2 className="panel-title mt-2">Alta controlada</h2>
                <form action={createAdminAreaAction} className="mt-5 space-y-4">
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-foreground">Codigo</span>
                    <input
                      name="code"
                      className="field-input"
                      placeholder="CALIDAD_OPERATIVA"
                      required
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-foreground">Nombre</span>
                    <input name="name" className="field-input" required />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-foreground">Descripcion</span>
                    <textarea
                      name="description"
                      className="field-textarea"
                      rows={4}
                      placeholder="Describe el alcance funcional del area."
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-foreground">Orden visual</span>
                    <input
                      name="sortOrder"
                      type="number"
                      className="field-input"
                      defaultValue={snapshot.areas.length}
                      min={0}
                    />
                  </label>

                  <div className="flex justify-end">
                    <SubmitButton
                      idleLabel="Crear area"
                      pendingLabel="Creando..."
                      className="button-primary disabled:cursor-wait disabled:opacity-70"
                    />
                  </div>
                </form>
              </article>

              <CatalogReadOnlyCard
                title="Procesos"
                description="Inventario central visible desde el mismo centro de maestros. En esta fase se deja lectura operativa para no introducir inactivaciones sin modelo de sustitucion dedicado."
                items={snapshot.processes.map((process) => ({
                  id: process.id,
                  title: `${process.code} - ${process.name}`,
                  subtitle: process.processGroupLabel,
                  detail: `${process.totalLinkedRequests} solicitudes · ${process.totalLinkedDocuments} documentos`,
                  isActive: process.isActive,
                }))}
              />

              <CatalogReadOnlyCard
                title="Tipos documentales"
                description="Se centralizan aqui para gobierno visual unificado; la sustitucion controlada de este maestro se recomienda en una siguiente pasada."
                items={snapshot.documentTypes.map((documentType) => ({
                  id: documentType.id,
                  title: `${documentType.code} - ${documentType.name}`,
                  subtitle: documentType.category,
                  detail: `${documentType.totalLinkedRequests} solicitudes · ${documentType.totalLinkedDocuments} documentos`,
                  isActive: documentType.isActive,
                }))}
              />

              <article className="surface-card-compact p-5">
                <p className="section-label">Reglas del centro</p>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-slate">
                  <li>No se elimina fisicamente ningun maestro en uso.</li>
                  <li>Inactivar un area con solicitudes abiertas exige sustitucion.</li>
                  <li>Las solicitudes cerradas pueden conservar referencia historica a maestros inactivos.</li>
                </ul>
              </article>
            </aside>
          </section>
        </section>
      )}
    </>
  );
}

function buildMetrics(snapshot: AdminCatalogSnapshot): MetricCard[] {
  const activeAreas = snapshot.areas.filter((area) => area.isActive).length;
  const inactiveAreas = snapshot.areas.filter((area) => !area.isActive).length;
  const processesInUse = snapshot.processes.filter((process) => process.totalLinkedRequests > 0).length;
  const documentTypesInUse = snapshot.documentTypes.filter(
    (documentType) => documentType.totalLinkedRequests > 0,
  ).length;

  return [
    {
      label: "Areas activas",
      value: String(activeAreas).padStart(2, "0"),
      detail: "Catalogo funcional vigente",
      tone: "green",
    },
    {
      label: "Areas inactivas",
      value: String(inactiveAreas).padStart(2, "0"),
      detail: "Conservan trazabilidad historica",
      tone: inactiveAreas > 0 ? "amber" : "green",
    },
    {
      label: "Procesos en solicitudes",
      value: String(processesInUse).padStart(2, "0"),
      detail: "Procesos actualmente referenciados",
      tone: "accent",
    },
    {
      label: "Tipos en solicitudes",
      value: String(documentTypesInUse).padStart(2, "0"),
      detail: "Tipos documentales actualmente referenciados",
      tone: "accent",
    },
  ];
}

function CatalogReadOnlyCard({
  description,
  items,
  title,
}: {
  description: string;
  items: Array<{
    detail: string;
    id: string;
    isActive: boolean;
    subtitle: string;
    title: string;
  }>;
  title: string;
}) {
  return (
    <article className="surface-card p-5">
      <p className="section-label">Vista consolidada</p>
      <h2 className="panel-title mt-2">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate">{description}</p>

      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-[18px] border border-line bg-panel-muted/45 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate">
                  {item.subtitle}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate">{item.detail}</p>
              </div>
              <StatusChip tone={item.isActive ? "green" : "red"}>
                {item.isActive ? "Activo" : "Inactivo"}
              </StatusChip>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-line bg-panel-muted/45 px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">{value}</p>
    </div>
  );
}
