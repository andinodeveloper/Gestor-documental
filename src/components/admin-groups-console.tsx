"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";

import {
  createReaderGroupAction,
  deleteReaderGroupAction,
  updateReaderGroupAction,
} from "@/app/(workspace)/admin/groups/actions";
import { PermissionCheckboxGrid } from "@/components/admin-permission-controls";
import { StatCard } from "@/components/stat-card";
import { StatusChip } from "@/components/status-chip";
import { SubmitButton } from "@/components/submit-button";
import type {
  AdminPermissionGroupRecord,
  AdminReaderGroupRecord,
} from "@/lib/server/admin-console-service";
import type { MetricCard } from "@/lib/types";

export function AdminGroupsConsole({
  canManageReaderGroups,
  permissionGroups,
  readerGroups,
}: {
  canManageReaderGroups: boolean;
  permissionGroups: AdminPermissionGroupRecord[];
  readerGroups: AdminReaderGroupRecord[];
}) {
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const selectedGroup = readerGroups.find((group) => group.id === selectedGroupId) ?? null;
  const metrics = useMemo(() => buildMetrics(readerGroups), [readerGroups]);

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
              <p className="section-label">Administracion de grupos</p>
              <h2 className="panel-title mt-2">Segmentacion y herencia colectiva</h2>
              <p className="mt-3 text-sm leading-6 text-slate">
                Cada grupo lector puede definir sus propios permisos heredables. La creacion vive
                en modal para no mezclar el catalogo activo con el formulario, y la eliminacion
                solo procede cuando no compromete asignaciones existentes.
              </p>
            </div>

            {canManageReaderGroups ? (
              <button
                type="button"
                className="button-primary"
                onClick={() => setCreateGroupOpen(true)}
              >
                Crear grupo
              </button>
            ) : null}
          </div>
        </article>

        <article className="surface-card p-5">
          <div className="flex flex-col gap-3 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-label">Catalogo vigente</p>
              <h2 className="panel-title mt-2">Grupos y permisos colectivos</h2>
              <p className="mt-3 text-sm leading-6 text-slate">
                Ajusta nombre, modo, estado y permisos heredables desde una vista dedicada.
              </p>
            </div>

            <StatusChip tone="accent">{readerGroups.length} grupos registrados</StatusChip>
          </div>

          {readerGroups.length === 0 ? (
            <div className="mt-5 rounded-[20px] border border-line bg-panel-muted/45 px-5 py-5 text-sm leading-6 text-slate">
              Aun no hay grupos lectores registrados.
            </div>
          ) : (
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {readerGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setSelectedGroupId(group.id)}
                  className="rounded-[22px] border border-line bg-white/86 p-5 text-left shadow-[0_10px_24px_rgba(15,61,75,0.05)] hover:border-line-strong hover:bg-white"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <StatusChip tone={group.isActive ? "green" : "red"}>
                          {group.isActive ? "Activo" : "Inactivo"}
                        </StatusChip>
                        <StatusChip tone={group.mode === "General" ? "green" : "accent"}>
                          {group.mode}
                        </StatusChip>
                      </div>

                      <p className="mt-4 text-lg font-semibold tracking-[-0.03em] text-foreground">
                        {group.name}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate">
                        {group.code}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-slate">
                        {group.description || "Sin descripcion registrada."}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <SummaryBox
                        label="Usuarios activos"
                        value={String(group.memberCount).padStart(2, "0")}
                      />
                      <SummaryBox
                        label="Permisos del grupo"
                        value={String(group.permissionCodes.length).padStart(2, "0")}
                      />
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {group.permissionCodes.length > 0 ? (
                      <>
                        {group.permissionCodes.slice(0, 3).map((permissionCode) => (
                          <span key={permissionCode} className="meta-pill">
                            {permissionCode}
                          </span>
                        ))}
                        {group.permissionCodes.length > 3 ? (
                          <span className="meta-pill">+{group.permissionCodes.length - 3} mas</span>
                        ) : null}
                      </>
                    ) : (
                      <span className="meta-pill">Sin permisos heredables</span>
                    )}
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-sm text-slate">
                    <span>Configuracion y eliminacion controlada</span>
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

      {canManageReaderGroups && createGroupOpen ? (
        <CreateGroupModal
          open
          onClose={() => setCreateGroupOpen(false)}
          permissionGroups={permissionGroups}
        />
      ) : null}

      {canManageReaderGroups && selectedGroup ? (
        <EditGroupModal
          key={selectedGroup.id}
          open
          onClose={() => setSelectedGroupId(null)}
          group={selectedGroup}
          permissionGroups={permissionGroups}
        />
      ) : null}
    </>
  );
}

function CreateGroupModal({
  open,
  onClose,
  permissionGroups,
}: {
  open: boolean;
  onClose: () => void;
  permissionGroups: AdminPermissionGroupRecord[];
}) {
  const [formError, setFormError] = useState<string | null>(null);

  return (
    <AdminDialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-[1080px]"
      label="Nuevo grupo lector"
      title="Crear grupo y definir permisos"
      description="El grupo nace con su configuracion basica y sus permisos heredables desde una sola accion."
    >
      <form
        action={async (formData) => {
          setFormError(null);

          try {
            await createReaderGroupAction(formData);
            onClose();
          } catch (error) {
            setFormError(getErrorMessage(error));
          }
        }}
        className="space-y-5"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-foreground">Codigo</span>
            <input
              name="code"
              className="field-input"
              placeholder="SOPORTE_TECNOLOGICO"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-foreground">Nombre</span>
            <input name="name" className="field-input" required />
          </label>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-foreground">Descripcion</span>
            <textarea
              name="description"
              className="field-textarea"
              rows={4}
              placeholder="Describe el alcance funcional del grupo."
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-foreground">Modo</span>
            <select name="mode" className="field-input" defaultValue="General">
              <option value="General">General</option>
              <option value="Restringido">Restringido</option>
            </select>
          </label>
        </div>

        <div className="space-y-3">
          <div>
            <span className="text-sm font-semibold text-foreground">Permisos heredables</span>
            <p className="mt-2 text-xs leading-5 text-slate">
              Estos permisos se suman a la herencia del rol para todos los usuarios asignados al
              grupo.
            </p>
          </div>

          <PermissionCheckboxGrid
            inputName="permissionCodes"
            permissionGroups={permissionGroups}
            selectedCodes={[]}
          />
        </div>

        {formError ? <FormMessage tone="red" message={formError} /> : null}

        <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-5">
          <button type="button" className="button-secondary" onClick={onClose}>
            Cancelar
          </button>
          <SubmitButton
            idleLabel="Crear grupo"
            pendingLabel="Creando..."
            className="button-primary disabled:cursor-wait disabled:opacity-70"
          />
        </div>
      </form>
    </AdminDialog>
  );
}

function EditGroupModal({
  open,
  onClose,
  group,
  permissionGroups,
}: {
  open: boolean;
  onClose: () => void;
  group: AdminReaderGroupRecord;
  permissionGroups: AdminPermissionGroupRecord[];
}) {
  const [message, setMessage] = useState<{
    message: string;
    tone: "green" | "red" | "amber";
  } | null>(null);

  return (
    <AdminDialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-[1080px]"
      label="Configuracion de grupo"
      title={group.name}
      description="Edita estado, modo y herencia colectiva. La eliminacion solo avanza cuando no afecta asignaciones existentes."
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <StatusChip tone={group.isActive ? "green" : "red"}>
            {group.isActive ? "Activo" : "Inactivo"}
          </StatusChip>
          <StatusChip tone={group.mode === "General" ? "green" : "accent"}>{group.mode}</StatusChip>
          <StatusChip tone="slate">{group.memberCount} usuarios activos</StatusChip>
        </div>

        <form
          action={async (formData) => {
            setMessage(null);

            try {
              await updateReaderGroupAction(formData);
              setMessage({
                message: "El grupo se actualizo correctamente.",
                tone: "green",
              });
            } catch (error) {
              setMessage({
                message: getErrorMessage(error),
                tone: "red",
              });
            }
          }}
          className="space-y-5"
        >
          <input type="hidden" name="groupId" value={group.id} />

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-foreground">Codigo</span>
              <input className="field-input" defaultValue={group.code} readOnly disabled />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-foreground">Nombre</span>
              <input name="name" className="field-input" defaultValue={group.name} required />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_repeat(2,220px)]">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-foreground">Descripcion</span>
              <textarea
                name="description"
                className="field-textarea"
                rows={4}
                defaultValue={group.description || ""}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-foreground">Modo</span>
              <select name="mode" className="field-input" defaultValue={group.mode}>
                <option value="General">General</option>
                <option value="Restringido">Restringido</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-foreground">Estado</span>
              <select
                name="isActive"
                className="field-input"
                defaultValue={group.isActive ? "true" : "false"}
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </label>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-sm font-semibold text-foreground">Permisos heredables</span>
              <p className="mt-2 text-xs leading-5 text-slate">
                Los usuarios del grupo heredan esta capa adicional sobre el rol base.
              </p>
            </div>

            <PermissionCheckboxGrid
              inputName="permissionCodes"
              permissionGroups={permissionGroups}
              selectedCodes={group.permissionCodes}
            />
          </div>

          {message ? <FormMessage tone={message.tone} message={message.message} /> : null}

          <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-5">
            <button type="button" className="button-secondary" onClick={onClose}>
              Cerrar
            </button>
            <SubmitButton
              idleLabel="Guardar grupo"
              pendingLabel="Guardando..."
              className="button-primary disabled:cursor-wait disabled:opacity-70"
            />
          </div>
        </form>

        <form
          action={async (formData) => {
            const confirmationMessage =
              group.memberCount > 0
                ? "El grupo tiene usuarios activos asignados. No se puede eliminar hasta despejar esas asignaciones."
                : "El grupo se eliminara de forma permanente si no tiene asignaciones activas ni historicas. ¿Deseas continuar?";

            if (group.memberCount > 0) {
              setMessage({
                message: confirmationMessage,
                tone: "amber",
              });
              return;
            }

            if (!window.confirm(confirmationMessage)) {
              return;
            }

            setMessage(null);

            try {
              await deleteReaderGroupAction(formData);
              onClose();
            } catch (error) {
              setMessage({
                message: getErrorMessage(error),
                tone: "red",
              });
            }
          }}
          className="rounded-[22px] border border-red/18 bg-red-soft/70 p-5"
        >
          <input type="hidden" name="groupId" value={group.id} />

          <p className="section-label text-red">Eliminacion controlada</p>
          <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">
            Eliminar grupo
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate">
            Solo se permite cuando no existen usuarios activos asignados. Si el grupo ya forma
            parte de historial operativo, el backend bloqueara la eliminacion para proteger la
            consistencia.
          </p>

          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <button
              type="submit"
              disabled={group.memberCount > 0}
              className="inline-flex items-center justify-center rounded-full border border-red/18 bg-white px-4 py-2.5 text-sm font-semibold text-red disabled:cursor-not-allowed disabled:opacity-60"
            >
              Eliminar grupo
            </button>
          </div>
        </form>
      </div>
    </AdminDialog>
  );
}

function buildMetrics(readerGroups: AdminReaderGroupRecord[]): MetricCard[] {
  const activeGroups = readerGroups.filter((group) => group.isActive).length;
  const inactiveGroups = readerGroups.length - activeGroups;
  const totalMembers = readerGroups.reduce((total, group) => total + group.memberCount, 0);
  const collectivePermissions = readerGroups.reduce(
    (total, group) => total + group.permissionCodes.length,
    0,
  );

  return [
    {
      label: "Grupos activos",
      value: String(activeGroups).padStart(2, "0"),
      detail: "Disponibles para asignacion",
      tone: "green",
    },
    {
      label: "Usuarios segmentados",
      value: String(totalMembers).padStart(2, "0"),
      detail: "Asignaciones activas",
      tone: "accent",
    },
    {
      label: "Permisos colectivos",
      value: String(collectivePermissions).padStart(2, "0"),
      detail: "Herencia por grupo",
      tone: collectivePermissions > 0 ? "amber" : "green",
    },
    {
      label: "Grupos inactivos",
      value: String(inactiveGroups).padStart(2, "0"),
      detail: "Fuera de uso actual",
      tone: inactiveGroups > 0 ? "amber" : "green",
    },
  ];
}

function AdminDialog({
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

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Ocurrio un error inesperado al procesar la solicitud.";
}
