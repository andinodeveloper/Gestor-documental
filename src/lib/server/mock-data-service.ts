import { accessRules, aiResponsePresets, auditEvents, dashboardMetrics, documentRecords, documentTree, readerGroups, requestRecords, reviewComments, reviewTasks, users } from "@/lib/app-data";
import { REQUESTS_CREATE_PERMISSION, getDefaultPermissionsForRole, mergePermissions } from "@/lib/auth/permissions";
import { canUserQueryDocumentWithAi, canUserReadDocument } from "@/lib/auth/document-access";
import { roleLabels } from "@/lib/auth/policy";
import type { SessionUser } from "@/lib/auth/types";
import { runtimeConfig } from "@/lib/config/runtime";
import { prisma } from "@/lib/server/db";
import { getDashboardRequestSnapshot } from "@/lib/server/request-service";

export async function getDashboardSnapshot() {
  const requestSnapshot = await getDashboardRequestSnapshot();

  return {
    metrics: [
      requestSnapshot.metrics[0],
      requestSnapshot.metrics[1],
      dashboardMetrics[2],
      dashboardMetrics[3],
    ],
    requests: requestSnapshot.requests,
    reviews: reviewTasks,
    events: auditEvents,
  };
}

export async function getRequestsSnapshot() {
  const requestSnapshot = await getDashboardRequestSnapshot();

  return {
    requests: requestSnapshot.requests.length > 0 ? requestSnapshot.requests : requestRecords,
  };
}

export async function getDocumentsSnapshot() {
  return {
    documents: documentRecords,
  };
}

export async function getReviewsSnapshot() {
  return {
    reviews: reviewTasks,
    comments: reviewComments,
    accessRules,
  };
}

export async function getExplorerSnapshot(user: SessionUser) {
  return {
    documents: documentRecords.filter((document) => canUserReadDocument(user, document)),
    tree: documentTree,
  };
}

export async function getAiSearchSnapshot(user: SessionUser) {
  const authorizedDocuments = documentRecords.filter((document) =>
    canUserQueryDocumentWithAi(user, document),
  );

  const presets = aiResponsePresets.map((preset) => {
    const citations = preset.citations.filter((citation) =>
      authorizedDocuments.some((document) => citation.code.startsWith(document.code)),
    );

    if (citations.length === 0) {
      return {
        ...preset,
        answer:
          "No hay suficientes fuentes oficiales autorizadas para responder con trazabilidad en tu contexto actual.",
        citations: [],
      };
    }

    return {
      ...preset,
      citations,
    };
  });

  return {
    presets,
  };
}

export async function getAdminSnapshot() {
  if (runtimeConfig.authMode === "database") {
    const [databaseUsers, databaseReaderGroups] = await Promise.all([
      prisma.user.findMany({
        include: {
          roles: {
            include: {
              role: true,
            },
          },
          readerGroups: {
            where: {
              revokedAt: null,
            },
            include: {
              readerGroup: true,
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
      prisma.readerGroup.findMany({
        orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
        include: {
          users: {
            where: {
              revokedAt: null,
            },
          },
        },
      }),
    ]);

    return {
      users: databaseUsers.map((user) => {
        const roleCode =
          user.roles
            .map(({ role }) => role.code)
            .find((role) => role === "ADMINISTRATOR" || role === "EDITOR" || role === "READER") ??
          "READER";
        const permissions = mergePermissions(
          getDefaultPermissionsForRole(roleCode),
          user.permissions.map(({ permission }) => permission.code),
        );

        return {
          id: user.id,
          name: user.name,
          username: user.username,
          roleCode,
          role: roleLabels[roleCode],
          readerGroups: user.readerGroups.map(({ readerGroup }) => readerGroup.code),
          status: user.isActive ? "Activo" : "Inactivo",
          access: permissions.includes(REQUESTS_CREATE_PERMISSION)
            ? "Lectura / flujo habilitado"
            : "Lectura controlada",
          canCreateRequests: permissions.includes(REQUESTS_CREATE_PERMISSION),
        };
      }),
      readerGroups: databaseReaderGroups.map((group) => ({
        code: group.code,
        name: group.name,
        members: group.users.length,
        mode: group.categoryType === "General" ? "General" : "Restringido",
      })),
    };
  }

  return {
    users,
    readerGroups,
  };
}
