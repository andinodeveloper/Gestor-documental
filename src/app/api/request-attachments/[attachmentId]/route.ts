import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { canDownloadRequestAttachment } from "@/lib/server/file-access";
import { readStoredRequestAttachment } from "@/lib/server/request-storage";

export async function GET(
  _request: Request,
  context: { params: Promise<{ attachmentId: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Debes iniciar sesion." }, { status: 401 });
  }

  const { attachmentId } = await context.params;
  const attachment = await prisma.documentRequestAttachment.findUnique({
    where: { id: attachmentId },
    select: {
      originalFileName: true,
      mimeType: true,
      storagePath: true,
      documentRequest: {
        select: {
          requesterUserId: true,
        },
      },
    },
  });

  if (!attachment) {
    return NextResponse.json({ message: "El anexo solicitado no existe." }, { status: 404 });
  }

  if (!canDownloadRequestAttachment(user, attachment.documentRequest.requesterUserId)) {
    return NextResponse.json(
      { message: "No tienes permiso para descargar este anexo." },
      { status: 403 },
    );
  }

  try {
    const fileBuffer = await readStoredRequestAttachment(attachment.storagePath);

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": attachment.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(attachment.originalFileName)}`,
      },
    });
  } catch {
    return NextResponse.json(
      { message: "No fue posible leer el anexo solicitado." },
      { status: 500 },
    );
  }
}
