import { REQUESTS_CREATE_PERMISSION, mergePermissions } from "@/lib/auth/permissions";
import { APP_ROLES, type AppPermissionCode, type AppRole } from "@/lib/auth/types";

const rolePriority: AppRole[] = ["ADMINISTRATOR", "EDITOR", "READER"];

const accessLabels: Record<AppRole, string> = {
  ADMINISTRATOR: "Total",
  EDITOR: "Operativo + documental",
  READER: "Lectura controlada",
};

type RolePermissionCarrier = {
  role: {
    code: string;
    permissions?: Array<{
      permission: {
        code: string;
      };
    }>;
  };
};

type ReaderGroupPermissionCarrier = {
  readerGroup: {
    permissions?: Array<{
      permission: {
        code: string;
      };
    }>;
  };
};

type UserPermissionOverrideCarrier = {
  effect: string;
  permission: {
    code: string;
  };
};

export function isAppRoleCode(roleCode: string): roleCode is AppRole {
  return APP_ROLES.includes(roleCode as AppRole);
}

export function resolvePrimaryAppRole(roleCodes: string[]) {
  const matchedRoleCodes = roleCodes
    .filter((roleCode): roleCode is AppRole => isAppRoleCode(roleCode))
    .sort((left, right) => rolePriority.indexOf(left) - rolePriority.indexOf(right));

  return matchedRoleCodes[0] ?? "READER";
}

export function collectRolePermissionCodes(roles: RolePermissionCarrier[]): AppPermissionCode[] {
  return mergePermissions(
    ...roles.map(({ role }) => role.permissions?.map(({ permission }) => permission.code) ?? []),
  );
}

export function collectReaderGroupPermissionCodes(
  readerGroups: ReaderGroupPermissionCarrier[],
): AppPermissionCode[] {
  return mergePermissions(
    ...readerGroups.map(
      ({ readerGroup }) =>
        readerGroup.permissions?.map(({ permission }) => permission.code) ?? [],
    ),
  );
}

export function collectUserPermissionOverrides(
  overrides: UserPermissionOverrideCarrier[],
) {
  const grantedPermissionCodes = overrides
    .filter((override) => override.effect !== "REVOKE")
    .map(({ permission }) => permission.code)
    .sort((left, right) => left.localeCompare(right));
  const revokedPermissionCodes = overrides
    .filter((override) => override.effect === "REVOKE")
    .map(({ permission }) => permission.code)
    .sort((left, right) => left.localeCompare(right));

  return {
    grantedPermissionCodes,
    revokedPermissionCodes,
  };
}

export function resolveEffectivePermissionCodes(input: {
  grantedPermissionCodes?: readonly AppPermissionCode[];
  groupPermissionCodes?: readonly AppPermissionCode[];
  revokedPermissionCodes?: readonly AppPermissionCode[];
  rolePermissionCodes: readonly AppPermissionCode[];
}) {
  const inheritedPermissionCodes = mergePermissions(
    input.rolePermissionCodes,
    input.groupPermissionCodes ?? [],
  );
  const revokedPermissionSet = new Set(input.revokedPermissionCodes ?? []);
  const effectivePermissionCodes = mergePermissions(
    inheritedPermissionCodes,
    input.grantedPermissionCodes ?? [],
  ).filter((permissionCode) => !revokedPermissionSet.has(permissionCode));

  return {
    inheritedPermissionCodes,
    effectivePermissionCodes,
  };
}

export function resolveAccessSummary(
  role: AppRole,
  effectivePermissionCodes: readonly string[],
) {
  if (role === "READER" && effectivePermissionCodes.includes(REQUESTS_CREATE_PERMISSION)) {
    return "Lectura + solicitudes";
  }

  return accessLabels[role];
}
