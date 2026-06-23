import { PageHeader } from "@/components/page-header";
import { RequestFiltersPanel } from "@/components/request-filters-panel";
import { RequestModalLauncher } from "@/components/request-modal-launcher";
import { RequestsWorkspaceBoard } from "@/components/requests-workspace-board";
import { requireAuthorizedUser } from "@/lib/server/auth";
import { getRequestsWorkspaceSnapshot } from "@/lib/server/request-service";
import type { RequestBoardFilters, WorkflowStatus } from "@/lib/types";

const requestStatusOptions: WorkflowStatus[] = [
  "PENDING_ASSIGNMENT",
  "ASSIGNED",
  "IN_PROGRESS",
  "IN_REVIEW",
  "OBSERVED",
  "APPROVED",
  "OFFICIALIZED",
  "CLOSED",
  "CANCELLED",
];

type RequestsPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function RequestsPage({ searchParams }: RequestsPageProps) {
  const user = await requireAuthorizedUser("/requests");
  const resolvedSearchParams = await searchParams;
  const filters = normalizeFilters(resolvedSearchParams);
  const requestId = readSingle(resolvedSearchParams.requestId);
  const snapshot = await getRequestsWorkspaceSnapshot(user, filters);
  const isReaderView = user.role === "READER";

  return (
    <>
      <PageHeader
        title={isReaderView ? "Mis solicitudes" : "Solicitudes documentales"}
        description={
          isReaderView
            ? "Tablero de seguimiento para revisar el estado, asignacion y detalle de tus solicitudes."
            : "Vista operativa segmentada por estado para seguimiento, asignacion y cierre del flujo documental."
        }
        actions={
          <RequestModalLauncher
            allowedExtensionsLabel={snapshot.attachmentPolicy.allowedExtensionsLabel}
            areaOptions={snapshot.areaOptions}
            canCreateRequests={snapshot.canCreateRequests}
            currentUser={user}
            documentTypeOptions={snapshot.documentTypeOptions}
            maxAttachmentCountLabel={snapshot.attachmentPolicy.maxAttachmentCountLabel}
            maxAttachmentSizeLabel={snapshot.attachmentPolicy.maxAttachmentSizeLabel}
            maxTotalSizeLabel={snapshot.attachmentPolicy.maxTotalSizeLabel}
            processOptions={snapshot.processOptions}
            relatedDocumentOptions={snapshot.relatedDocumentOptions}
            requesterOptions={snapshot.requesterOptions}
            returnPath="/requests"
          />
        }
      />

      <section className="space-y-6">
        <RequestFiltersPanel
          documentTypeOptions={snapshot.documentTypeOptions}
          filters={snapshot.filters}
          isReaderView={isReaderView}
          processOptions={snapshot.processOptions}
          requesterOptions={snapshot.requesterFilterOptions}
        />

        <RequestsWorkspaceBoard
          areaOptions={snapshot.areaOptions}
          canAssignRequests={snapshot.canAssignRequests}
          currentUser={{ id: user.id, role: user.role }}
          documentTypeOptions={snapshot.documentTypeOptions}
          editors={snapshot.editors}
          initialDetailRequestId={requestId}
          processOptions={snapshot.processOptions}
          requests={snapshot.requests}
        />
      </section>
    </>
  );
}

function normalizeFilters(params: { [key: string]: string | string[] | undefined }): RequestBoardFilters {
  const status = readSingle(params.status);
  const priority = readSingle(params.priority);

  return {
    createdFrom: readSingle(params.createdFrom),
    createdTo: readSingle(params.createdTo),
    documentTypeId: readSingle(params.documentTypeId),
    priority:
      priority === "Alta" || priority === "Media" || priority === "Baja" ? priority : undefined,
    processId: readSingle(params.processId),
    requesterUserId: readSingle(params.requesterUserId),
    status: requestStatusOptions.includes(status as WorkflowStatus)
      ? (status as WorkflowStatus)
      : undefined,
  };
}

function readSingle(value: string | string[] | undefined) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  if (Array.isArray(value) && value[0]) {
    const trimmed = value[0].trim();
    return trimmed || undefined;
  }

  return undefined;
}
