"use client";

import { useDeferredValue, useEffect, useId, useState, type ReactNode } from "react";

import {
  createAdminUserAction,
  deactivateAdminUserAction,
  resetAdminUserPasswordAction,
  updateAdminUserConfigurationAction,
} from "@/app/(workspace)/admin/users/actions";
import { PermissionOverrideGrid } from "@/components/admin-permission-controls";
import { StatCard } from "@/components/stat-card";
import { StatusChip } from "@/components/status-chip";
import { SubmitButton } from "@/components/submit-button";
import type { AppRole } from "@/lib/auth/types";
import type {
  AdminConsoleSnapshot,
  AdminPermissionGroupRecord,
  AdminRoleRecord,
  AdminUserRecord,
  AdminUserTraceabilityRecord,
} from "@/lib/server/admin-console-service";
import type { MetricCard } from "@/lib/types";

type UserFilterStatus = "ALL" | "Activo" | "Inactivo";
type UserEditorTab = "basics" | "groups" | "permissions" | "security";
type UserCreateTab = "basics" | "groups" | "permissions";

export function AdminUsersConsole({
  snapshot,
  canManageReaderGroups,
  canManageUsers,
}: {
  snapshot: AdminConsoleSnapshot;
  canManageReaderGroups: boolean;
  canManageUsers: boolean;
}) {
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | AppRole>("ALL");
  const [statusFilter, setStatusFilter] = useState<UserFilterStatus>("ALL");
  const [groupFilter, setGroupFilter] = useState<string>("ALL");

  const deferredSearchValue = useDeferredValue(searchValue);
  const normalizedSearchValue = normalizeSearchValue(deferredSearchValue);
  const baseRoles = snapshot.roles.filter((role) => role.isBaseRole);
  const metrics = buildMetrics(snapshot);
  const selectedUser = snapshot.users.find((record) => record.id === selectedUserId) ?? null;

  const filteredUsers = snapshot.users.filter((record) => {
    if (roleFilter !== "ALL" && record.roleCode !== roleFilter) {
      return false;
    }

    if (statusFilter !== "ALL" && record.status !== statusFilter) {
      return false;
    }

    if (groupFilter !== "ALL" && !record.readerGroupIds.includes(groupFilter)) {
      return false;
    }

    if (!normalizedSearchValue) {
      return true;
    }

    const searchableFields = [
      record.name,
      record.username,
      record.email ?? "",
      record.dui ?? "",
      record.roleLabel,
      record.access,
      ...record.readerGroupCodes,
      ...record.grantedPermissionCodes,
      ...record.revokedPermissionCodes,
      ...record.effectivePermissionCodes,
    ];

    return normalizeSearchValue(searchableFields.join(" ")).includes(normalizedSearchValue);
  });

  return (
    <>
      <section className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <StatCard key={metric.label} metric={metric} />
          ))}
        </div>

        <article className="surface-card p-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="section-label">Operaciones enfocadas</p>
              <h2 className="panel-title mt-2">Altas, configuracion y baja logica</h2>
              <p className="mt-3 text-sm leading-6 text-slate">
                El alta y la reconfiguracion viven en modales separados para mantener foco sobre
                identidad, grupos lectores, overrides de permisos y seguridad. La baja conserva la
                trazabilidad y solo desactiva la cuenta.
              </p>
            </div>

            {canManageUsers ? (
              <button
                type="button"
                className="button-primary"
                onClick={() => setCreateUserOpen(true)}
              >
                Nuevo usuario
              </button>
            ) : null}
          </div>
        </article>

        <article className="surface-card p-5">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="section-label">Busqueda operativa</p>
                <h2 className="panel-title mt-2">Filtros de usuarios</h2>
                <p className="mt-3 text-sm leading-6 text-slate">
                  Busca por nombre, username, correo, DUI, grupo o permiso y reduce el directorio a
                  la combinacion operativa que necesites revisar.
                </p>
              </div>

              <button
                type="button"
                className="button-ghost"
                onClick={() => {
                  setSearchValue("");
                  setRoleFilter("ALL");
                  setStatusFilter("ALL");
                  setGroupFilter("ALL");
                }}
              >
                Limpiar filtros
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-foreground">Busqueda general</span>
                <input
                  className="field-input"
                  placeholder="Nombre, username, correo, grupo o permiso"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-foreground">Rol base</span>
                <select
                  className="field-input"
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value as "ALL" | AppRole)}
                >
                  <option value="ALL">Todos</option>
                  {baseRoles.map((role) => (
                    <option key={role.id} value={role.code}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-foreground">Estado</span>
                <select
                  className="field-input"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as UserFilterStatus)}
                >
                  <option value="ALL">Todos</option>
                  <option value="Activo">Activos</option>
                  <option value="Inactivo">Inactivos</option>
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-foreground">Grupo lector</span>
                <select
                  className="field-input"
                  value={groupFilter}
                  onChange={(event) => setGroupFilter(event.target.value)}
                >
                  <option value="ALL">Todos</option>
                  {snapshot.readerGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.code} - {group.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </article>

        <article className="surface-card p-5">
          <div className="flex flex-col gap-3 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-label">Directorio operativo</p>
              <h2 className="panel-title mt-2">Usuarios del sistema</h2>
              <p className="mt-3 text-sm leading-6 text-slate">
                Cada tarjeta muestra solo el contexto operativo clave. Abre el detalle para editar
                identidad, grupos, permisos y baja logica sin ruido visual.
              </p>
            </div>

            <StatusChip tone={filteredUsers.length === snapshot.users.length ? "accent" : "amber"}>
              {filteredUsers.length} de {snapshot.users.length} visibles
            </StatusChip>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="mt-5 rounded-[20px] border border-line bg-panel-muted/45 px-5 py-5 text-sm leading-6 text-slate">
              No hay usuarios que coincidan con los filtros activos.
            </div>
          ) : (
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {filteredUsers.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => setSelectedUserId(record.id)}
                  className="rounded-[22px] border border-line bg-white/86 p-5 text-left shadow-[0_10px_24px_rgba(15,61,75,0.05)] hover:border-line-strong hover:bg-white"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <StatusChip tone={record.status === "Activo" ? "green" : "red"}>
                          {record.status}
                        </StatusChip>
                        <StatusChip tone="accent">{record.roleLabel}</StatusChip>
                      </div>

                      <p className="mt-4 text-lg font-semibold tracking-[-0.03em] text-foreground">
                        {record.name}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate">
                        {record.username}
                        {record.email ? ` - ${record.email}` : ""}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-slate">{record.access}</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <SummaryBox
                        label="Grupos"
                        value={String(record.readerGroupCodes.length).padStart(2, "0")}
                      />
                      <SummaryBox
                        label="Overrides"
                        value={String(
                          record.grantedPermissionCodes.length + record.revokedPermissionCodes.length,
                        ).padStart(2, "0")}
                      />
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="meta-pill">
                      Permisos efectivos: {record.effectivePermissionCodes.length}
                    </span>
                    <span className="meta-pill">
                      Trazabilidad: {record.traceability.totalLinkedRecords}
                    </span>
                    {record.readerGroupCodes.length > 0 ? (
                      <span className="meta-pill">
                        {record.readerGroupCodes.slice(0, 2).join(" · ")}
                        {record.readerGroupCodes.length > 2
                          ? ` +${record.readerGroupCodes.length - 2}`
                          : ""}
                      </span>
                    ) : (
                      <span className="meta-pill">Sin grupos lectores</span>
                    )}
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-sm text-slate">
                    <span>Configuracion, seguridad y baja logica</span>
                    <span className="rounded-full border border-line bg-panel-muted/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
                      Abrir detalle
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </article>
      </section>

      {canManageUsers && createUserOpen ? (
        <CreateUserModal
          open
          onClose={() => setCreateUserOpen(false)}
          permissionGroups={snapshot.permissionGroups}
          readerGroups={snapshot.readerGroups}
          baseRoles={baseRoles}
          canManageReaderGroups={canManageReaderGroups}
        />
      ) : null}

      {canManageUsers && selectedUser ? (
        <EditUserModal
          key={selectedUser.id}
          open
          onClose={() => setSelectedUserId(null)}
          record={selectedUser}
          permissionGroups={snapshot.permissionGroups}
          readerGroups={snapshot.readerGroups}
          baseRoles={baseRoles}
          canManageReaderGroups={canManageReaderGroups}
        />
      ) : null}
    </>
  );
}

function CreateUserModal({
  open,
  onClose,
  permissionGroups,
  readerGroups,
  baseRoles,
  canManageReaderGroups,
}: {
  open: boolean;
  onClose: () => void;
  permissionGroups: AdminPermissionGroupRecord[];
  readerGroups: AdminConsoleSnapshot["readerGroups"];
  baseRoles: AdminRoleRecord[];
  canManageReaderGroups: boolean;
}) {
  const [activeTab, setActiveTab] = useState<UserCreateTab>("basics");
  const [assignGroups, setAssignGroups] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const tabs: Array<{ value: UserCreateTab; label: string }> = canManageReaderGroups
    ? [
        { value: "basics", label: "Datos basicos" },
        { value: "groups", label: "Grupos lectores" },
        { value: "permissions", label: "Permisos y overrides" },
      ]
    : [
        { value: "basics", label: "Datos basicos" },
        { value: "permissions", label: "Permisos y overrides" },
      ];

  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-[1100px]"
      title="Crear nueva cuenta"
      label="Alta de usuario"
      description="Divide el alta en bloques claros para que la identidad, la asignacion de grupos y los overrides de permisos no compitan entre si."
    >
      <form
        action={async (formData) => {
          setFormError(null);

          try {
            await createAdminUserAction(formData);
            onClose();
          } catch (error) {
            setFormError(getErrorMessage(error));
          }
        }}
        className="space-y-5"
      >
        <SectionTabs<UserCreateTab> items={tabs} value={activeTab} onChange={setActiveTab} />

        <section hidden={activeTab !== "basics"} className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-foreground">Nombre</span>
              <input name="name" className="field-input" required />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-foreground">Username</span>
              <input
                name="username"
                className="field-input"
                placeholder="nombre.apellido"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-foreground">Correo</span>
              <input
                name="email"
                type="email"
                className="field-input"
                placeholder="correo@empresa.com"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-foreground">DUI</span>
              <input name="dui" className="field-input" placeholder="00000000-0" />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-foreground">Contrasena temporal</span>
              <input
                name="password"
                className="field-input"
                type="text"
                placeholder="Temporal123!"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-foreground">Rol base</span>
              <select name="roleCode" className="field-input" defaultValue="READER">
                {baseRoles.map((role) => (
                  <option key={role.id} value={role.code}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-foreground">Estado inicial</span>
              <select name="isActive" className="field-input" defaultValue="true">
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-foreground">
                Forzar cambio de contrasena
              </span>
              <select name="mustChangePassword" className="field-input" defaultValue="true">
                <option value="true">Si</option>
                <option value="false">No</option>
              </select>
            </label>
          </div>
        </section>

        {canManageReaderGroups ? (
          <section hidden={activeTab !== "groups"} className="space-y-4">
            <div className="rounded-[20px] border border-line bg-panel-muted/45 px-4 py-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-line text-accent focus:ring-accent"
                  checked={assignGroups}
                  onChange={(event) => setAssignGroups(event.target.checked)}
                />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Asignar grupos lectores desde el alta
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate">
                    Activalo solo si la cuenta debe quedar segmentada de inmediato. Si lo dejas
                    desmarcado, el usuario nacera sin grupos lectores.
                  </p>
                </div>
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-foreground">Grupos lectores</span>
              <select
                multiple
                name="readerGroupIds"
                className="field-input min-h-56"
                disabled={!assignGroups}
              >
                {readerGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.code} - {group.name}
                  </option>
                ))}
              </select>
            </label>
          </section>
        ) : null}

        <section hidden={activeTab !== "permissions"} className="space-y-4">
          <div className="rounded-[20px] border border-line bg-panel-muted/45 px-4 py-4 text-sm leading-6 text-slate">
            El rol y los grupos definen la base. Desde aqui puedes conceder un permiso puntual o
            quitarlo aunque llegue heredado desde rol o grupo.
          </div>

          <PermissionOverrideGrid
            permissionGroups={permissionGroups}
            grantedCodes={[]}
            revokedCodes={[]}
          />
        </section>

        {formError ? <FormMessage tone="red" message={formError} /> : null}

        <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-5">
          <button type="button" className="button-secondary" onClick={onClose}>
            Cancelar
          </button>
          <SubmitButton
            idleLabel="Crear usuario"
            pendingLabel="Creando..."
            className="button-primary disabled:cursor-wait disabled:opacity-70"
          />
        </div>
      </form>
    </ModalFrame>
  );
}

function EditUserModal({
  open,
  onClose,
  record,
  permissionGroups,
  readerGroups,
  baseRoles,
  canManageReaderGroups,
}: {
  open: boolean;
  onClose: () => void;
  record: AdminUserRecord;
  permissionGroups: AdminPermissionGroupRecord[];
  readerGroups: AdminConsoleSnapshot["readerGroups"];
  baseRoles: AdminRoleRecord[];
  canManageReaderGroups: boolean;
}) {
  const [activeTab, setActiveTab] = useState<UserEditorTab>("basics");
  const [assignGroups, setAssignGroups] = useState(record.readerGroupIds.length > 0);
  const [configurationError, setConfigurationError] = useState<string | null>(null);
  const [securityMessage, setSecurityMessage] = useState<{
    message: string;
    tone: "green" | "red" | "amber";
  } | null>(null);

  const tabs: Array<{ value: UserEditorTab; label: string }> = canManageReaderGroups
    ? [
        { value: "basics", label: "Datos basicos" },
        { value: "groups", label: "Grupos lectores" },
        { value: "permissions", label: "Permisos y overrides" },
        { value: "security", label: "Seguridad y baja" },
      ]
    : [
        { value: "basics", label: "Datos basicos" },
        { value: "permissions", label: "Permisos y overrides" },
        { value: "security", label: "Seguridad y baja" },
      ];

  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-[1120px]"
      title={record.name}
      label="Configuracion de usuario"
      description="Reordena la configuracion en bloques para editar sin perder contexto entre identidad, grupos, permisos y seguridad."
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <StatusChip tone={record.status === "Activo" ? "green" : "red"}>
            {record.status}
          </StatusChip>
          <StatusChip tone="accent">{record.roleLabel}</StatusChip>
          <StatusChip tone={record.traceability.totalLinkedRecords > 0 ? "amber" : "green"}>
            Trazabilidad {record.traceability.totalLinkedRecords}
          </StatusChip>
        </div>

        <SectionTabs<UserEditorTab> items={tabs} value={activeTab} onChange={setActiveTab} />

        {activeTab === "security" ? (
          <div className="space-y-5">
            <TraceabilityPanel traceability={record.traceability} />

            <form
              action={async (formData) => {
                setSecurityMessage(null);

                try {
                  await resetAdminUserPasswordAction(formData);
                  setSecurityMessage({
                    message: "La contrasena temporal se actualizo correctamente.",
                    tone: "green",
                  });
                } catch (error) {
                  setSecurityMessage({
                    message: getErrorMessage(error),
                    tone: "red",
                  });
                }
              }}
              className="rounded-[22px] border border-line bg-white/84 p-5"
            >
              <input type="hidden" name="userId" value={record.id} />

              <p className="section-label">Seguridad de acceso</p>
              <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">
                Restablecer contrasena temporal
              </h3>

              <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_280px_auto]">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-foreground">
                    Nueva contrasena temporal
                  </span>
                  <input
                    name="password"
                    className="field-input"
                    type="text"
                    placeholder="Temporal123!"
                    required
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-foreground">
                    Obligar cambio al ingresar
                  </span>
                  <select name="mustChangePassword" className="field-input" defaultValue="true">
                    <option value="true">Si</option>
                    <option value="false">No</option>
                  </select>
                </label>

                <div className="flex items-end">
                  <SubmitButton
                    idleLabel="Guardar clave"
                    pendingLabel="Guardando..."
                    className="button-secondary w-full disabled:cursor-wait disabled:opacity-70"
                  />
                </div>
              </div>
            </form>

            <form
              action={async (formData) => {
                const confirmationMessage =
                  record.traceability.totalLinkedRecords > 0
                    ? "Este usuario conserva trazabilidad registrada. Se marcara como inactivo sin borrar historial. ¿Deseas continuar?"
                    : "La cuenta se marcara como inactiva y dejara de permitir acceso. ¿Deseas continuar?";

                if (!window.confirm(confirmationMessage)) {
                  return;
                }

                setSecurityMessage(null);

                try {
                  await deactivateAdminUserAction(formData);
                  onClose();
                } catch (error) {
                  setSecurityMessage({
                    message: getErrorMessage(error),
                    tone: "red",
                  });
                }
              }}
              className="rounded-[22px] border border-red/18 bg-red-soft/70 p-5"
            >
              <input type="hidden" name="userId" value={record.id} />

              <p className="section-label text-red">Baja logica</p>
              <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">
                Desactivar sin eliminar de la base
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate">
                La operacion nunca borra el registro. Solo cambia el estado a inactivo para
                proteger solicitudes, elaboraciones, revisiones, aprobaciones y bitacoras ya
                relacionadas con la cuenta.
              </p>

              <div className="mt-5 flex flex-wrap justify-end gap-3">
                <button
                  type="submit"
                  disabled={record.status === "Inactivo"}
                  className="inline-flex items-center justify-center rounded-full border border-red/18 bg-white px-4 py-2.5 text-sm font-semibold text-red disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {record.status === "Inactivo" ? "Usuario ya inactivo" : "Dar de baja"}
                </button>
              </div>
            </form>

            {securityMessage ? (
              <FormMessage tone={securityMessage.tone} message={securityMessage.message} />
            ) : null}
          </div>
        ) : (
          <form
            action={async (formData) => {
              setConfigurationError(null);

              try {
                await updateAdminUserConfigurationAction(formData);
                onClose();
              } catch (error) {
                setConfigurationError(getErrorMessage(error));
              }
            }}
            className="space-y-5"
          >
            <input type="hidden" name="userId" value={record.id} />

            <section hidden={activeTab !== "basics"} className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-foreground">Nombre</span>
                  <input name="name" className="field-input" defaultValue={record.name} required />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-foreground">Username</span>
                  <input
                    className="field-input"
                    defaultValue={record.username}
                    readOnly
                    disabled
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-foreground">Correo</span>
                  <input
                    name="email"
                    type="email"
                    className="field-input"
                    defaultValue={record.email || ""}
                    placeholder="correo@empresa.com"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-foreground">DUI</span>
                  <input
                    name="dui"
                    className="field-input"
                    defaultValue={record.dui || ""}
                    placeholder="00000000-0"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-foreground">Rol base</span>
                  <select name="roleCode" className="field-input" defaultValue={record.roleCode}>
                    {baseRoles.map((role) => (
                      <option key={role.id} value={role.code}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-foreground">Estado</span>
                  <select
                    name="isActive"
                    className="field-input"
                    defaultValue={record.status === "Activo" ? "true" : "false"}
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </label>
              </div>

              <label className="block max-w-sm space-y-2">
                <span className="text-sm font-semibold text-foreground">
                  Forzar cambio de contrasena
                </span>
                <select
                  name="mustChangePassword"
                  className="field-input"
                  defaultValue={record.mustChangePassword ? "true" : "false"}
                >
                  <option value="false">No</option>
                  <option value="true">Si</option>
                </select>
              </label>
            </section>

            {canManageReaderGroups ? (
              <section hidden={activeTab !== "groups"} className="space-y-4">
                <div className="rounded-[20px] border border-line bg-panel-muted/45 px-4 py-4">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-line text-accent focus:ring-accent"
                      checked={assignGroups}
                      onChange={(event) => setAssignGroups(event.target.checked)}
                    />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Mantener asignacion por grupos lectores
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate">
                        Al desmarcar esta opcion, la siguiente guardada revocara los grupos activos
                        del usuario.
                      </p>
                    </div>
                  </label>
                </div>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-foreground">Grupos lectores</span>
                  <select
                    multiple
                    name="readerGroupIds"
                    className="field-input min-h-56"
                    defaultValue={record.readerGroupIds}
                    disabled={!assignGroups}
                  >
                    {readerGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.code} - {group.name}
                      </option>
                    ))}
                  </select>
                </label>
              </section>
            ) : null}

            <section hidden={activeTab !== "permissions"} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <SummaryBox
                  label="Heredados"
                  value={String(record.inheritedPermissionCodes.length).padStart(2, "0")}
                />
                <SummaryBox
                  label="Concedidos"
                  value={String(record.grantedPermissionCodes.length).padStart(2, "0")}
                />
                <SummaryBox
                  label="Revocados"
                  value={String(record.revokedPermissionCodes.length).padStart(2, "0")}
                />
              </div>

              <div className="rounded-[20px] border border-line bg-white/84 p-4">
                <p className="text-sm font-semibold text-foreground">Permisos efectivos actuales</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {record.effectivePermissionCodes.length > 0 ? (
                    record.effectivePermissionCodes.map((permissionCode) => (
                      <span key={permissionCode} className="meta-pill">
                        {permissionCode}
                      </span>
                    ))
                  ) : (
                    <span className="meta-pill">Sin permisos efectivos</span>
                  )}
                </div>
              </div>

              <PermissionOverrideGrid
                permissionGroups={permissionGroups}
                grantedCodes={record.grantedPermissionCodes}
                revokedCodes={record.revokedPermissionCodes}
              />
            </section>

            {configurationError ? <FormMessage tone="red" message={configurationError} /> : null}

            <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-5">
              <button type="button" className="button-secondary" onClick={onClose}>
                Cancelar
              </button>
              <SubmitButton
                idleLabel="Guardar configuracion"
                pendingLabel="Actualizando..."
                className="button-primary disabled:cursor-wait disabled:opacity-70"
              />
            </div>
          </form>
        )}
      </div>
    </ModalFrame>
  );
}

function buildMetrics(snapshot: AdminConsoleSnapshot): MetricCard[] {
  const activeUsers = snapshot.users.filter((record) => record.status === "Activo").length;
  const inactiveUsers = snapshot.users.length - activeUsers;
  const readersWithRequests = snapshot.users.filter((record) => record.canCreateRequests).length;
  const overrideCount = snapshot.users.reduce(
    (total, record) => total + record.grantedPermissionCodes.length + record.revokedPermissionCodes.length,
    0,
  );

  return [
    {
      label: "Usuarios activos",
      value: String(activeUsers).padStart(2, "0"),
      detail: `${String(inactiveUsers).padStart(2, "0")} inactivos`,
      tone: "accent",
    },
    {
      label: "Lectores con solicitudes",
      value: String(readersWithRequests).padStart(2, "0"),
      detail: "Por rol, grupo u override",
      tone: "green",
    },
    {
      label: "Grupos lectores",
      value: String(snapshot.readerGroups.length).padStart(2, "0"),
      detail: "Catalogo administrable",
      tone: "accent",
    },
    {
      label: "Overrides directos",
      value: String(overrideCount).padStart(2, "0"),
      detail: "Concesiones o bloqueos",
      tone: overrideCount > 0 ? "amber" : "green",
    },
  ];
}

function ModalFrame({
  open,
  onClose,
  label,
  title,
  description,
  children,
  maxWidthClassName,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  title: string;
  description?: string;
  children: ReactNode;
  maxWidthClassName: string;
}) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      return undefined;
    }

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
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/18 px-4 py-6 backdrop-blur-sm">
      <button type="button" aria-label="Cerrar modal" className="absolute inset-0" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={`surface-card relative z-10 flex max-h-[92vh] w-full ${maxWidthClassName} flex-col overflow-hidden`}
      >
        <div className="flex flex-col gap-4 border-b border-line px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="section-label">{label}</p>
            <h2 id={titleId} className="panel-title mt-2">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-3 max-w-3xl text-sm leading-6 text-slate">
                {description}
              </p>
            ) : null}
          </div>

          <button type="button" className="button-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="subtle-scroll flex-1 overflow-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function SectionTabs<Value extends string>({
  items,
  value,
  onChange,
}: {
  items: Array<{ value: Value; label: string }>;
  value: Value;
  onChange: (value: Value) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const isActive = value === item.value;

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={isActive ? "button-primary" : "button-secondary"}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function TraceabilityPanel({
  traceability,
}: {
  traceability: AdminUserTraceabilityRecord;
}) {
  const summaryItems = [
    {
      label: "Solicitudes",
      value: traceability.requestParticipations,
    },
    {
      label: "Elaboracion",
      value: traceability.documentsAuthored,
    },
    {
      label: "Titularidad",
      value: traceability.documentsOwned,
    },
    {
      label: "Revisiones",
      value: traceability.reviewParticipations,
    },
    {
      label: "Auditoria",
      value: traceability.auditEvents,
    },
  ].filter((item) => item.value > 0);

  return (
    <section className="rounded-[22px] border border-line bg-white/84 p-5">
      <p className="section-label">Impacto de baja</p>
      <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">
        Verificacion de trazabilidad
      </h3>
      <p className="mt-3 text-sm leading-6 text-slate">
        Antes de desactivar, se revisan las huellas funcionales principales del usuario para
        proteger la consistencia historica del sistema.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryBox
          label="Total detectado"
          value={String(traceability.totalLinkedRecords).padStart(2, "0")}
        />
        <SummaryBox
          label="Elaboracion"
          value={String(traceability.documentsAuthored).padStart(2, "0")}
        />
        <SummaryBox
          label="Titularidad"
          value={String(traceability.documentsOwned).padStart(2, "0")}
        />
        <SummaryBox
          label="Solicitudes"
          value={String(traceability.requestParticipations).padStart(2, "0")}
        />
        <SummaryBox
          label="Revisiones"
          value={String(traceability.reviewParticipations).padStart(2, "0")}
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {summaryItems.length > 0 ? (
          summaryItems.map((item) => (
            <span key={item.label} className="meta-pill">
              {item.label}: {item.value}
            </span>
          ))
        ) : (
          <span className="meta-pill">Sin registros trazables detectados en la revision operativa</span>
        )}
      </div>
    </section>
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

function FormMessage({
  tone,
  message,
}: {
  tone: "green" | "red" | "amber";
  message: string;
}) {
  const toneClasses = {
    amber: "border-amber/18 bg-amber-soft/70 text-amber",
    green: "border-green/18 bg-green-soft/70 text-green",
    red: "border-red/18 bg-red-soft/70 text-red",
  } as const;

  return (
    <div className={`rounded-[18px] border px-4 py-3 text-sm leading-6 ${toneClasses[tone]}`}>
      {message}
    </div>
  );
}

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Ocurrio un error inesperado al procesar la solicitud.";
}
