import { redirect } from "next/navigation";

import { AdminSectionTabs } from "@/components/admin-section-tabs";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusChip } from "@/components/status-chip";
import { getDefaultRouteForRole } from "@/lib/auth/policy";
import { requireAuthorizedUser } from "@/lib/server/auth";
import { type AdminConsoleSnapshot, getAdminConsoleSnapshot } from "@/lib/server/admin-console-service";
import type { MetricCard } from "@/lib/types";

export default async function AdminPermissionsPage() {
  const user = await requireAuthorizedUser("/admin/permissions");

  if (!user.permissions.includes("roles.manage")) {
    redirect(getDefaultRouteForRole(user.role));
  }

  const snapshot = await getAdminConsoleSnapshot();
  const metrics = buildMetrics(snapshot);

  return (
    <>
      <PageHeader
        title="Catalogo de permisos"
        description="Vista consolidada de permisos por modulo, herencia por rol y grupo, y excepciones directas por usuario tanto para conceder como para quitar."
      />

      <AdminSectionTabs />

      {!snapshot.isDatabaseMode ? (
        <article className="surface-card p-6">
          <p className="section-label">Modo no disponible</p>
          <p className="mt-3 text-sm leading-6 text-slate">
            El catalogo de permisos requiere autenticacion en base de datos.
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
            <div className="space-y-5">
              {snapshot.permissionGroups.map((group) => (
                <article key={group.module} className="data-grid">
                  <div className="border-b border-line px-6 py-5">
                    <p className="section-label">Modulo</p>
                    <h2 className="panel-title mt-2">{group.label}</h2>
                    <p className="mt-3 text-sm leading-6 text-slate">
                      {group.permissions.length} permisos registrados en este modulo.
                    </p>
                  </div>

                  <div className="subtle-scroll overflow-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-panel-muted/65 text-[10px] uppercase tracking-[0.22em] text-slate">
                        <tr>
                          <th className="px-6 py-4 font-semibold">Codigo</th>
                          <th className="px-6 py-4 font-semibold">Descripcion</th>
                          <th className="px-6 py-4 font-semibold">Roles</th>
                          <th className="px-6 py-4 font-semibold">Grupos</th>
                          <th className="px-6 py-4 font-semibold">Overrides</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.permissions.map((permission) => (
                          <tr key={permission.id} className="border-t border-line align-top">
                            <td className="px-6 py-5">
                              <p className="font-semibold tracking-[-0.02em] text-foreground">
                                {permission.code}
                              </p>
                              <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-slate">
                                {permission.action}
                              </p>
                            </td>
                            <td className="px-6 py-5 text-slate">
                              {permission.description || "Sin descripcion"}
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex flex-wrap gap-2">
                                {permission.roleCodes.length === 0 ? (
                                  <StatusChip tone="slate">Sin herencia</StatusChip>
                                ) : (
                                  permission.roleCodes.map((roleCode) => (
                                    <StatusChip key={roleCode} tone="accent">
                                      {roleCode}
                                    </StatusChip>
                                  ))
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex flex-wrap gap-2">
                                {permission.readerGroupCodes.length === 0 ? (
                                  <StatusChip tone="slate">Sin grupos</StatusChip>
                                ) : (
                                  permission.readerGroupCodes.map((groupCode) => (
                                    <StatusChip key={groupCode} tone="green">
                                      {groupCode}
                                    </StatusChip>
                                  ))
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex flex-wrap gap-2">
                                <StatusChip
                                  tone={
                                    permission.directGrantUserCount > 0 ? "amber" : "slate"
                                  }
                                >
                                  +{permission.directGrantUserCount}
                                </StatusChip>
                                <StatusChip
                                  tone={
                                    permission.directRevokeUserCount > 0 ? "red" : "slate"
                                  }
                                >
                                  -{permission.directRevokeUserCount}
                                </StatusChip>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              ))}
            </div>

            <aside className="space-y-5">
              <article className="surface-card-compact p-5">
                <p className="section-label">Lectura del catalogo</p>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-slate">
                  <li>La columna de roles muestra herencia colectiva por rol base o auxiliar.</li>
                  <li>La columna de grupos expone permisos heredables por grupo lector.</li>
                  <li>La columna overrides resume cuantas cuentas lo conceden o lo bloquean de forma directa.</li>
                  <li>Este tablero sirve para auditar antes de probar flujos o endurecer autorizaciones.</li>
                </ul>
              </article>

              <article className="surface-card-compact p-5">
                <p className="section-label">Uso recomendado</p>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-slate">
                  <li>Primero define la base en roles y grupos.</li>
                  <li>Luego usa permisos directos solo cuando exista una excepcion real.</li>
                  <li>Antes de depurar flujos, valida aqui que la matriz corresponda al comportamiento esperado.</li>
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
  const directAssignments = snapshot.permissions.reduce(
    (accumulator, permission) =>
      accumulator + permission.directGrantUserCount + permission.directRevokeUserCount,
    0,
  );
  const inheritedAssignments = snapshot.permissions.reduce(
    (accumulator, permission) =>
      accumulator + permission.roleCodes.length + permission.readerGroupCodes.length,
    0,
  );

  return [
    {
      label: "Permisos totales",
      value: String(snapshot.permissions.length).padStart(2, "0"),
      detail: "Catalogados en base",
      tone: "accent",
    },
    {
      label: "Modulos cubiertos",
      value: String(snapshot.permissionGroups.length).padStart(2, "0"),
      detail: "Agrupacion funcional",
      tone: "green",
    },
    {
      label: "Asignaciones directas",
      value: String(directAssignments).padStart(2, "0"),
      detail: "Excepciones usuario a usuario",
      tone: directAssignments > 0 ? "amber" : "green",
    },
    {
      label: "Herencias por rol",
      value: String(inheritedAssignments).padStart(2, "0"),
      detail: "Matriz base consolidada",
      tone: inheritedAssignments > 0 ? "accent" : "green",
    },
  ];
}
