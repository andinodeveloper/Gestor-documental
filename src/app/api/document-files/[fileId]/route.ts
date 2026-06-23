import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { readStoredDocumentFile } from "@/lib/server/document-storage";
import { canDownloadDocumentFile } from "@/lib/server/file-access";

export async function GET(
  _request: Request,
  context: { params: Promise<{ fileId: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Debes iniciar sesion." }, { status: 401 });
  }

  const { fileId } = await context.params;
  const file = await prisma.documentFile.findUnique({
    where: { id: fileId },
    select: {
      originalFileName: true,
      mimeType: true,
      storagePath: true,
      fileRole: true,
    },
  });

  if (!file) {
    return NextResponse.json({ message: "El archivo solicitado no existe." }, { status: 404 });
  }

  if (!canDownloadDocumentFile(user)) {
    return NextResponse.json(
      { message: "No tienes permiso para descargar este archivo." },
      { status: 403 },
    );
  }

  try {
    const fileBuffer = await readStoredDocumentFile(file.storagePath);

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.originalFileName)}`,
        "X-Document-File-Role": file.fileRole,
      },
    });
  } catch {
    return NextResponse.json(
      { message: "No fue posible leer el archivo documental." },
      { status: 500 },
    );
  }
}
