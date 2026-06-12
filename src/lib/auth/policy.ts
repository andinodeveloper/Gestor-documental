import { canCreateDocumentRequests, hasPermission } from "@/lib/auth/permissions";
import type { AppPermissionCode, AppRole, SessionUser } from "@/lib/auth/types";
import { navigationItems } from "@/lib/navigation";
import type { NavigationItem } from "@/lib/types";

const roleRoutes: Record<AppRole, string> = {
  ADMINISTRATOR: "/dashboard",
  EDITOR: "/dashboard",
  READER: "/explorer",
};

const pathPolicies: Array<{ prefix: string; allowedRoles: AppRole[] }> = [
  { prefix: "/dashboard", allowedRoles: ["ADMINISTRATOR", "EDITOR"] },
  { prefix: "/requests", allowedRoles: ["ADMINISTRATOR", "EDITOR", "READER"] },
  { prefix: "/documents", allowedRoles: ["ADMINISTRATOR", "EDITOR"] },
  { prefix: "/reviews", allowedRoles: ["ADMINISTRATOR", "EDITOR"] },
  { prefix: "/explorer", allowedRoles: ["ADMINISTRATOR", "EDITOR", "READER"] },
  { prefix: "/ai", allowedRoles: ["ADMINISTRATOR", "EDITOR", "READER"] },
  { prefix: "/admin", allowedRoles: ["ADMINISTRATOR"] },
];

export const roleLabels: Record<AppRole, string> = {
  ADMINISTRATOR: "Administrador",
  EDITOR: "Editor",
  READER: "Lector",
};

export function getDefaultRouteForRole(role: AppRole) {
  return roleRoutes[role];
}

export function getDefaultRouteForUser(user: Pick<SessionUser, "role">) {
  return getDefaultRouteForRole(user.role);
}

export function getNavigationForRole(role: AppRole): NavigationItem[] {
  return navigationItems.filter((item) => item.allowedRoles.includes(role));
}

export function getNavigationForUser(user: Pick<SessionUser, "role" | "permissions">) {
  return getNavigationForRole(user.role).filter((item) => {
    if (item.href !== "/requests") {
      return true;
    }

    return user.role !== "READER" || canCreateDocumentRequests(user);
  });
}

export function canAccessPath(
  user: Pick<SessionUser, "role" | "permissions">,
  pathname: string,
) {
  const policy = pathPolicies.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!policy) {
    return true;
  }

  if (!policy.allowedRoles.includes(user.role)) {
    return false;
  }

  if (pathname === "/requests" || pathname.startsWith("/requests/")) {
    if (user.role === "READER" && !canCreateDocumentRequests(user)) {
      return false;
    }
  }

  return true;
}

export function userHasPermission(
  user: Pick<SessionUser, "permissions">,
  permissionCode: AppPermissionCode,
) {
  return hasPermission(user, permissionCode);
}

export function userCanCreateRequests(user: Pick<SessionUser, "permissions">) {
  return canCreateDocumentRequests(user);
}
