"use server";

import { revalidatePath } from "next/cache";

import { requireAuthorizedUser } from "@/lib/server/auth";
import { updateRoleConfiguration } from "@/lib/server/admin-console-service";

export async function updateRoleConfigurationAction(formData: FormData) {
  const user = await requireAuthorizedUser("/admin/roles");

  if (!user.permissions.includes("roles.manage")) {
    throw new Error("Tu usuario no tiene permiso para administrar roles.");
  }

  const roleId = readText(formData.get("roleId"));

  if (!roleId) {
    throw new Error("Debes indicar el rol a actualizar.");
  }

  await updateRoleConfiguration({
    roleId,
    name: readText(formData.get("name")),
    description: readOptionalText(formData.get("description")),
    permissionCodes: readMultiValue(formData.getAll("permissionCodes")),
  });

  revalidatePath("/admin/roles");
  revalidatePath("/admin/groups");
  revalidatePath("/admin/users");
  revalidatePath("/admin/permissions");
  revalidatePath("/dashboard");
  revalidatePath("/explorer");
  revalidatePath("/requests");
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
