import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { canPreviewDocumentFile } from "@/lib/server/file-access";
import {
  buildStoredFilePreviewResponse,
  createPreviewErrorResponse,
} from "@/lib/server/file-preview";

export async function GET(
  _request: Request,
  context: { params: Promise<{ fileId: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return createPreviewErrorResponse({
      description: "Debes iniciar sesion para abrir esta vista previa.",
      status: 401,
      title: "Acceso requerido",
    });
  }

  const { fileId } = await context.params;
  const file = await prisma.documentFile.findUnique({
    where: { id: fileId },
    select: {
      fileRole: true,
      mimeType: true,
      originalFileName: true,
      storagePath: true,
    },
  });

  if (!file) {
    return createPreviewErrorResponse({
      description: "El archivo documental solicitado ya no existe.",
      status: 404,
      title: "Archivo no encontrado",
    });
  }

  if (!canPreviewDocumentFile(user, file.fileRole)) {
    return createPreviewErrorResponse({
      description: "No tienes permiso para abrir esta vista previa.",
      status: 403,
      title: file.originalFileName,
    });
  }

  try {
    return await buildStoredFilePreviewResponse({
      fileId,
      mimeType: file.mimeType,
      originalFileName: file.originalFileName,
      storagePath: file.storagePath,
    });
  } catch (error) {
    return createPreviewErrorResponse({
      description:
        error instanceof Error
          ? error.message
          : "No fue posible generar la vista previa del archivo documental.",
      status: 500,
      title: file.originalFileName,
    });
  }
}
