import { NextResponse } from "next/server";

import { beginPasswordRecovery } from "@/lib/server/auth-accounts";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { credential?: string }
    | null;
  const credential = body?.credential?.trim() ?? "";

  if (!credential) {
    return NextResponse.json(
      { message: "Debes indicar usuario, email o DUI para iniciar el restablecimiento." },
      { status: 400 },
    );
  }

  const result = await beginPasswordRecovery(credential);

  return NextResponse.json(result);
}
