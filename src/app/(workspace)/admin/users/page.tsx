import { redirect } from "next/navigation";

import { AdminUsersConsole } from "@/components/admin-users-console";
import { AdminSectionTabs } from "@/components/admin-section-tabs";
import { PageHeader } from "@/components/page-header";
import { getDefaultRouteForRole } from "@/lib/auth/policy";
import { requireAuthorizedUser } from "@/lib/server/auth";
import { getAdminConsoleSnapshot } from "@/lib/server/admin-console-service";

export default async function AdminUsersPage() {
  const user = await requireAuthorizedUser("/admin/users");
  const canManageUsers = user.permissions.includes("users.manage");
  const canManageReaderGroups = user.permissions.includes("reader_groups.manage");

  if (!canManageUsers && !canManageReaderGroups) {
    redirect(getDefaultRouteForRole(user.role));
  }

  if (!canManageUsers && canManageReaderGroups) {
    redirect("/admin/groups");
  }

  const snapshot = await getAdminConsoleSnapshot();

  return (
    <>
      <PageHeader
        title="Administracion de usuarios"
        description="Gestiona altas, reconfiguracion y baja logica sobre la base real del sistema, con grupos lectores separados en su propia vista y overrides directos para sumar o quitar permisos por usuario."
      />

      <AdminSectionTabs />

      {!snapshot.isDatabaseMode ? (
        <article className="surface-card p-6">
          <p className="section-label">Modo no disponible</p>
          <p className="mt-3 text-sm leading-6 text-slate">
            La consola administrativa completa solo esta disponible cuando la aplicacion corre con
            autenticacion en base de datos.
          </p>
        </article>
      ) : (
        <AdminUsersConsole
          snapshot={snapshot}
          canManageUsers={canManageUsers}
          canManageReaderGroups={canManageReaderGroups}
        />
      )}
    </>
  );
}
