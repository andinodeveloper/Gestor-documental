import { PageHeader } from "@/components/page-header";
import { StatusChip, visibilityTone, workflowTone } from "@/components/status-chip";
import { documentStateLabels, visibilityLabels } from "@/lib/presenters";
import { requireAuthorizedUser } from "@/lib/server/auth";
import { getDocumentsSnapshot } from "@/lib/server/mock-data-service";

export default async function DocumentsPage() {
  await requireAuthorizedUser("/documents");
  const { documents } = await getDocumentsSnapshot();
  const [primary, ...secondary] = documents;

  if (!primary) {
    return (
      <>
        <PageHeader title="Documentos y versiones" />
        <section className="surface-card p-6">
          <p className="text-sm leading-7 text-slate">No hay documentos disponibles.</p>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Documentos y versiones"
        actions={
          <>
            <button className="button-secondary">Ver correlativos</button>
            <button className="button-primary">Crear documento</button>
          </>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_360px]">
        <article className="data-grid px-6 py-6">
          <div className="flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <p className="section-label">Documento foco</p>
              <h2 className="panel-title mt-2">
                {primary.code} · {primary.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate">{primary.summary}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusChip tone={workflowTone(documentStateLabels[primary.state])}>
                {documentStateLabels[primary.state]}
              </StatusChip>
              <StatusChip tone={visibilityTone(visibilityLabels[primary.visibility])}>
                {visibilityLabels[primary.visibility]}
              </StatusChip>
            </div>
          </div>

          <div className="grid gap-5 pt-6 lg:grid-cols-[minmax(0,0.95fr)_300px]">
            <section className="rounded-[22px] border border-line bg-white/72 p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">Linea de versiones</p>
                  <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">
                    Historial del documento
                  </h3>
                </div>
                <span className="meta-pill">{primary.version}</span>
              </div>

              <div className="space-y-3">
                {["BOR-2026-0041", "POL-014-V1.0", "POL-014-V1.1", "POL-014-V2.0"].map(
                  (item, index) => (
                    <div
                      key={item}
                      className="grid gap-3 rounded-[18px] border border-line bg-white/88 px-4 py-4 md:grid-cols-[42px_minmax(0,1fr)] md:items-start"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/8 text-sm font-semibold text-accent">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold tracking-[-0.02em] text-foreground">
                          {item}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate">
                          {index === 0
                            ? "Borrador inicial."
                            : index === 3
                              ? "Version oficial vigente."
                              : "Version historica consultable."}
                        </p>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </section>

            <section className="rounded-[22px] border border-line bg-accent/4 p-5">
              <p className="section-label">Relaciones</p>
              <div className="mt-5 space-y-3">
                {primary.relatedCodes.map((code) => (
                  <div key={code} className="rounded-[18px] bg-white/88 px-4 py-4">
                    <p className="font-semibold tracking-[-0.02em] text-foreground">{code}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </article>

        <aside className="space-y-4">
          {secondary.map((document) => (
            <article key={document.id} className="surface-card-compact p-5">
              <div className="mb-3 flex flex-wrap gap-2">
                <StatusChip tone={workflowTone(documentStateLabels[document.state])}>
                  {documentStateLabels[document.state]}
                </StatusChip>
                <StatusChip tone={visibilityTone(visibilityLabels[document.visibility])}>
                  {visibilityLabels[document.visibility]}
                </StatusChip>
              </div>
              <h3 className="text-xl font-semibold tracking-[-0.04em] text-foreground">
                {document.code} · {document.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate">{document.summary}</p>
            </article>
          ))}
        </aside>
      </section>
    </>
  );
}
