"use server";

import { revalidatePath } from "next/cache";

import { requireAuthorizedUser } from "@/lib/server/auth";
import {
  createAdminArea,
  updateAdminArea,
} from "@/lib/server/admin-catalog-service";

export async function createAdminAreaAction(formData: FormData) {
  await requirePermission("/admin/catalogs", "catalogs.manage");

  await createAdminArea({
    code: readText(formData.get("code")),
    name: readText(formData.get("name")),
    description: readOptionalText(formData.get("description")),
    sortOrder: readNumber(formData.get("sortOrder"), 0),
  });

  revalidateAdminCatalogs();
}

export async function updateAdminAreaAction(formData: FormData) {
  const user = await requirePermission("/admin/catalogs", "catalogs.manage");
  const areaId = readText(formData.get("areaId"));

  if (!areaId) {
    throw new Error("Debes indicar el area a actualizar.");
  }

  await updateAdminArea({
    actorUserId: user.id,
    areaId,
    name: readText(formData.get("name")),
    description: readOptionalText(formData.get("description")),
    isActive: readBooleanSelect(formData.get("isActive"), true),
    replacementAreaId: readOptionalText(formData.get("replacementAreaId")),
    sortOrder: readNumber(formData.get("sortOrder"), 0),
  });

  revalidateAdminCatalogs();
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

function readNumber(value: FormDataEntryValue | null, defaultValue: number) {
  const normalized = Number(readText(value));
  return Number.isFinite(normalized) ? normalized : defaultValue;
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

function revalidateAdminCatalogs() {
  revalidatePath("/admin/catalogs");
  revalidatePath("/admin/users");
  revalidatePath("/admin/groups");
  revalidatePath("/admin/roles");
  revalidatePath("/admin/permissions");
  revalidatePath("/dashboard");
  revalidatePath("/explorer");
  revalidatePath("/requests");
}
