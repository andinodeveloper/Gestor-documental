import { AiSearchWorkspace } from "@/components/ai-search-workspace";
import { PageHeader } from "@/components/page-header";
import { requireCurrentUser } from "@/lib/server/auth";
import { getAiSearchSnapshot } from "@/lib/server/mock-data-service";

export default async function AiSearchPage() {
  const user = await requireCurrentUser();
  const { presets } = await getAiSearchSnapshot(user);

  return (
    <>
      <PageHeader title="Consulta documental con IA" />
      <AiSearchWorkspace presets={presets} />
    </>
  );
}
