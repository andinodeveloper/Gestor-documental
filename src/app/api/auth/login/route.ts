import { NextResponse } from "next/server";

import { authenticateUser } from "@/lib/server/auth-accounts";
import { createUserSession, getAuthenticatedRedirectPath } from "@/lib/server/auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { credential?: string; password?: string }
    | null;

  const credential = body?.credential?.trim() ?? "";
  const password = body?.password ?? "";

  if (!credential || !password) {
    return NextResponse.json(
      { message: "Debes ingresar tu usuario, email o DUI y la contraseña." },
      { status: 400 },
    );
  }

  const result = await authenticateUser(credential, password);

  if ("reason" in result) {
    if (result.reason === "INACTIVE_ACCOUNT") {
      return NextResponse.json(
        {
          message:
            "La cuenta está inactiva. Debe ser reactivada por un administrador antes de permitir el ingreso.",
        },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { message: "Credenciales inválidas. Verifica el usuario, email o DUI y la contraseña." },
      { status: 401 },
    );
  }

  await createUserSession(result.account);

  return NextResponse.json({
    redirectTo: getAuthenticatedRedirectPath(result.account),
    mustChangePassword: result.account.mustChangePassword,
  });
}
