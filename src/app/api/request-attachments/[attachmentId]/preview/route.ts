import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { canAccessRequestAttachment } from "@/lib/server/file-access";
import {
  buildStoredFilePreviewResponse,
  createPreviewErrorResponse,
} from "@/lib/server/file-preview";

export async function GET(
  _request: Request,
  context: { params: Promise<{ attachmentId: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return createPreviewErrorResponse({
      description: "Debes iniciar sesion para abrir esta vista previa.",
      status: 401,
      title: "Acceso requerido",
    });
  }

  const { attachmentId } = await context.params;
  const attachment = await prisma.documentRequestAttachment.findUnique({
    where: { id: attachmentId },
    select: {
      mimeType: true,
      originalFileName: true,
      storagePath: true,
      documentRequest: {
        select: {
          requesterUserId: true,
        },
      },
    },
  });

  if (!attachment) {
    return createPreviewErrorResponse({
      description: "El anexo solicitado ya no existe.",
      status: 404,
      title: "Anexo no encontrado",
    });
  }

  if (!canAccessRequestAttachment(user, attachment.documentRequest.requesterUserId)) {
    return createPreviewErrorResponse({
      description: "No tienes permiso para abrir esta vista previa.",
      status: 403,
      title: attachment.originalFileName,
    });
  }

  try {
    return await buildStoredFilePreviewResponse({
      fileId: attachmentId,
      mimeType: attachment.mimeType,
      originalFileName: attachment.originalFileName,
      storagePath: attachment.storagePath,
    });
  } catch (error) {
    return createPreviewErrorResponse({
      description:
        error instanceof Error
          ? error.message
          : "No fue posible generar la vista previa del anexo.",
      status: 500,
      title: attachment.originalFileName,
    });
  }
}
