"use server";

import { revalidatePath } from "next/cache";

import type { AppRole } from "@/lib/auth/types";
import { requireAuthorizedUser } from "@/lib/server/auth";
import {
  createAdminUser,
  deactivateAdminUser,
  resetAdminUserPassword,
  updateAdminUserConfiguration,
} from "@/lib/server/admin-console-service";

export async function createAdminUserAction(formData: FormData) {
  const user = await requirePermission("/admin/users", "users.manage");
  const permissionOverrides = readPermissionOverrides(formData);

  await createAdminUser({
    actorUser: user,
    name: readText(formData.get("name")),
    username: readText(formData.get("username")),
    email: readOptionalText(formData.get("email")),
    dui: readOptionalText(formData.get("dui")),
    password: readText(formData.get("password")),
    roleCode: readRoleCode(formData.get("roleCode")),
    isActive: readBooleanSelect(formData.get("isActive"), true),
    mustChangePassword: readBooleanSelect(formData.get("mustChangePassword"), true),
    readerGroupIds: user.permissions.includes("reader_groups.manage")
      ? readMultiValue(formData.getAll("readerGroupIds"))
      : undefined,
    grantedPermissionCodes: permissionOverrides.grantedPermissionCodes,
    revokedPermissionCodes: permissionOverrides.revokedPermissionCodes,
  });

  revalidateAdminWorkspace();
}

export async function updateAdminUserConfigurationAction(formData: FormData) {
  const user = await requirePermission("/admin/users", "users.manage");
  const userId = readText(formData.get("userId"));
  const permissionOverrides = readPermissionOverrides(formData);

  if (!userId) {
    throw new Error("Debes indicar el usuario a actualizar.");
  }

  await updateAdminUserConfiguration({
    actorUser: user,
    userId,
    name: readText(formData.get("name")),
    email: readOptionalText(formData.get("email")),
    dui: readOptionalText(formData.get("dui")),
    roleCode: readRoleCode(formData.get("roleCode")),
    isActive: readBooleanSelect(formData.get("isActive"), true),
    mustChangePassword: readBooleanSelect(formData.get("mustChangePassword"), false),
    readerGroupIds: user.permissions.includes("reader_groups.manage")
      ? readMultiValue(formData.getAll("readerGroupIds"))
      : undefined,
    grantedPermissionCodes: permissionOverrides.grantedPermissionCodes,
    revokedPermissionCodes: permissionOverrides.revokedPermissionCodes,
  });

  revalidateAdminWorkspace();
}

export async function resetAdminUserPasswordAction(formData: FormData) {
  await requirePermission("/admin/users", "users.manage");

  const userId = readText(formData.get("userId"));
  const password = readText(formData.get("password"));

  if (!userId || !password) {
    throw new Error("Debes indicar el usuario y la contrasena temporal.");
  }

  await resetAdminUserPassword({
    userId,
    password,
    mustChangePassword: readBooleanSelect(formData.get("mustChangePassword"), true),
  });

  revalidateAdminWorkspace();
}

export async function deactivateAdminUserAction(formData: FormData) {
  await requirePermission("/admin/users", "users.manage");

  const userId = readText(formData.get("userId"));

  if (!userId) {
    throw new Error("Debes indicar el usuario a desactivar.");
  }

  await deactivateAdminUser({
    userId,
  });

  revalidateAdminWorkspace();
}

async function requirePermission(pathname: string, permissionCode: string) {
  const user = await requireAuthorizedUser(pathname);

  if (!user.permissions.includes(permissionCode)) {
    throw new Error("Tu usuario no tiene permiso para esta accion administrativa.");
  }

  return user;
}

function readText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalText(value: FormDataEntryValue | null) {
  const text = readText(value);
  return text || undefined;
}

function readMultiValue(values: FormDataEntryValue[]) {
  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

function readPermissionOverrides(formData: FormData) {
  const grantedPermissionCodes: string[] = [];
  const revokedPermissionCodes: string[] = [];

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("permissionOverride:") || typeof value !== "string") {
      continue;
    }

    const permissionCode = key.slice("permissionOverride:".length).trim();
    const mode = value.trim().toUpperCase();

    if (!permissionCode) {
      continue;
    }

    if (mode === "GRANT") {
      grantedPermissionCodes.push(permissionCode);
    }

    if (mode === "REVOKE") {
      revokedPermissionCodes.push(permissionCode);
    }
  }

  return {
    grantedPermissionCodes,
    revokedPermissionCodes,
  };
}

function readBooleanSelect(value: FormDataEntryValue | null, defaultValue: boolean) {
  const normalized = readText(value).toLowerCase();

  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  return defaultValue;
}

function readRoleCode(value: FormDataEntryValue | null): AppRole {
  const normalized = readText(value);

  if (normalized === "ADMINISTRATOR" || normalized === "EDITOR" || normalized === "READER") {
    return normalized;
  }

  throw new Error("Debes seleccionar un rol base valido.");
}

function revalidateAdminWorkspace() {
  revalidatePath("/admin/users");
  revalidatePath("/admin/groups");
  revalidatePath("/admin/roles");
  revalidatePath("/admin/permissions");
  revalidatePath("/dashboard");
  revalidatePath("/explorer");
  revalidatePath("/requests");
}
