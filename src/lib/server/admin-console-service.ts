import type { Prisma } from "@prisma/client";

import { REQUESTS_CREATE_PERMISSION } from "@/lib/auth/permissions";
import { roleLabels } from "@/lib/auth/policy";
import { APP_ROLES, type AppRole, type SessionUser } from "@/lib/auth/types";
import { runtimeConfig } from "@/lib/config/runtime";
import { prisma } from "@/lib/server/db";
import { hashPassword } from "@/lib/server/password";
import {
  collectReaderGroupPermissionCodes,
  collectRolePermissionCodes,
  collectUserPermissionOverrides,
  isAppRoleCode,
  resolveAccessSummary,
  resolveEffectivePermissionCodes,
  resolvePrimaryAppRole,
} from "@/lib/server/authorization-model";

export interface AdminPermissionRecord {
  id: string;
  code: string;
  module: string;
  action: string;
  description?: string;
  directGrantUserCount: number;
  directRevokeUserCount: number;
  readerGroupCodes: string[];
  roleCodes: string[];
}

export interface AdminPermissionGroupRecord {
  label: string;
  module: string;
  permissions: AdminPermissionRecord[];
}

export interface AdminRoleRecord {
  id: string;
  code: string;
  name: string;
  description?: string;
  isBaseRole: boolean;
  isSystemRole: boolean;
  memberCount: number;
  permissionCodes: string[];
}

export interface AdminReaderGroupRecord {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  memberCount: number;
  mode: "General" | "Restringido";
  permissionCodes: string[];
  sortOrder: number;
}

export interface AdminUserTraceabilityRecord {
  auditEvents: number;
  documentsAuthored: number;
  documentsOwned: number;
  requestParticipations: number;
  reviewParticipations: number;
  totalLinkedRecords: number;
}

export interface AdminUserRecord {
  id: string;
  name: string;
  username: string;
  email?: string;
  dui?: string;
  roleCode: AppRole;
  roleLabel: string;
  allRoleCodes: string[];
  readerGroupCodes: string[];
  readerGroupIds: string[];
  status: "Activo" | "Inactivo";
  access: string;
  canCreateRequests: boolean;
  grantedPermissionCodes: string[];
  revokedPermissionCodes: string[];
  inheritedPermissionCodes: string[];
  effectivePermissionCodes: string[];
  mustChangePassword: boolean;
  traceability: AdminUserTraceabilityRecord;
}

export interface AdminConsoleSnapshot {
  isDatabaseMode: boolean;
  permissionGroups: AdminPermissionGroupRecord[];
  permissions: AdminPermissionRecord[];
  readerGroups: AdminReaderGroupRecord[];
  roles: AdminRoleRecord[];
  users: AdminUserRecord[];
}

type AdminDatabaseUser = Prisma.UserGetPayload<{
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

type AdminDatabaseRole = Prisma.RoleGetPayload<{
  include: {
    permissions: {
      include: {
        permission: true;
      };
    };
    users: true;
  };
}>;

type AdminDatabasePermission = Prisma.PermissionGetPayload<{
  include: {
    readerGroups: {
      include: {
        readerGroup: true;
      };
    };
    roles: {
      include: {
        role: true;
      };
    };
    users: true;
  };
}>;

type AdminDatabaseReaderGroup = Prisma.ReaderGroupGetPayload<{
  include: {
    permissions: {
      include: {
        permission: true;
      };
    };
    users: {
      where: {
        revokedAt: null;
      };
    };
  };
}>;

export async function getAdminConsoleSnapshot(): Promise<AdminConsoleSnapshot> {
  if (runtimeConfig.authMode !== "database") {
    return {
      isDatabaseMode: false,
      users: [],
      roles: [],
      permissions: [],
      readerGroups: [],
      permissionGroups: [],
    };
  }

  const [users, roles, permissions, readerGroups] = await Promise.all([
    prisma.user.findMany({
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
      orderBy: [{ name: "asc" }],
    }),
    prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        users: true,
      },
      orderBy: [{ code: "asc" }],
    }),
    prisma.permission.findMany({
      include: {
        readerGroups: {
          include: {
            readerGroup: true,
          },
        },
        roles: {
          include: {
            role: true,
          },
        },
        users: true,
      },
      orderBy: [{ module: "asc" }, { action: "asc" }],
    }),
    prisma.readerGroup.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        users: {
          where: {
            revokedAt: null,
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    }),
  ]);

  const permissionRecords = permissions.map(mapPermissionRecord);
  const traceabilityIndex = await buildUserTraceabilityIndex(users.map((user) => user.id));

  return {
    isDatabaseMode: true,
    users: users.map((user) =>
      mapUserRecord(user, traceabilityIndex.get(user.id) ?? getEmptyUserTraceabilityRecord()),
    ),
    roles: roles.map(mapRoleRecord),
    permissions: permissionRecords,
    readerGroups: readerGroups.map(mapReaderGroupRecord),
    permissionGroups: groupPermissionsByModule(permissionRecords),
  };
}

export async function createAdminUser(input: {
  actorUser: SessionUser;
  dui?: string;
  email?: string;
  grantedPermissionCodes: string[];
  isActive: boolean;
  mustChangePassword: boolean;
  name: string;
  password: string;
  readerGroupIds?: string[];
  revokedPermissionCodes: string[];
  roleCode: AppRole;
  username: string;
}) {
  ensureDatabaseMode();
  validateUserDraft({
    name: input.name,
    password: input.password,
    roleCode: input.roleCode,
    username: input.username,
  });

  const normalizedUsername = normalizeUsername(input.username);
  const normalizedEmail = normalizeOptionalEmail(input.email);
  const normalizedDui = normalizeOptionalText(input.dui);
  const passwordHash = await hashPassword(input.password);

  await prisma.$transaction(async (tx) => {
    const grantedPermissionIds = await resolvePermissionIdsByCode(tx, input.grantedPermissionCodes);
    const readerGroupIds = input.readerGroupIds
      ? await resolveReaderGroupIds(tx, input.readerGroupIds)
      : [];
    const revokedPermissionIds = await resolvePermissionIdsByCode(tx, input.revokedPermissionCodes);
    const appRoleId = await resolveAppRoleId(tx, input.roleCode);

    const createdUser = await tx.user.create({
      data: {
        name: input.name.trim(),
        username: normalizedUsername,
        email: normalizedEmail,
        dui: normalizedDui,
        passwordHash,
        isActive: input.isActive,
        mustChangePassword: input.mustChangePassword,
      },
    });

    await syncAppRoleAssignments(tx, createdUser.id, appRoleId);
    await syncUserReaderGroups(tx, createdUser.id, readerGroupIds, input.actorUser.id);
    await syncUserPermissionOverrides(tx, createdUser.id, {
      grantedPermissionIds,
      revokedPermissionIds,
    });
  });
}

export async function updateAdminUserConfiguration(input: {
  actorUser: SessionUser;
  dui?: string;
  email?: string;
  grantedPermissionCodes: string[];
  isActive: boolean;
  mustChangePassword: boolean;
  name: string;
  readerGroupIds?: string[];
  revokedPermissionCodes: string[];
  roleCode: AppRole;
  userId: string;
}) {
  ensureDatabaseMode();

  if (!input.userId.trim()) {
    throw new Error("Debes indicar el usuario a actualizar.");
  }

  validateUserDraft({
    name: input.name,
    password: "placeholder-value",
    roleCode: input.roleCode,
    username: "placeholder-user",
    skipPasswordValidation: true,
    skipUsernameValidation: true,
  });

  await prisma.$transaction(async (tx) => {
    const grantedPermissionIds = await resolvePermissionIdsByCode(tx, input.grantedPermissionCodes);
    const appRoleId = await resolveAppRoleId(tx, input.roleCode);
    const revokedPermissionIds = await resolvePermissionIdsByCode(tx, input.revokedPermissionCodes);

    await ensureUserExists(tx, input.userId);

    await tx.user.update({
      where: {
        id: input.userId,
      },
      data: {
        name: input.name.trim(),
        email: normalizeOptionalEmail(input.email),
        dui: normalizeOptionalText(input.dui),
        isActive: input.isActive,
        mustChangePassword: input.mustChangePassword,
      },
    });

    await syncAppRoleAssignments(tx, input.userId, appRoleId);
    await syncUserPermissionOverrides(tx, input.userId, {
      grantedPermissionIds,
      revokedPermissionIds,
    });

    if (input.readerGroupIds) {
      const readerGroupIds = await resolveReaderGroupIds(tx, input.readerGroupIds);
      await syncUserReaderGroups(tx, input.userId, readerGroupIds, input.actorUser.id);
    }
  });
}

export async function deactivateAdminUser(input: { userId: string }) {
  ensureDatabaseMode();

  if (!input.userId.trim()) {
    throw new Error("Debes indicar el usuario a desactivar.");
  }

  await prisma.$transaction(async (tx) => {
    await ensureUserExists(tx, input.userId);

    await tx.user.update({
      where: {
        id: input.userId,
      },
      data: {
        isActive: false,
      },
    });
  });

  return getAdminUserTraceabilitySummary(input.userId);
}

export async function resetAdminUserPassword(input: {
  mustChangePassword: boolean;
  password: string;
  userId: string;
}) {
  ensureDatabaseMode();

  if (!input.userId.trim()) {
    throw new Error("Debes indicar el usuario a restablecer.");
  }

  const normalizedPassword = input.password.trim();

  if (normalizedPassword.length < 8) {
    throw new Error("La contrasena temporal debe contener al menos 8 caracteres.");
  }

  await prisma.user.update({
    where: {
      id: input.userId,
    },
    data: {
      passwordHash: await hashPassword(normalizedPassword),
      mustChangePassword: input.mustChangePassword,
    },
  });
}

export async function createReaderGroup(input: {
  code: string;
  description?: string;
  mode: "General" | "Restringido";
  name: string;
  permissionCodes: string[];
}) {
  ensureDatabaseMode();

  const code = normalizeReaderGroupCode(input.code);
  const name = input.name.trim();

  if (!code) {
    throw new Error("Debes indicar un codigo para el grupo lector.");
  }

  if (!name) {
    throw new Error("Debes indicar un nombre para el grupo lector.");
  }

  await prisma.$transaction(async (tx) => {
    const permissionIds = await resolvePermissionIdsByCode(tx, input.permissionCodes);
    const maxSortOrder = await tx.readerGroup.aggregate({
      _max: {
        sortOrder: true,
      },
    });

    const group = await tx.readerGroup.create({
      data: {
        code,
        name,
        description: normalizeOptionalText(input.description),
        categoryType: input.mode,
        isActive: true,
        sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
      },
    });

    await syncReaderGroupPermissions(tx, group.id, permissionIds);
  });
}

export async function updateReaderGroup(input: {
  description?: string;
  groupId: string;
  isActive: boolean;
  mode: "General" | "Restringido";
  name: string;
  permissionCodes: string[];
}) {
  ensureDatabaseMode();

  if (!input.groupId.trim()) {
    throw new Error("Debes indicar el grupo lector a actualizar.");
  }

  const name = input.name.trim();

  if (!name) {
    throw new Error("Debes indicar un nombre para el grupo lector.");
  }

  await prisma.$transaction(async (tx) => {
    const permissionIds = await resolvePermissionIdsByCode(tx, input.permissionCodes);

    await tx.readerGroup.update({
      where: {
        id: input.groupId,
      },
      data: {
        name,
        description: normalizeOptionalText(input.description),
        categoryType: input.mode,
        isActive: input.isActive,
      },
    });

    await syncReaderGroupPermissions(tx, input.groupId, permissionIds);
  });
}

export async function deleteReaderGroup(input: { groupId: string }) {
  ensureDatabaseMode();

  if (!input.groupId.trim()) {
    throw new Error("Debes indicar el grupo lector a eliminar.");
  }

  await prisma.$transaction(async (tx) => {
    const group = await tx.readerGroup.findUnique({
      where: {
        id: input.groupId,
      },
      include: {
        users: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!group) {
      throw new Error("No se encontro el grupo lector seleccionado.");
    }

    if (group.users.length > 0) {
      throw new Error(
        "No se puede eliminar el grupo porque aun tiene usuarios asignados o historial de asignacion.",
      );
    }

    await tx.readerGroupPermission.deleteMany({
      where: {
        readerGroupId: input.groupId,
      },
    });

    await tx.readerGroup.delete({
      where: {
        id: input.groupId,
      },
    });
  });
}

export async function updateRoleConfiguration(input: {
  description?: string;
  name: string;
  permissionCodes: string[];
  roleId: string;
}) {
  ensureDatabaseMode();

  if (!input.roleId.trim()) {
    throw new Error("Debes indicar el rol a actualizar.");
  }

  const name = input.name.trim();

  if (!name) {
    throw new Error("Debes indicar el nombre visible del rol.");
  }

  await prisma.$transaction(async (tx) => {
    const permissionIds = await resolvePermissionIdsByCode(tx, input.permissionCodes);

    await tx.role.update({
      where: {
        id: input.roleId,
      },
      data: {
        name,
        description: normalizeOptionalText(input.description),
      },
    });

    await tx.rolePermission.deleteMany({
      where: {
        roleId: input.roleId,
      },
    });

    if (permissionIds.length > 0) {
      await tx.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId: input.roleId,
          permissionId,
        })),
      });
    }
  });
}

function mapUserRecord(
  user: AdminDatabaseUser,
  traceability: AdminUserTraceabilityRecord,
): AdminUserRecord {
  const roleCode = resolvePrimaryAppRole(user.roles.map(({ role }) => role.code));
  const roleRecord = user.roles.find(({ role }) => role.code === roleCode);
  const rolePermissions = collectRolePermissionCodes(user.roles);
  const groupPermissions = collectReaderGroupPermissionCodes(user.readerGroups);
  const { grantedPermissionCodes, revokedPermissionCodes } = collectUserPermissionOverrides(
    user.permissions,
  );
  const { inheritedPermissionCodes, effectivePermissionCodes } = resolveEffectivePermissionCodes({
    rolePermissionCodes: rolePermissions,
    groupPermissionCodes: groupPermissions,
    grantedPermissionCodes,
    revokedPermissionCodes,
  });

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email ?? undefined,
    dui: user.dui ?? undefined,
    roleCode,
    roleLabel: roleRecord?.role.name ?? roleLabels[roleCode],
    allRoleCodes: user.roles.map(({ role }) => role.code).sort(sortStrings),
    readerGroupCodes: user.readerGroups.map(({ readerGroup }) => readerGroup.code).sort(sortStrings),
    readerGroupIds: user.readerGroups.map(({ readerGroup }) => readerGroup.id),
    status: user.isActive ? "Activo" : "Inactivo",
    access: resolveAccessSummary(roleCode, effectivePermissionCodes),
    canCreateRequests: effectivePermissionCodes.includes(REQUESTS_CREATE_PERMISSION),
    grantedPermissionCodes,
    revokedPermissionCodes,
    inheritedPermissionCodes,
    effectivePermissionCodes,
    mustChangePassword: user.mustChangePassword,
    traceability,
  };
}

function mapRoleRecord(role: AdminDatabaseRole): AdminRoleRecord {
  return {
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description ?? undefined,
    isBaseRole: isAppRoleCode(role.code),
    isSystemRole: role.isSystemRole,
    memberCount: role.users.length,
    permissionCodes: role.permissions.map(({ permission }) => permission.code).sort(sortStrings),
  };
}

function mapPermissionRecord(permission: AdminDatabasePermission): AdminPermissionRecord {
  return {
    id: permission.id,
    code: permission.code,
    module: permission.module,
    action: permission.action,
    description: permission.description ?? undefined,
    directGrantUserCount: permission.users.filter((userPermission) => userPermission.effect !== "REVOKE")
      .length,
    directRevokeUserCount: permission.users.filter((userPermission) => userPermission.effect === "REVOKE")
      .length,
    readerGroupCodes: permission.readerGroups
      .map(({ readerGroup }) => readerGroup.code)
      .sort(sortStrings),
    roleCodes: permission.roles.map(({ role }) => role.code).sort(sortStrings),
  };
}

function mapReaderGroupRecord(group: AdminDatabaseReaderGroup): AdminReaderGroupRecord {
  return {
    id: group.id,
    code: group.code,
    name: group.name,
    description: group.description ?? undefined,
    isActive: group.isActive,
    memberCount: group.users.length,
    mode: group.categoryType === "General" ? "General" : "Restringido",
    permissionCodes: group.permissions.map(({ permission }) => permission.code).sort(sortStrings),
    sortOrder: group.sortOrder,
  };
}

function groupPermissionsByModule(permissions: AdminPermissionRecord[]) {
  const groups = new Map<string, AdminPermissionRecord[]>();

  for (const permission of permissions) {
    const modulePermissions = groups.get(permission.module) ?? [];
    modulePermissions.push(permission);
    groups.set(permission.module, modulePermissions);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([module, modulePermissions]) => ({
      module,
      label: formatPermissionModuleLabel(module),
      permissions: modulePermissions.toSorted((left, right) => left.code.localeCompare(right.code)),
    }));
}

function formatPermissionModuleLabel(module: string) {
  const moduleLabels: Record<string, string> = {
    ai: "IA",
    audit: "Auditoria",
    catalogs: "Catalogos",
    documents: "Documentos",
    reader_groups: "Grupos lectores",
    reports: "Reportes",
    requests: "Solicitudes",
    roles: "Roles",
    users: "Usuarios",
  };

  return moduleLabels[module] ?? module.replaceAll("_", " ");
}

function ensureDatabaseMode() {
  if (runtimeConfig.authMode !== "database") {
    throw new Error("La consola administrativa solo esta disponible en modo database.");
  }
}

async function getAdminUserTraceabilitySummary(userId: string) {
  const traceabilityIndex = await buildUserTraceabilityIndex([userId]);
  return traceabilityIndex.get(userId) ?? getEmptyUserTraceabilityRecord();
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function normalizeOptionalEmail(value?: string) {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function normalizeOptionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeReaderGroupCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function validateUserDraft(input: {
  name: string;
  password: string;
  roleCode: AppRole;
  skipPasswordValidation?: boolean;
  skipUsernameValidation?: boolean;
  username: string;
}) {
  if (!input.name.trim()) {
    throw new Error("Debes indicar el nombre del usuario.");
  }

  if (!input.skipUsernameValidation && !normalizeUsername(input.username)) {
    throw new Error("Debes indicar el username del usuario.");
  }

  if (!APP_ROLES.includes(input.roleCode)) {
    throw new Error("Debes seleccionar un rol base valido.");
  }

  if (!input.skipPasswordValidation && input.password.trim().length < 8) {
    throw new Error("La contrasena debe contener al menos 8 caracteres.");
  }
}

async function ensureUserExists(tx: Prisma.TransactionClient, userId: string) {
  const user = await tx.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    throw new Error("No se encontro el usuario seleccionado.");
  }
}

async function resolveAppRoleId(tx: Prisma.TransactionClient, roleCode: AppRole) {
  const role = await tx.role.findUnique({
    where: {
      code: roleCode,
    },
    select: {
      id: true,
    },
  });

  if (!role) {
    throw new Error(`No se encontro el rol base ${roleCode}.`);
  }

  return role.id;
}

async function resolvePermissionIdsByCode(
  tx: Prisma.TransactionClient,
  permissionCodes: string[],
) {
  const uniquePermissionCodes = [...new Set(permissionCodes.map((code) => code.trim()).filter(Boolean))];

  if (uniquePermissionCodes.length === 0) {
    return [];
  }

  const permissions = await tx.permission.findMany({
    where: {
      code: {
        in: uniquePermissionCodes,
      },
    },
    select: {
      id: true,
      code: true,
    },
  });

  if (permissions.length !== uniquePermissionCodes.length) {
    throw new Error("Uno o varios permisos seleccionados ya no existen.");
  }

  return permissions
    .sort((left, right) => left.code.localeCompare(right.code))
    .map((permission) => permission.id);
}

async function resolveReaderGroupIds(tx: Prisma.TransactionClient, readerGroupIds: string[]) {
  const uniqueReaderGroupIds = [...new Set(readerGroupIds.map((id) => id.trim()).filter(Boolean))];

  if (uniqueReaderGroupIds.length === 0) {
    return [];
  }

  const groups = await tx.readerGroup.findMany({
    where: {
      id: {
        in: uniqueReaderGroupIds,
      },
    },
    select: {
      id: true,
    },
  });

  if (groups.length !== uniqueReaderGroupIds.length) {
    throw new Error("Uno o varios grupos lectores seleccionados ya no existen.");
  }

  return groups.map((group) => group.id);
}

async function syncAppRoleAssignments(
  tx: Prisma.TransactionClient,
  userId: string,
  appRoleId: string,
) {
  const appRoles = await tx.role.findMany({
    where: {
      code: {
        in: [...APP_ROLES],
      },
    },
    select: {
      id: true,
    },
  });

  await tx.userRole.deleteMany({
    where: {
      userId,
      roleId: {
        in: appRoles.map((role) => role.id),
      },
    },
  });

  await tx.userRole.create({
    data: {
      userId,
      roleId: appRoleId,
    },
  });
}

async function syncUserPermissionOverrides(
  tx: Prisma.TransactionClient,
  userId: string,
  input: {
    grantedPermissionIds: string[];
    revokedPermissionIds: string[];
  },
) {
  const nextPermissions = new Map<string, "GRANT" | "REVOKE">();

  for (const permissionId of input.grantedPermissionIds) {
    nextPermissions.set(permissionId, "GRANT");
  }

  for (const permissionId of input.revokedPermissionIds) {
    nextPermissions.set(permissionId, "REVOKE");
  }

  const currentPermissions = await tx.userPermission.findMany({
    where: {
      userId,
    },
    select: {
      id: true,
      permissionId: true,
      effect: true,
    },
  });

  const nextPermissionIds = new Set(nextPermissions.keys());
  const permissionIdsToDelete = currentPermissions
    .filter((permission) => !nextPermissionIds.has(permission.permissionId))
    .map((permission) => permission.id);

  const permissionsToCreate = [...nextPermissions.entries()].filter(
    ([permissionId]) =>
      !currentPermissions.some((currentPermission) => currentPermission.permissionId === permissionId),
  );
  const permissionsToUpdate = currentPermissions.filter((currentPermission) => {
    const nextEffect = nextPermissions.get(currentPermission.permissionId);
    return nextEffect && nextEffect !== currentPermission.effect;
  });

  if (permissionIdsToDelete.length > 0) {
    await tx.userPermission.deleteMany({
      where: {
        id: {
          in: permissionIdsToDelete,
        },
      },
    });
  }

  for (const permission of permissionsToUpdate) {
    await tx.userPermission.update({
      where: {
        id: permission.id,
      },
      data: {
        effect: nextPermissions.get(permission.permissionId),
      },
    });
  }

  if (permissionsToCreate.length > 0) {
    await tx.userPermission.createMany({
      data: permissionsToCreate.map(([permissionId, effect]) => ({
        userId,
        permissionId,
        effect,
      })),
    });
  }
}

async function syncReaderGroupPermissions(
  tx: Prisma.TransactionClient,
  groupId: string,
  permissionIds: string[],
) {
  await tx.readerGroupPermission.deleteMany({
    where: {
      readerGroupId: groupId,
    },
  });

  if (permissionIds.length === 0) {
    return;
  }

  await tx.readerGroupPermission.createMany({
    data: permissionIds.map((permissionId) => ({
      readerGroupId: groupId,
      permissionId,
    })),
  });
}

async function syncUserReaderGroups(
  tx: Prisma.TransactionClient,
  userId: string,
  nextReaderGroupIds: string[],
  assignedByUserId: string,
) {
  const currentAssignments = await tx.userReaderGroup.findMany({
    where: {
      userId,
      revokedAt: null,
    },
    select: {
      id: true,
      readerGroupId: true,
    },
  });

  const currentReaderGroupIds = new Set(currentAssignments.map((assignment) => assignment.readerGroupId));
  const nextReaderGroupIdSet = new Set(nextReaderGroupIds);

  const assignmentIdsToRevoke = currentAssignments
    .filter((assignment) => !nextReaderGroupIdSet.has(assignment.readerGroupId))
    .map((assignment) => assignment.id);
  const readerGroupIdsToAdd = nextReaderGroupIds.filter(
    (readerGroupId) => !currentReaderGroupIds.has(readerGroupId),
  );

  if (assignmentIdsToRevoke.length > 0) {
    await tx.userReaderGroup.updateMany({
      where: {
        id: {
          in: assignmentIdsToRevoke,
        },
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  if (readerGroupIdsToAdd.length > 0) {
    await tx.userReaderGroup.createMany({
      data: readerGroupIdsToAdd.map((readerGroupId) => ({
        userId,
        readerGroupId,
        assignedByUserId,
      })),
    });
  }
}

function sortStrings(left: string, right: string) {
  return left.localeCompare(right);
}

type TraceabilityBucket = Exclude<
  keyof AdminUserTraceabilityRecord,
  "totalLinkedRecords"
>;

type GroupByDelegate = {
  groupBy(...args: unknown[]): Promise<Array<Record<string, unknown>>>;
};

async function buildUserTraceabilityIndex(userIds: string[]) {
  const allowedUserIds = new Set(userIds);
  const index = new Map<string, Partial<AdminUserTraceabilityRecord>>();

  const [
    documentAuthorCounts,
    documentVersionAuthorCounts,
    documentOwnerCounts,
    requestRequesterCounts,
    requestCreatorCounts,
    requestAssignedEditorCounts,
    requestAssignerCounts,
    requestActivityCounts,
    reviewAssignmentCounts,
    reviewRoundCounts,
    resolvedDraftCommentCounts,
    reviewedDownloadCounts,
    auditEventCounts,
  ] = await Promise.all([
    countRecordsByUserField(prisma.document, "createdByUserId"),
    countRecordsByUserField(prisma.documentVersion, "createdByUserId"),
    countRecordsByUserField(prisma.document, "ownerEditorUserId"),
    countRecordsByUserField(prisma.documentRequest, "requesterUserId"),
    countRecordsByUserField(prisma.documentRequest, "createdByUserId"),
    countRecordsByUserField(prisma.documentRequest, "assignedEditorUserId"),
    countRecordsByUserField(prisma.documentRequest, "assignedByUserId"),
    countRecordsByUserField(prisma.documentRequestActivity, "actorUserId"),
    countRecordsByUserField(prisma.reviewAssignment, "userId"),
    countRecordsByUserField(prisma.reviewRound, "submittedByUserId"),
    countRecordsByUserField(prisma.draftComment, "resolvedByUserId"),
    countRecordsByUserField(prisma.downloadRequest, "reviewedByUserId"),
    countRecordsByUserField(prisma.auditLog, "actorUserId"),
  ]);

  mergeTraceabilityBucket(
    index,
    allowedUserIds,
    documentAuthorCounts,
    "documentsAuthored",
  );
  mergeTraceabilityBucket(
    index,
    allowedUserIds,
    documentVersionAuthorCounts,
    "documentsAuthored",
  );
  mergeTraceabilityBucket(index, allowedUserIds, documentOwnerCounts, "documentsOwned");
  mergeTraceabilityBucket(
    index,
    allowedUserIds,
    requestRequesterCounts,
    "requestParticipations",
  );
  mergeTraceabilityBucket(
    index,
    allowedUserIds,
    requestCreatorCounts,
    "requestParticipations",
  );
  mergeTraceabilityBucket(
    index,
    allowedUserIds,
    requestAssignedEditorCounts,
    "requestParticipations",
  );
  mergeTraceabilityBucket(
    index,
    allowedUserIds,
    requestAssignerCounts,
    "requestParticipations",
  );
  mergeTraceabilityBucket(
    index,
    allowedUserIds,
    requestActivityCounts,
    "requestParticipations",
  );
  mergeTraceabilityBucket(
    index,
    allowedUserIds,
    reviewAssignmentCounts,
    "reviewParticipations",
  );
  mergeTraceabilityBucket(index, allowedUserIds, reviewRoundCounts, "reviewParticipations");
  mergeTraceabilityBucket(
    index,
    allowedUserIds,
    resolvedDraftCommentCounts,
    "reviewParticipations",
  );
  mergeTraceabilityBucket(
    index,
    allowedUserIds,
    reviewedDownloadCounts,
    "reviewParticipations",
  );
  mergeTraceabilityBucket(index, allowedUserIds, auditEventCounts, "auditEvents");

  return new Map(
    [...allowedUserIds].map((userId) => [
      userId,
      toTraceabilityRecord(index.get(userId)),
    ]),
  );
}

async function countRecordsByUserField(
  delegate: GroupByDelegate,
  fieldName: string,
) {
  const rows = await delegate.groupBy({
    by: [fieldName],
    _count: {
      _all: true,
    },
  });

  const counts = new Map<string, number>();

  for (const row of rows) {
    const userId = row[fieldName];
    const count = row._count;

    if (
      typeof userId === "string" &&
      userId &&
      typeof count === "object" &&
      count !== null &&
      "_all" in count &&
      typeof count._all === "number"
    ) {
      counts.set(userId, count._all);
    }
  }

  return counts;
}

function mergeTraceabilityBucket(
  index: Map<string, Partial<AdminUserTraceabilityRecord>>,
  allowedUserIds: Set<string>,
  counts: Map<string, number>,
  bucket: TraceabilityBucket,
) {
  for (const [userId, count] of counts.entries()) {
    if (!allowedUserIds.has(userId) || count === 0) {
      continue;
    }

    const currentRecord = index.get(userId) ?? {};
    const currentValue = currentRecord[bucket] ?? 0;

    index.set(userId, {
      ...currentRecord,
      [bucket]: currentValue + count,
    });
  }
}

function toTraceabilityRecord(
  record?: Partial<AdminUserTraceabilityRecord>,
): AdminUserTraceabilityRecord {
  const normalizedRecord = {
    auditEvents: record?.auditEvents ?? 0,
    documentsAuthored: record?.documentsAuthored ?? 0,
    documentsOwned: record?.documentsOwned ?? 0,
    requestParticipations: record?.requestParticipations ?? 0,
    reviewParticipations: record?.reviewParticipations ?? 0,
  };

  return {
    ...normalizedRecord,
    totalLinkedRecords:
      normalizedRecord.auditEvents +
      normalizedRecord.documentsAuthored +
      normalizedRecord.documentsOwned +
      normalizedRecord.requestParticipations +
      normalizedRecord.reviewParticipations,
  };
}

function getEmptyUserTraceabilityRecord(): AdminUserTraceabilityRecord {
  return {
    auditEvents: 0,
    documentsAuthored: 0,
    documentsOwned: 0,
    requestParticipations: 0,
    reviewParticipations: 0,
    totalLinkedRecords: 0,
  };
}
