import { redirect } from "next/navigation";

import { AdminSectionTabs } from "@/components/admin-section-tabs";
import { AdminGroupsConsole } from "@/components/admin-groups-console";
import { PageHeader } from "@/components/page-header";
import { getDefaultRouteForRole } from "@/lib/auth/policy";
import { requireAuthorizedUser } from "@/lib/server/auth";
import { getAdminConsoleSnapshot } from "@/lib/server/admin-console-service";

export default async function AdminGroupsPage() {
  const user = await requireAuthorizedUser("/admin/groups");
  const canManageReaderGroups = user.permissions.includes("reader_groups.manage");

  if (!canManageReaderGroups) {
    redirect(getDefaultRouteForRole(user.role));
  }

  const snapshot = await getAdminConsoleSnapshot();

  return (
    <>
      <PageHeader
        title="Grupos y permisos"
        description="Administra grupos lectores como una vista propia, con herencia colectiva de permisos y eliminacion controlada segun las asignaciones existentes."
      />

      <AdminSectionTabs />

      {!snapshot.isDatabaseMode ? (
        <article className="surface-card p-6">
          <p className="section-label">Modo no disponible</p>
          <p className="mt-3 text-sm leading-6 text-slate">
            La administracion de grupos requiere autenticacion en base de datos.
          </p>
        </article>
      ) : (
        <AdminGroupsConsole
          canManageReaderGroups={canManageReaderGroups}
          permissionGroups={snapshot.permissionGroups}
          readerGroups={snapshot.readerGroups}
        />
      )}
    </>
  );
}
