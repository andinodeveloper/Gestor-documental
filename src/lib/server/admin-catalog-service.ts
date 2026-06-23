import { runtimeConfig } from "@/lib/config/runtime";
import { prisma } from "@/lib/server/db";

const closedRequestStatuses = ["CLOSED", "CANCELLED"] as const;

export interface AdminAreaCatalogRecord {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  replacementAreaId?: string;
  replacementAreaLabel?: string;
  sortOrder: number;
  totalLinkedRequests: number;
  openLinkedRequests: number;
}

export interface AdminProcessCatalogRecord {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  processGroupLabel: string;
  sortOrder: number;
  totalLinkedDocuments: number;
  totalLinkedRequests: number;
}

export interface AdminDocumentTypeCatalogRecord {
  id: string;
  code: string;
  name: string;
  category: string;
  definition?: string;
  isActive: boolean;
  sortOrder: number;
  totalLinkedDocuments: number;
  totalLinkedRequests: number;
}

export interface AdminCatalogSnapshot {
  isDatabaseMode: boolean;
  areas: AdminAreaCatalogRecord[];
  processes: AdminProcessCatalogRecord[];
  documentTypes: AdminDocumentTypeCatalogRecord[];
}

export async function getAdminCatalogSnapshot(): Promise<AdminCatalogSnapshot> {
  if (runtimeConfig.authMode !== "database") {
    return {
      isDatabaseMode: false,
      areas: [],
      processes: [],
      documentTypes: [],
    };
  }

  const [areas, openRequests, processes, documentTypes] = await Promise.all([
    prisma.area.findMany({
      include: {
        replacedByArea: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        _count: {
          select: {
            requestAreas: true,
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    }),
    prisma.documentRequest.findMany({
      where: {
        requesterAreaId: {
          not: null,
        },
        status: {
          notIn: [...closedRequestStatuses],
        },
      },
      select: {
        requesterAreaId: true,
      },
    }),
    prisma.process.findMany({
      include: {
        processGroup: {
          select: {
            code: true,
            name: true,
          },
        },
        _count: {
          select: {
            documents: true,
            requestSuggestions: true,
          },
        },
      },
      orderBy: [{ processGroup: { sortOrder: "asc" } }, { sortOrder: "asc" }, { code: "asc" }],
    }),
    prisma.documentType.findMany({
      include: {
        _count: {
          select: {
            documents: true,
            requestSuggestions: true,
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    }),
  ]);

  const openRequestCountByAreaId = new Map<string, number>();

  for (const request of openRequests) {
    const areaId = request.requesterAreaId;

    if (!areaId) {
      continue;
    }

    openRequestCountByAreaId.set(areaId, (openRequestCountByAreaId.get(areaId) ?? 0) + 1);
  }

  return {
    isDatabaseMode: true,
    areas: areas.map((area) => ({
      id: area.id,
      code: area.code,
      name: area.name,
      description: area.description || undefined,
      isActive: area.isActive,
      replacementAreaId: area.replacedByAreaId || undefined,
      replacementAreaLabel: area.replacedByArea
        ? formatCatalogLabel(area.replacedByArea)
        : undefined,
      sortOrder: area.sortOrder,
      totalLinkedRequests: area._count.requestAreas,
      openLinkedRequests: openRequestCountByAreaId.get(area.id) ?? 0,
    })),
    processes: processes.map((process) => ({
      id: process.id,
      code: process.code,
      name: process.name,
      description: process.description || undefined,
      isActive: process.isActive,
      processGroupLabel: `${process.processGroup.code} - ${process.processGroup.name}`,
      sortOrder: process.sortOrder,
      totalLinkedDocuments: process._count.documents,
      totalLinkedRequests: process._count.requestSuggestions,
    })),
    documentTypes: documentTypes.map((documentType) => ({
      id: documentType.id,
      code: documentType.code,
      name: documentType.name,
      category: documentType.category,
      definition: documentType.definition || undefined,
      isActive: documentType.isActive,
      sortOrder: documentType.sortOrder,
      totalLinkedDocuments: documentType._count.documents,
      totalLinkedRequests: documentType._count.requestSuggestions,
    })),
  };
}

export async function createAdminArea(input: {
  code: string;
  description?: string;
  name: string;
  sortOrder: number;
}) {
  ensureDatabaseMode();

  const code = normalizeCatalogCode(input.code);
  const name = normalizeRequiredText(input.name, "Debes indicar el nombre del area.");

  await prisma.area.create({
    data: {
      code,
      name,
      description: normalizeOptionalText(input.description),
      sortOrder: input.sortOrder,
      isActive: true,
    },
  });
}

export async function updateAdminArea(input: {
  actorUserId: string;
  areaId: string;
  description?: string;
  isActive: boolean;
  name: string;
  replacementAreaId?: string;
  sortOrder: number;
}) {
  ensureDatabaseMode();

  const area = await prisma.area.findUnique({
    where: { id: input.areaId },
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
      replacedByAreaId: true,
    },
  });

  if (!area) {
    throw new Error("El area seleccionada ya no existe.");
  }

  const name = normalizeRequiredText(input.name, "Debes indicar el nombre del area.");
  const replacementAreaId = input.replacementAreaId?.trim() || null;

  if (replacementAreaId && replacementAreaId === area.id) {
    throw new Error("Un area no puede reemplazarse a si misma.");
  }

  const replacementArea = replacementAreaId
    ? await prisma.area.findUnique({
        where: { id: replacementAreaId },
        select: {
          id: true,
          code: true,
          name: true,
          isActive: true,
        },
      })
    : null;

  if (replacementAreaId && (!replacementArea || !replacementArea.isActive)) {
    throw new Error("El area de reemplazo debe existir y estar activa.");
  }

  const openRequests = await prisma.documentRequest.findMany({
    where: {
      requesterAreaId: area.id,
      status: {
        notIn: [...closedRequestStatuses],
      },
    },
    select: {
      id: true,
      requestCode: true,
      currentTrackingStageCode: true,
      currentResponsibilityRole: true,
      waitingReason: true,
      status: true,
    },
  });

  if (!input.isActive && openRequests.length > 0 && !replacementArea) {
    throw new Error(
      "Debes indicar un area de reemplazo para inactivar un area con solicitudes abiertas.",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.area.update({
      where: { id: area.id },
      data: {
        name,
        description: normalizeOptionalText(input.description),
        isActive: input.isActive,
        sortOrder: input.sortOrder,
        validTo: input.isActive ? null : new Date(),
        replacedByAreaId: replacementArea?.id || null,
      },
    });

    if (!input.isActive && replacementArea && openRequests.length > 0) {
      const replacementLabel = formatCatalogLabel(replacementArea);

      await tx.documentRequest.updateMany({
        where: {
          id: {
            in: openRequests.map((request) => request.id),
          },
        },
        data: {
          requesterAreaId: replacementArea.id,
          requesterArea: replacementLabel,
        },
      });

      await tx.documentRequestActivity.createMany({
        data: openRequests.map((request) => ({
          documentRequestId: request.id,
          actorUserId: input.actorUserId,
          activityType: "CLASSIFICATION_UPDATED",
          trackingStageCode: request.currentTrackingStageCode || "0.1",
          responsibilityRole: request.currentResponsibilityRole || "ADMINISTRATOR",
          waitingReason: request.waitingReason || "NONE",
          statusAfter: request.status,
          note: `Clasificacion actualizada. Area: ${formatCatalogLabel(area)} -> ${replacementLabel}. Sustitucion administrativa por inactivacion del maestro.`,
        })),
      });
    }
  });
}

function ensureDatabaseMode() {
  if (runtimeConfig.authMode !== "database") {
    throw new Error("La administracion de maestros solo esta disponible en modo database.");
  }
}

function normalizeCatalogCode(value: string) {
  const normalized = value.trim().toUpperCase();

  if (!normalized) {
    throw new Error("Debes indicar el codigo del area.");
  }

  return normalized;
}

function normalizeRequiredText(value: string, message: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(message);
  }

  return normalized;
}

function normalizeOptionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function formatCatalogLabel(input: { code: string; name: string }) {
  return `${input.code} - ${input.name}`;
}
