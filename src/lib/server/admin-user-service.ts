import { prisma } from "@/lib/server/db";
import { runtimeConfig } from "@/lib/config/runtime";
import { REQUESTS_CREATE_PERMISSION } from "@/lib/auth/permissions";

export async function setReaderRequestCreatePermission({
  enabled,
  userId,
}: {
  enabled: boolean;
  userId: string;
}) {
  if (runtimeConfig.authMode !== "database") {
    throw new Error("La edicion de permisos directos solo esta disponible en modo database.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("No se encontro el usuario seleccionado.");
  }

  const isReader = user.roles.some(({ role }) => role.code === "READER");

  if (!isReader) {
    throw new Error("El permiso individual de solicitudes solo aplica a usuarios lectores.");
  }

  const permission = await prisma.permission.findUnique({
    where: {
      code: REQUESTS_CREATE_PERMISSION,
    },
    select: {
      id: true,
    },
  });

  if (!permission) {
    throw new Error("El permiso requests.create no esta configurado en la base.");
  }

  if (enabled) {
    await prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        userId,
        permissionId: permission.id,
      },
    });

    return;
  }

  await prisma.userPermission.deleteMany({
    where: {
      userId,
      permissionId: permission.id,
    },
  });
}
