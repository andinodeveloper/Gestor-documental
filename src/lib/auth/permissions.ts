import type { AppPermissionCode, AppRole, SessionUser } from "@/lib/auth/types";

export const REQUESTS_CREATE_PERMISSION = "requests.create";

const rolePermissions: Record<AppRole, AppPermissionCode[]> = {
  ADMINISTRATOR: [REQUESTS_CREATE_PERMISSION],
  EDITOR: [REQUESTS_CREATE_PERMISSION],
  READER: [],
};

export function getDefaultPermissionsForRole(role: AppRole) {
  return rolePermissions[role] ?? [];
}

export function mergePermissions(...permissionSets: Array<ReadonlyArray<AppPermissionCode>>) {
  return [...new Set(permissionSets.flat().filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );
}

export function hasPermission(user: Pick<SessionUser, "permissions">, permissionCode: AppPermissionCode) {
  return user.permissions.includes(permissionCode);
}

export function canCreateDocumentRequests(user: Pick<SessionUser, "permissions">) {
  return hasPermission(user, REQUESTS_CREATE_PERMISSION);
}
