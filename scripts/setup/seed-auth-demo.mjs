import "dotenv/config";

import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const adapter = new PrismaMssql(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

const permissions = [
  { code: "users.manage", description: "Administrar usuarios" },
  { code: "roles.manage", description: "Administrar roles" },
  { code: "reader_groups.manage", description: "Administrar grupos lectores" },
  { code: "catalogs.manage", description: "Administrar catalogos maestros" },
  { code: "documents.create", description: "Crear documentos" },
  { code: "documents.read.official", description: "Leer documentos oficiales" },
  { code: "documents.read.restricted", description: "Leer documentos restringidos" },
  { code: "documents.read.confidential", description: "Leer documentos confidenciales" },
  { code: "documents.read.draft", description: "Leer borradores" },
  { code: "documents.access.manage", description: "Administrar ACL documental" },
  { code: "documents.access.audit.read", description: "Leer auditoria de accesos documentales" },
  { code: "ai.query.official_documents", description: "Consultar IA sobre documentos oficiales" },
  { code: "ai.query.restricted_documents", description: "Consultar IA sobre documentos restringidos" },
  { code: "ai.query.confidential_documents", description: "Consultar IA sobre documentos confidenciales" },
  { code: "ai.index.manage", description: "Administrar indexacion IA" },
  { code: "ai.index.reprocess", description: "Reprocesar indexacion IA" },
  { code: "ai.query.logs.read", description: "Leer trazas de consultas IA" },
  { code: "documents.update.metadata", description: "Actualizar metadatos documentales" },
  { code: "documents.upload.draft", description: "Cargar borradores" },
  { code: "documents.upload.official", description: "Cargar version oficial" },
  { code: "documents.submit_review", description: "Enviar a revision" },
  { code: "documents.review", description: "Revisar documento" },
  { code: "documents.approve", description: "Aprobar documento" },
  { code: "documents.officialize", description: "Oficializar documento" },
  { code: "documents.archive", description: "Archivar documento" },
  { code: "documents.relate", description: "Relacionar documentos" },
  { code: "documents.download", description: "Descargar documentos" },
  { code: "documents.download.grant", description: "Otorgar descargas" },
  { code: "requests.create", description: "Crear solicitudes documentales" },
  { code: "requests.assign", description: "Asignar solicitudes" },
  { code: "requests.manage", description: "Gestionar solicitudes" },
  { code: "audit.read", description: "Leer auditoria" },
  { code: "reports.export", description: "Exportar reportes" },
];

const roles = [
  {
    code: "ADMINISTRATOR",
    name: "Administrador",
    description: "Gobierno integral del sistema documental",
    permissions: permissions.map((permission) => permission.code),
  },
  {
    code: "EDITOR",
    name: "Editor",
    description: "Operacion documental y flujos de trabajo",
    permissions: [
      "catalogs.manage",
      "documents.create",
      "documents.read.official",
      "documents.read.restricted",
      "documents.read.draft",
      "documents.access.manage",
      "ai.query.official_documents",
      "ai.query.restricted_documents",
      "documents.update.metadata",
      "documents.upload.draft",
      "documents.upload.official",
      "documents.submit_review",
      "documents.review",
      "documents.approve",
      "documents.officialize",
      "documents.archive",
      "documents.relate",
      "documents.download",
      "documents.download.grant",
      "requests.create",
      "requests.assign",
      "requests.manage",
      "reports.export",
    ],
  },
  {
    code: "READER",
    name: "Lector",
    description: "Consulta controlada de documentos oficiales",
    permissions: [
      "documents.read.official",
      "ai.query.official_documents",
    ],
  },
];

const readerGroups = [
  {
    code: "DIRECTIVO",
    name: "Direccion y alta gerencia",
    mode: "Restringido",
    permissions: ["documents.read.confidential", "ai.query.confidential_documents", "reports.export"],
  },
  {
    code: "AUDITORIA_CONTROL",
    name: "Auditoria y control interno",
    mode: "Restringido",
    permissions: ["audit.read", "documents.access.audit.read", "documents.read.confidential"],
  },
  {
    code: "ADMINISTRATIVO",
    name: "Areas administrativas",
    mode: "General",
    permissions: ["documents.read.restricted", "ai.query.restricted_documents"],
  },
  {
    code: "OPERATIVO",
    name: "Operacion de tiendas y salas",
    mode: "General",
    permissions: ["requests.create"],
  },
  {
    code: "TIENDAS_SALAS",
    name: "Jefaturas y supervision de salas",
    mode: "General",
    permissions: ["documents.download"],
  },
  {
    code: "CENTROS_DISTRIBUCION",
    name: "CEDI y logistica",
    mode: "Restringido",
    permissions: ["documents.read.restricted", "documents.download"],
  },
];

const users = [
  {
    name: "Ana Pleitez",
    username: "ana.pleitez",
    email: "ana.pleitez@gestordoc.local",
    dui: "01234567-8",
    password: "Admin123!",
    role: "ADMINISTRATOR",
    directPermissions: [],
    revokedPermissions: [],
    readerGroups: ["DIRECTIVO", "AUDITORIA_CONTROL"],
    isActive: true,
    mustChangePassword: false,
  },
  {
    name: "Luis Martinez",
    username: "luis.martinez",
    email: "luis.martinez@gestordoc.local",
    dui: "02345678-9",
    password: "Editor123!",
    role: "EDITOR",
    directPermissions: [],
    revokedPermissions: [],
    readerGroups: ["CENTROS_DISTRIBUCION"],
    isActive: true,
    mustChangePassword: false,
  },
  {
    name: "Gabriela Perez",
    username: "gabriela.perez",
    email: "gabriela.perez@gestordoc.local",
    dui: "03456789-0",
    password: "Editor123!",
    role: "EDITOR",
    directPermissions: [],
    revokedPermissions: [],
    readerGroups: ["TIENDAS_SALAS"],
    isActive: true,
    mustChangePassword: false,
  },
  {
    name: "Juan Arias",
    username: "juan.arias",
    email: "juan.arias@gestordoc.local",
    dui: "04567890-1",
    password: "Lector123!",
    role: "READER",
    directPermissions: ["requests.create"],
    revokedPermissions: ["ai.query.official_documents"],
    readerGroups: ["CENTROS_DISTRIBUCION"],
    isActive: true,
    mustChangePassword: true,
  },
  {
    name: "Marta Rivera",
    username: "marta.rivera",
    email: null,
    dui: "05678901-2",
    password: "Lector123!",
    role: "READER",
    directPermissions: [],
    revokedPermissions: [],
    readerGroups: ["OPERATIVO"],
    isActive: true,
    mustChangePassword: false,
  },
  {
    name: "Rosa Quintanilla",
    username: "rosa.quintanilla",
    email: null,
    dui: "06789012-3",
    password: "Lector123!",
    role: "READER",
    directPermissions: [],
    revokedPermissions: [],
    readerGroups: ["OPERATIVO"],
    isActive: false,
    mustChangePassword: false,
  },
];

function splitPermissionCode(code) {
  const [module, ...rest] = code.split(".");
  return {
    module,
    action: rest.join("."),
  };
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${Buffer.from(derivedKey).toString("hex")}`;
}

async function main() {
  const permissionIdsByCode = new Map();
  const roleIdsByCode = new Map();
  const readerGroupIdsByCode = new Map();

  for (const permission of permissions) {
    const { module, action } = splitPermissionCode(permission.code);
    const record = await prisma.permission.upsert({
      where: { code: permission.code },
      update: {
        module,
        action,
        description: permission.description,
      },
      create: {
        code: permission.code,
        module,
        action,
        description: permission.description,
      },
    });

    permissionIdsByCode.set(permission.code, record.id);
  }

  for (const role of roles) {
    const record = await prisma.role.upsert({
      where: { code: role.code },
      update: {
        name: role.name,
        description: role.description,
        isSystemRole: true,
      },
      create: {
        code: role.code,
        name: role.name,
        description: role.description,
        isSystemRole: true,
      },
    });

    roleIdsByCode.set(role.code, record.id);
  }

  for (const role of roles) {
    const roleId = roleIdsByCode.get(role.code);

    await prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    await prisma.rolePermission.createMany({
      data: role.permissions.map((permissionCode) => ({
        roleId,
        permissionId: permissionIdsByCode.get(permissionCode),
      })),
    });
  }

  for (const [index, readerGroup] of readerGroups.entries()) {
    const record = await prisma.readerGroup.upsert({
      where: { code: readerGroup.code },
      update: {
        name: readerGroup.name,
        description: readerGroup.name,
        categoryType: readerGroup.mode,
        sortOrder: index,
        isActive: true,
      },
      create: {
        code: readerGroup.code,
        name: readerGroup.name,
        description: readerGroup.name,
        categoryType: readerGroup.mode,
        sortOrder: index,
        isActive: true,
      },
    });

    readerGroupIdsByCode.set(readerGroup.code, record.id);
  }

  for (const readerGroup of readerGroups) {
    const readerGroupId = readerGroupIdsByCode.get(readerGroup.code);

    await prisma.readerGroupPermission.deleteMany({
      where: { readerGroupId },
    });

    if (readerGroup.permissions.length > 0) {
      await prisma.readerGroupPermission.createMany({
        data: readerGroup.permissions.map((permissionCode) => ({
          readerGroupId,
          permissionId: permissionIdsByCode.get(permissionCode),
        })),
      });
    }
  }

  for (const user of users) {
    const passwordHash = await hashPassword(user.password);
    const record = await prisma.user.upsert({
      where: { username: user.username },
      update: {
        name: user.name,
        email: user.email,
        dui: user.dui,
        passwordHash,
        mustChangePassword: user.mustChangePassword,
        isActive: user.isActive,
      },
      create: {
        name: user.name,
        username: user.username,
        email: user.email,
        dui: user.dui,
        passwordHash,
        mustChangePassword: user.mustChangePassword,
        isActive: user.isActive,
      },
    });

    await prisma.userRole.deleteMany({
      where: { userId: record.id },
    });

    await prisma.userRole.create({
      data: {
        userId: record.id,
        roleId: roleIdsByCode.get(user.role),
      },
    });

    await prisma.userReaderGroup.deleteMany({
      where: { userId: record.id },
    });

    if (user.readerGroups.length > 0) {
      await prisma.userReaderGroup.createMany({
        data: user.readerGroups.map((code) => ({
          userId: record.id,
          readerGroupId: readerGroupIdsByCode.get(code),
        })),
      });
    }

    await prisma.userPermission.deleteMany({
      where: { userId: record.id },
    });

    if (user.directPermissions.length > 0 || user.revokedPermissions.length > 0) {
      await prisma.userPermission.createMany({
        data: [
          ...user.directPermissions.map((permissionCode) => ({
            userId: record.id,
            permissionId: permissionIdsByCode.get(permissionCode),
            effect: "GRANT",
          })),
          ...user.revokedPermissions.map((permissionCode) => ({
            userId: record.id,
            permissionId: permissionIdsByCode.get(permissionCode),
            effect: "REVOKE",
          })),
        ],
      });
    }
  }

  console.log("Auth seed completed:");
  console.log(`- permissions: ${permissions.length}`);
  console.log(`- roles: ${roles.length}`);
  console.log(`- reader groups: ${readerGroups.length}`);
  console.log(`- users: ${users.length}`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
