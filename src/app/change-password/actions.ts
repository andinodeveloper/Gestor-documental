"use server";

import { getDefaultRouteForRole } from "@/lib/auth/policy";
import { requireCurrentUser } from "@/lib/server/auth";
import { updateUserPassword } from "@/lib/server/auth-accounts";

export async function completeMandatoryPasswordChangeAction(formData: FormData) {
  const user = await requireCurrentUser();

  if (!user.mustChangePassword) {
    return {
      ok: true,
      redirectTo: getDefaultRouteForRole(user.role),
    };
  }

  const password = readText(formData.get("password"));
  const confirmPassword = readText(formData.get("confirmPassword"));

  if (!password || !confirmPassword) {
    return {
      ok: false,
      message: "Debes indicar la nueva contrasena y su confirmacion.",
    };
  }

  if (password !== confirmPassword) {
    return {
      ok: false,
      message: "La confirmacion no coincide con la nueva contrasena.",
    };
  }

  await updateUserPassword({
    userId: user.id,
    password,
    mustChangePassword: false,
  });

  return {
    ok: true,
    redirectTo: getDefaultRouteForRole(user.role),
  };
}

function readText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}
