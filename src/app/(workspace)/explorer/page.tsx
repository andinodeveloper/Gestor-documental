import { ExplorerWorkspace } from "@/components/explorer-workspace";
import { PageHeader } from "@/components/page-header";
import { RequestModalLauncher } from "@/components/request-modal-launcher";
import { requireCurrentUser } from "@/lib/server/auth";
import { getRequestIntakeSnapshot } from "@/lib/server/request-service";
import { getExplorerSnapshot } from "@/lib/server/mock-data-service";

export default async function ExplorerPage() {
  const user = await requireCurrentUser();
  const [{ documents, tree }, intakeSnapshot] = await Promise.all([
    getExplorerSnapshot(user),
    getRequestIntakeSnapshot(user),
  ]);

  return (
    <>
      <PageHeader
        title="Explorador documental"
        actions={
          <RequestModalLauncher
            allowedExtensionsLabel={intakeSnapshot.attachmentPolicy.allowedExtensionsLabel}
            canCreateRequests={intakeSnapshot.canCreateRequests}
            currentUser={user}
            documentTypeOptions={intakeSnapshot.documentTypeOptions}
            maxAttachmentSizeLabel={intakeSnapshot.attachmentPolicy.maxAttachmentSizeLabel}
            processOptions={intakeSnapshot.processOptions}
            relatedDocumentOptions={intakeSnapshot.relatedDocumentOptions}
            requesterOptions={intakeSnapshot.requesterOptions}
            returnPath="/explorer"
          />
        }
      />
      <ExplorerWorkspace documents={documents} tree={tree} />
    </>
  );
}
