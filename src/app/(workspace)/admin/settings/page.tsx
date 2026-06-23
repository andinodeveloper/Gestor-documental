import { redirect } from "next/navigation";

import { updateFileManagementPolicyAction } from "@/app/(workspace)/admin/settings/actions";
import { AdminSectionTabs } from "@/components/admin-section-tabs";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusChip } from "@/components/status-chip";
import { SubmitButton } from "@/components/submit-button";
import { getDefaultRouteForRole } from "@/lib/auth/policy";
import { requireAuthorizedUser } from "@/lib/server/auth";
import {
  type AdminFileSettingsSnapshot,
  getAdminFileSettingsSnapshot,
} from "@/lib/server/admin-file-settings-service";
import type { MetricCard } from "@/lib/types";

export default async function AdminFileSettingsPage() {
  const user = await requireAuthorizedUser("/admin/settings");

  if (user.role !== "ADMINISTRATOR") {
    redirect(getDefaultRouteForRole(user.role));
  }

  const snapshot = await getAdminFileSettingsSnapshot();
  const metrics = buildMetrics(snapshot);

  return (
    <>
      <PageHeader
        title="Archivos y previsualizacion"
        description="Gobierna la politica de formatos, limites de carga y diagnostico de runtime para la vista previa ofimatica en servidor Windows."
      />

      <AdminSectionTabs />

      {!snapshot.isDatabaseMode ? (
        <article className="surface-card p-6">
          <p className="section-label">Modo no disponible</p>
          <p className="mt-3 text-sm leading-6 text-slate">
            Esta configuracion persistente requiere autenticacion en base de datos.
          </p>
        </article>
      ) : (
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <StatCard key={metric.label} metric={metric} />
            ))}
          </div>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
            <article className="surface-card p-5">
              <div className="border-b border-line pb-5">
                <p className="section-label">Politica viva</p>
                <h2 className="panel-title mt-2">Carga y formatos</h2>
                <p className="mt-3 text-sm leading-6 text-slate">
                  Estos valores quedan persistidos en la app para que el administrador pueda
                  ajustar formatos y capacidad sin modificar codigo ni redeplegar.
                </p>
              </div>

              <form action={updateFileManagementPolicyAction} className="mt-5 space-y-6">
                <section className="rounded-[22px] border border-line bg-panel-muted/35 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Solicitudes y anexos</p>
                      <p className="mt-2 text-sm leading-6 text-slate">
                        Controla extensiones, tamano por archivo, total por solicitud y cantidad
                        maxima de adjuntos.
                      </p>
                    </div>
                    <StatusChip tone="accent">Operativo</StatusChip>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <label className="block space-y-2 lg:col-span-2">
                      <span className="text-sm font-semibold text-foreground">
                        Extensiones permitidas
                      </span>
                      <textarea
                        name="requestAllowedExtensions"
                        className="field-textarea"
                        rows={3}
                        defaultValue={snapshot.policy.requestAllowedExtensions.join(", ")}
                      />
                      <p className="text-xs leading-5 text-slate">
                        Usa una lista separada por comas. Ejemplo: pdf, docx, xlsx, png.
                      </p>
                    </label>

                    <label className="block space-y-2">
                      <span className="text-sm font-semibold text-foreground">
                        MB maximos por archivo
                      </span>
                      <input
                        name="requestMaxAttachmentSizeMb"
                        type="number"
                        min="1"
                        step="0.5"
                        className="field-input"
                        defaultValue={snapshot.policy.requestMaxAttachmentSizeMb}
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="text-sm font-semibold text-foreground">
                        Cantidad maxima de adjuntos
                      </span>
                      <input
                        name="requestMaxAttachmentCount"
                        type="number"
                        min="1"
                        step="1"
                        className="field-input"
                        defaultValue={snapshot.policy.requestMaxAttachmentCount}
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="text-sm font-semibold text-foreground">
                        MB maximos totales por solicitud
                      </span>
                      <input
                        name="requestMaxTotalSizeMb"
                        type="number"
                        min="1"
                        step="0.5"
                        className="field-input"
                        defaultValue={snapshot.policy.requestMaxTotalSizeMb}
                      />
                    </label>
                  </div>
                </section>

                <section className="rounded-[22px] border border-line bg-panel-muted/35 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Documentos editoriales</p>
                      <p className="mt-2 text-sm leading-6 text-slate">
                        Define formatos permitidos y tamano maximo para borradores y archivos
                        oficiales del flujo documental.
                      </p>
                    </div>
                    <StatusChip tone="green">Biblioteca</StatusChip>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <label className="block space-y-2 lg:col-span-2">
                      <span className="text-sm font-semibold text-foreground">
                        Extensiones permitidas
                      </span>
                      <textarea
                        name="documentAllowedExtensions"
                        className="field-textarea"
                        rows={3}
                        defaultValue={snapshot.policy.documentAllowedExtensions.join(", ")}
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="text-sm font-semibold text-foreground">
                        MB maximos por archivo documental
                      </span>
                      <input
                        name="documentMaxFileSizeMb"
                        type="number"
                        min="1"
                        step="0.5"
                        className="field-input"
                        defaultValue={snapshot.policy.documentMaxFileSizeMb}
                      />
                    </label>
                  </div>
                </section>

                <div className="flex justify-end">
                  <SubmitButton
                    idleLabel="Guardar politica"
                    pendingLabel="Guardando..."
                    className="button-primary disabled:cursor-wait disabled:opacity-70"
                  />
                </div>
              </form>
            </article>

            <aside className="space-y-5">
              <article className="surface-card p-5">
                <p className="section-label">Runtime de servidor</p>
                <h2 className="panel-title mt-2">Diagnostico de LibreOffice</h2>
                <div className="mt-5 space-y-4">
                  <RuntimeItem
                    label="Estado"
                    value={
                      snapshot.runtime.libreOfficePreviewConfigured
                        ? "Configurado para conversion server-side"
                        : "Pendiente de configurar por IT"
                    }
                  />
                  <RuntimeItem
                    label="Ejecutable"
                    value={
                      snapshot.runtime.libreOfficeExecutablePath ||
                      "No definido en LIBREOFFICE_EXECUTABLE_PATH"
                    }
                  />
                  <RuntimeItem
                    label="Timeout"
                    value={`${snapshot.runtime.libreOfficeTimeoutMs} ms`}
                  />
                  <RuntimeItem
                    label="Cache de previews"
                    value={snapshot.runtime.previewCacheRoot}
                  />
                </div>
              </article>

              <article className="surface-card-compact p-5">
                <p className="section-label">Practica recomendada</p>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-slate">
                  <li>Las politicas funcionales viven en base de datos y no requieren redeploy.</li>
                  <li>La ruta a LibreOffice debe vivir en variables de entorno del servidor.</li>
                  <li>IT puede desplegar la app y el runtime en carpetas hermanas del mismo servidor Windows.</li>
                  <li>Excel se previsualiza en HTML; Word y PowerPoint usan conversion server-side.</li>
                </ul>
              </article>
            </aside>
          </section>
        </section>
      )}
    </>
  );
}

function buildMetrics(snapshot: AdminFileSettingsSnapshot): MetricCard[] {
  return [
    {
      label: "Extensiones en solicitudes",
      value: String(snapshot.policy.requestAllowedExtensions.length).padStart(2, "0"),
      detail: "Adjuntos controlados por politica",
      tone: "accent",
    },
    {
      label: "Adjuntos por solicitud",
      value: String(snapshot.policy.requestMaxAttachmentCount).padStart(2, "0"),
      detail: "Cantidad maxima vigente",
      tone: "green",
    },
    {
      label: "Maximo total por solicitud",
      value: `${snapshot.policy.requestMaxTotalSizeMb} MB`,
      detail: "Capacidad total administrable",
      tone: "amber",
    },
    {
      label: "Preview ofimatico",
      value: snapshot.runtime.libreOfficePreviewConfigured ? "ON" : "OFF",
      detail: "Runtime server-side",
      tone: snapshot.runtime.libreOfficePreviewConfigured ? "green" : "amber",
    },
  ];
}

function RuntimeItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-line bg-panel-muted/45 px-4 py-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-foreground break-words">{value}</p>
    </div>
  );
}
