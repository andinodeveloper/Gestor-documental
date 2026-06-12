"use server";

import { revalidatePath } from "next/cache";

import { requireAuthorizedUser } from "@/lib/server/auth";
import {
  createReaderGroup,
  deleteReaderGroup,
  updateReaderGroup,
} from "@/lib/server/admin-console-service";

export async function createReaderGroupAction(formData: FormData) {
  await requirePermission("/admin/groups", "reader_groups.manage");

  await createReaderGroup({
    code: readText(formData.get("code")),
    name: readText(formData.get("name")),
    description: readOptionalText(formData.get("description")),
    mode: readGroupMode(formData.get("mode")),
    permissionCodes: readMultiValue(formData.getAll("permissionCodes")),
  });

  revalidateAdminWorkspace();
}

export async function updateReaderGroupAction(formData: FormData) {
  await requirePermission("/admin/groups", "reader_groups.manage");

  const groupId = readText(formData.get("groupId"));

  if (!groupId) {
    throw new Error("Debes indicar el grupo lector a actualizar.");
  }

  await updateReaderGroup({
    groupId,
    name: readText(formData.get("name")),
    description: readOptionalText(formData.get("description")),
    mode: readGroupMode(formData.get("mode")),
    isActive: readBooleanSelect(formData.get("isActive"), true),
    permissionCodes: readMultiValue(formData.getAll("permissionCodes")),
  });

  revalidateAdminWorkspace();
}

export async function deleteReaderGroupAction(formData: FormData) {
  await requirePermission("/admin/groups", "reader_groups.manage");

  const groupId = readText(formData.get("groupId"));

  if (!groupId) {
    throw new Error("Debes indicar el grupo lector a eliminar.");
  }

  await deleteReaderGroup({
    groupId,
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

function readGroupMode(value: FormDataEntryValue | null) {
  const normalized = readText(value);

  if (normalized === "General" || normalized === "Restringido") {
    return normalized;
  }

  throw new Error("Debes seleccionar el modo del grupo lector.");
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
