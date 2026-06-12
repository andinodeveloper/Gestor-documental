import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { canAccessPath, getDefaultRouteForRole } from "@/lib/auth/policy";
import { createSessionToken, getSessionCookieMaxAge, SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import type { AuthAccount, SessionUser } from "@/lib/auth/types";
import { findAccountByUsername } from "@/lib/server/auth-accounts";

export const PASSWORD_CHANGE_PATH = "/change-password";

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  const payload = await verifySessionToken(sessionToken);

  if (!payload) {
    return null;
  }

  const account = await findAccountByUsername(payload.sub);

  if (!account || account.status !== "ACTIVE") {
    return null;
  }

  return toSessionUser(account);
});

export async function createUserSession(account: AuthAccount) {
  const cookieStore = await cookies();
  const sessionToken = await createSessionToken({
    username: account.username,
    role: account.role,
  });

  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getSessionCookieMaxAge(),
  });
}

export async function destroyUserSession() {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function redirectIfAuthenticated() {
  const user = await getCurrentUser();

  if (user) {
    redirect(getAuthenticatedRedirectPath(user));
  }
}

export async function requireAuthorizedUser(pathname: string) {
  const user = await requireCurrentUser();

  if (user.mustChangePassword) {
    redirect(PASSWORD_CHANGE_PATH);
  }

  if (!canAccessPath(user, pathname)) {
    redirect(getDefaultRouteForRole(user.role));
  }

  return user;
}

export function getAuthenticatedRedirectPath(
  user: Pick<SessionUser, "mustChangePassword" | "role">,
) {
  if (user.mustChangePassword) {
    return PASSWORD_CHANGE_PATH;
  }

  return getDefaultRouteForRole(user.role);
}

function toSessionUser(account: AuthAccount): SessionUser {
  return {
    id: account.id,
    name: account.name,
    username: account.username,
    role: account.role,
    permissions: account.permissions,
    readerGroups: account.readerGroups,
    access: account.access,
    email: account.email,
    dui: account.dui,
    mustChangePassword: account.mustChangePassword,
  };
}
