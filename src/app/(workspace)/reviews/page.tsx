import { PageHeader } from "@/components/page-header";
import { ReviewsWorkspace } from "@/components/reviews-workspace";
import { requireAuthorizedUser } from "@/lib/server/auth";
import { getReviewsWorkspaceSnapshot } from "@/lib/server/review-service";

export default async function ReviewsPage() {
  const user = await requireAuthorizedUser("/reviews");
  const snapshot = await getReviewsWorkspaceSnapshot(user);

  return (
    <>
      <PageHeader
        title="Revision, aprobacion y oficializacion"
        description="Convierte solicitudes activas en borradores, ejecuta rondas formales de revision y publica la version oficial cuando exista aprobacion unanime."
      />

      <ReviewsWorkspace
        currentUser={{ id: user.id, role: user.role }}
        snapshot={snapshot}
      />
    </>
  );
}
