import type { AdminPermissionGroupRecord } from "@/lib/server/admin-console-service";

export function PermissionCheckboxGrid({
  inputName,
  permissionGroups,
  selectedCodes,
}: {
  inputName: string;
  permissionGroups: AdminPermissionGroupRecord[];
  selectedCodes: readonly string[];
}) {
  const selectedCodeSet = new Set(selectedCodes);

  return (
    <div className="space-y-4">
      {permissionGroups.map((group) => (
        <section key={group.module} className="rounded-[20px] border border-line bg-panel-muted/35 p-4">
          <div className="border-b border-line pb-3">
            <p className="section-label">Modulo</p>
            <h3 className="mt-2 text-base font-semibold tracking-[-0.02em] text-foreground">
              {group.label}
            </h3>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {group.permissions.map((permission) => (
              <label
                key={permission.id}
                className="flex cursor-pointer gap-3 rounded-[18px] border border-line bg-white/90 px-4 py-3 transition hover:border-line-strong hover:bg-white"
              >
                <input
                  type="checkbox"
                  name={inputName}
                  value={permission.code}
                  defaultChecked={selectedCodeSet.has(permission.code)}
                  className="mt-1 h-4 w-4 rounded border-line text-accent focus:ring-accent"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{permission.code}</p>
                  <p className="mt-1 text-xs leading-5 text-slate">
                    {permission.description || permission.action}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function PermissionOverrideGrid({
  permissionGroups,
  grantedCodes,
  revokedCodes,
}: {
  permissionGroups: AdminPermissionGroupRecord[];
  grantedCodes: readonly string[];
  revokedCodes: readonly string[];
}) {
  const grantedCodeSet = new Set(grantedCodes);
  const revokedCodeSet = new Set(revokedCodes);

  return (
    <div className="space-y-4">
      <div className="rounded-[20px] border border-line bg-panel-muted/45 px-4 py-4 text-sm leading-6 text-slate">
        Elige el comportamiento por permiso:
        <span className="ml-2 font-semibold text-foreground">Heredar</span>,
        <span className="ml-2 font-semibold text-green">Conceder</span> o
        <span className="ml-2 font-semibold text-red">Quitar</span>.
      </div>

      {permissionGroups.map((group) => (
        <section key={group.module} className="rounded-[20px] border border-line bg-panel-muted/35 p-4">
          <div className="border-b border-line pb-3">
            <p className="section-label">Modulo</p>
            <h3 className="mt-2 text-base font-semibold tracking-[-0.02em] text-foreground">
              {group.label}
            </h3>
          </div>

          <div className="mt-4 space-y-3">
            {group.permissions.map((permission) => {
              const defaultMode = revokedCodeSet.has(permission.code)
                ? "REVOKE"
                : grantedCodeSet.has(permission.code)
                  ? "GRANT"
                  : "INHERIT";
              const inputName = `permissionOverride:${permission.code}`;

              return (
                <div
                  key={permission.id}
                  className="rounded-[18px] border border-line bg-white/90 px-4 py-3"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{permission.code}</p>
                      <p className="mt-1 text-xs leading-5 text-slate">
                        {permission.description || permission.action}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex items-center gap-2 rounded-full border border-line bg-panel-muted/55 px-3 py-1.5 text-xs font-semibold text-slate">
                        <input
                          type="radio"
                          name={inputName}
                          value="INHERIT"
                          defaultChecked={defaultMode === "INHERIT"}
                          className="h-4 w-4 border-line text-accent focus:ring-accent"
                        />
                        Heredar
                      </label>
                      <label className="inline-flex items-center gap-2 rounded-full border border-green/18 bg-green-soft/70 px-3 py-1.5 text-xs font-semibold text-green">
                        <input
                          type="radio"
                          name={inputName}
                          value="GRANT"
                          defaultChecked={defaultMode === "GRANT"}
                          className="h-4 w-4 border-line text-green focus:ring-green"
                        />
                        Conceder
                      </label>
                      <label className="inline-flex items-center gap-2 rounded-full border border-red/18 bg-red-soft/70 px-3 py-1.5 text-xs font-semibold text-red">
                        <input
                          type="radio"
                          name={inputName}
                          value="REVOKE"
                          defaultChecked={defaultMode === "REVOKE"}
                          className="h-4 w-4 border-line text-red focus:ring-red"
                        />
                        Quitar
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
