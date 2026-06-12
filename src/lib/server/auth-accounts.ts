import type { Prisma } from "@prisma/client";

import { expandDuiCandidates, maskEmail } from "@/lib/auth/identity";
import {
  authenticateLocalUser,
  beginPasswordRecovery as beginMockPasswordRecovery,
  findAccountByUsername as findMockAccountByUsername,
  updateMockAccountPassword,
} from "@/lib/auth/mock-accounts";
import type { AuthAccount } from "@/lib/auth/types";
import { prisma } from "@/lib/server/db";
import {
  collectReaderGroupPermissionCodes,
  collectRolePermissionCodes,
  collectUserPermissionOverrides,
  resolveAccessSummary,
  resolveEffectivePermissionCodes,
  resolvePrimaryAppRole,
} from "@/lib/server/authorization-model";
import { hashPassword } from "@/lib/server/password";
import { verifyPassword } from "@/lib/server/password";

const genericRecoveryMessage =
  "Si la identidad existe y tiene un correo registrado, se preparara una contrasena temporal para el siguiente ingreso.";

type DatabaseAuthUser = Prisma.UserGetPayload<{
  include: {
    roles: {
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true;
              };
            };
          };
        };
      };
    };
    readerGroups: {
      where: {
        revokedAt: null;
      };
      include: {
        readerGroup: {
          include: {
            permissions: {
              include: {
                permission: true;
              };
            };
          };
        };
      };
    };
    permissions: {
      include: {
        permission: true;
      };
    };
  };
}>;

export async function authenticateUser(credential: string, password: string) {
  if (getAuthMode() === "database") {
    return authenticateDatabaseUser(credential, password);
  }

  return authenticateLocalUser(credential, password);
}

export async function findAccountByUsername(username: string) {
  if (getAuthMode() === "database") {
    return findDatabaseAccountByUsername(username);
  }

  return findMockAccountByUsername(username);
}

export async function beginPasswordRecovery(credential: string) {
  if (getAuthMode() === "database") {
    return beginDatabasePasswordRecovery(credential);
  }

  return beginMockPasswordRecovery(credential);
}

export async function updateUserPassword(input: {
  mustChangePassword: boolean;
  password: string;
  userId: string;
}) {
  const normalizedPassword = input.password.trim();

  if (!input.userId.trim()) {
    throw new Error("No fue posible identificar al usuario autenticado.");
  }

  if (normalizedPassword.length < 8) {
    throw new Error("La nueva contrasena debe contener al menos 8 caracteres.");
  }

  if (getAuthMode() === "database") {
    await prisma.user.update({
      where: {
        id: input.userId,
      },
      data: {
        passwordHash: await hashPassword(normalizedPassword),
        mustChangePassword: input.mustChangePassword,
      },
    });

    return;
  }

  await updateMockAccountPassword({
    userId: input.userId,
    password: normalizedPassword,
    mustChangePassword: input.mustChangePassword,
  });
}

function getAuthMode() {
  return process.env.AUTH_MODE === "database" ? "database" : "local";
}

async function authenticateDatabaseUser(credential: string, password: string) {
  const user = await findDatabaseUserByCredential(credential);

  if (!user) {
    return { reason: "INVALID_CREDENTIALS" as const };
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);

  if (!isValidPassword) {
    return { reason: "INVALID_CREDENTIALS" as const };
  }

  const account = toAuthAccount(user);

  if (account.status !== "ACTIVE") {
    return { reason: "INACTIVE_ACCOUNT" as const };
  }

  return { account };
}

async function findDatabaseAccountByUsername(username: string) {
  const normalized = username.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      username: normalized,
    },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
      readerGroups: {
        where: {
          revokedAt: null,
        },
        include: {
          readerGroup: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
      permissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  return user ? toAuthAccount(user) : null;
}

async function findDatabaseAccountByCredential(credential: string) {
  const user = await findDatabaseUserByCredential(credential);
  return user ? toAuthAccount(user) : null;
}

async function beginDatabasePasswordRecovery(credential: string) {
  const account = await findDatabaseAccountByCredential(credential);

  if (!account) {
    return { message: genericRecoveryMessage };
  }

  if (!account.email) {
    return {
      message:
        "La cuenta no tiene correo registrado. En la integracion real este caso se derivara a restablecimiento manual por un administrador.",
    };
  }

  return {
    message: `Se dejo listo el restablecimiento para ${maskEmail(account.email)}. En la integracion real se emitira una contrasena temporal.`,
  };
}

async function findDatabaseUserByCredential(credential: string) {
  const normalized = credential.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  const duiCandidates = expandDuiCandidates(credential);

  return prisma.user.findFirst({
    where: {
      OR: [
        { username: normalized },
        { email: normalized },
        ...duiCandidates.map((dui) => ({ dui })),
      ],
    },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
      readerGroups: {
        where: {
          revokedAt: null,
        },
        include: {
          readerGroup: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
      permissions: {
        include: {
          permission: true,
        },
      },
    },
  });
}

function toAuthAccount(user: DatabaseAuthUser): AuthAccount {
  const role = resolvePrimaryAppRole(user.roles.map(({ role }) => role.code));
  const readerGroups = user.readerGroups
    .map(({ readerGroup }) => readerGroup.code)
    .sort((left, right) => left.localeCompare(right));
  const rolePermissions = collectRolePermissionCodes(user.roles);
  const groupPermissions = collectReaderGroupPermissionCodes(user.readerGroups);
  const { grantedPermissionCodes, revokedPermissionCodes } = collectUserPermissionOverrides(
    user.permissions,
  );
  const { effectivePermissionCodes } = resolveEffectivePermissionCodes({
    rolePermissionCodes: rolePermissions,
    groupPermissionCodes: groupPermissions,
    grantedPermissionCodes,
    revokedPermissionCodes,
  });

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role,
    permissions: effectivePermissionCodes,
    readerGroups,
    access: resolveAccessSummary(role, effectivePermissionCodes),
    email: user.email ?? undefined,
    dui: user.dui ?? undefined,
    mustChangePassword: user.mustChangePassword,
    status: user.isActive ? "ACTIVE" : "INACTIVE",
  };
}
