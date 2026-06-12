import { redirect } from "next/navigation";

import { AdminSectionTabs } from "@/components/admin-section-tabs";
import { PermissionCheckboxGrid } from "@/components/admin-permission-controls";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusChip } from "@/components/status-chip";
import { SubmitButton } from "@/components/submit-button";
import { updateRoleConfigurationAction } from "@/app/(workspace)/admin/roles/actions";
import { getDefaultRouteForRole } from "@/lib/auth/policy";
import { requireAuthorizedUser } from "@/lib/server/auth";
import {
  type AdminConsoleSnapshot,
  getAdminConsoleSnapshot,
} from "@/lib/server/admin-console-service";
import type { MetricCard } from "@/lib/types";

export default async function AdminRolesPage() {
  const user = await requireAuthorizedUser("/admin/roles");

  if (!user.permissions.includes("roles.manage")) {
    redirect(getDefaultRouteForRole(user.role));
  }

  const snapshot = await getAdminConsoleSnapshot();
  const metrics = buildMetrics(snapshot);

  return (
    <>
      <PageHeader
        title="Administracion de roles y permisos"
        description="Define la matriz de permisos por rol global. Los usuarios heredan esta base y luego pueden recibir excepciones directas sin mezclar permisos colectivos con grupos lectores."
      />

      <AdminSectionTabs />

      {!snapshot.isDatabaseMode ? (
        <article className="surface-card p-6">
          <p className="section-label">Modo no disponible</p>
          <p className="mt-3 text-sm leading-6 text-slate">
            La gestion de roles requiere autenticacion en base de datos.
          </p>
        </article>
      ) : (
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <StatCard key={metric.label} metric={metric} />
            ))}
          </div>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_340px]">
            <div className="space-y-4">
              {snapshot.roles.map((role) => (
                <article key={role.id} className="surface-card p-5">
                  <div className="flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <StatusChip tone={role.isSystemRole ? "accent" : "slate"}>
                          {role.isSystemRole ? "Rol del sistema" : "Rol adicional"}
                        </StatusChip>
                        <StatusChip tone={role.isBaseRole ? "green" : "amber"}>
                          {role.isBaseRole ? "Rol base" : "Rol auxiliar"}
                        </StatusChip>
                      </div>
                      <p className="mt-4 text-lg font-semibold tracking-[-0.03em] text-foreground">
                        {role.code}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate">
                        {role.description || "Sin descripcion registrada."}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <SummaryBox
                        label="Usuarios asociados"
                        value={String(role.memberCount).padStart(2, "0")}
                      />
                      <SummaryBox
                        label="Permisos del rol"
                        value={String(role.permissionCodes.length).padStart(2, "0")}
                      />
                    </div>
                  </div>

                  <form action={updateRoleConfigurationAction} className="mt-5 space-y-5">
                    <input type="hidden" name="roleId" value={role.id} />

                    <div className="grid gap-4 lg:grid-cols-2">
                      <label className="block space-y-2">
                        <span className="text-sm font-semibold text-foreground">Nombre visible</span>
                        <input
                          name="name"
                          className="field-input"
                          defaultValue={role.name}
                          required
                        />
                      </label>

                      <label className="block space-y-2">
                        <span className="text-sm font-semibold text-foreground">Codigo</span>
                        <input
                          className="field-input"
                          value={role.code}
                          disabled
                          readOnly
                        />
                      </label>
                    </div>

                    <label className="block space-y-2">
                      <span className="text-sm font-semibold text-foreground">Descripcion</span>
                      <textarea
                        name="description"
                        className="field-textarea"
                        rows={3}
                        defaultValue={role.description || ""}
                      />
                    </label>

                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-semibold text-foreground">
                          Permisos heredados por el rol
                        </span>
                        <p className="mt-2 text-xs leading-5 text-slate">
                          Cada permiso conserva su sombreado visual, pero ahora tambien expone una
                          casilla para agregarlo o quitarlo del rol sin depender de un selector
                          multiple.
                        </p>
                      </div>

                      <PermissionCheckboxGrid
                        inputName="permissionCodes"
                        permissionGroups={snapshot.permissionGroups}
                        selectedCodes={role.permissionCodes}
                      />
                    </div>

                    <div className="flex justify-end">
                      <SubmitButton
                        idleLabel="Guardar rol"
                        pendingLabel="Actualizando..."
                        className="button-primary disabled:cursor-wait disabled:opacity-70"
                      />
                    </div>
                  </form>
                </article>
              ))}
            </div>

            <aside className="space-y-5">
              <article className="surface-card-compact p-5">
                <p className="section-label">Reglas del modelo</p>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-slate">
                  <li>Los roles globales activos del proyecto siguen siendo administrador, editor y lector.</li>
                  <li>Los permisos directos de usuario se usan como excepciones a la base heredada por rol.</li>
                  <li>Los grupos lectores no reemplazan roles; segmentan el acceso documental.</li>
                </ul>
              </article>

              <article className="surface-card-compact p-5">
                <p className="section-label">Efecto operativo</p>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-slate">
                  <li>Actualizar un rol cambia la sesion efectiva en el siguiente request autenticado.</li>
                  <li>Permisos como `requests.create` o `roles.manage` ya se resuelven desde base de datos.</li>
                  <li>Si un permiso debe aplicar solo a una persona, se asigna directo desde usuarios.</li>
                </ul>
              </article>
            </aside>
          </section>
        </section>
      )}
    </>
  );
}

function buildMetrics(snapshot: AdminConsoleSnapshot): MetricCard[] {
  const baseRoles = snapshot.roles.filter((role) => role.isBaseRole).length;
  const systemRoles = snapshot.roles.filter((role) => role.isSystemRole).length;
  const permissionAssignments = snapshot.roles.reduce(
    (accumulator, role) => accumulator + role.permissionCodes.length,
    0,
  );

  return [
    {
      label: "Roles base",
      value: String(baseRoles).padStart(2, "0"),
      detail: "Administrador, editor y lector",
      tone: "accent",
    },
    {
      label: "Roles del sistema",
      value: String(systemRoles).padStart(2, "0"),
      detail: "Catastro actual en base",
      tone: "green",
    },
    {
      label: "Permisos catalogados",
      value: String(snapshot.permissions.length).padStart(2, "0"),
      detail: "Acciones administrables",
      tone: "accent",
    },
    {
      label: "Asignaciones por rol",
      value: String(permissionAssignments).padStart(2, "0"),
      detail: "Matriz heredada total",
      tone: permissionAssignments > 0 ? "amber" : "green",
    },
  ];
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-line bg-panel-muted/45 px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">{value}</p>
    </div>
  );
}
