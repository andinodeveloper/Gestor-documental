import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "@prisma/client";

declare global {
  var __gestorDocumentalPrisma__: PrismaClient | undefined;
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to initialize Prisma.");
  }

  return databaseUrl;
}

function createPrismaClient() {
  const adapter = new PrismaMssql(getDatabaseUrl());
  return new PrismaClient({ adapter });
}

export const prisma =
  globalThis.__gestorDocumentalPrisma__ ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__gestorDocumentalPrisma__ = prisma;
}
