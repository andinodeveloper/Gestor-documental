import Link from "next/link";

import { FilePreviewDialog } from "@/components/file-preview-dialog";
import { PageHeader } from "@/components/page-header";
import { StatusChip, workflowTone } from "@/components/status-chip";
import {
  documentStateLabels,
  documentVersionStatusLabels,
  versionChangeKindLabels,
} from "@/lib/presenters";
import type { ReviewFileRecord } from "@/lib/types";
import { requireAuthorizedUser } from "@/lib/server/auth";
import { getDocumentsWorkspaceSnapshot } from "@/lib/server/document-library-service";

export default async function DocumentsPage() {
  const user = await requireAuthorizedUser("/documents");
  const { documents } = await getDocumentsWorkspaceSnapshot(user);
  const [primary, ...secondary] = documents;

  if (!primary) {
    return (
      <>
        <PageHeader
          title="Documentos y versiones"
          actions={
            <Link href="/reviews" className="button-primary">
              Abrir flujo de revision
            </Link>
          }
        />
        <section className="surface-card p-6">
          <p className="text-sm leading-7 text-slate">
            Aun no existen documentos generados desde el flujo editorial.
          </p>
        </section>
      </>
    );
  }

  const currentVersion = primary.versions.find((version) => version.isCurrent) ?? primary.versions[0];
  const currentFiles = currentVersion?.officialFiles.length
    ? currentVersion.officialFiles
    : (currentVersion?.draftFiles ?? []);

  return (
    <>
      <PageHeader
        title="Documentos y versiones"
        actions={
          <Link href="/reviews" className="button-primary">
            Abrir flujo de revision
          </Link>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.32fr)_360px]">
        <article className="data-grid px-6 py-6">
          <div className="flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <p className="section-label">Documento foco</p>
              <h2 className="panel-title mt-2">
                {primary.code} · {primary.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate">
                {primary.summary || "Sin descripcion editorial registrada para este documento."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusChip tone={workflowTone(documentStateLabels[primary.state])}>
                {documentStateLabels[primary.state]}
              </StatusChip>
              {currentVersion ? <StatusChip tone="slate">Version {currentVersion.versionLabel}</StatusChip> : null}
            </div>
          </div>

          <div className="grid gap-4 border-b border-line py-6 md:grid-cols-2 xl:grid-cols-4">
            <DetailBlock label="Proceso" value={primary.processLabel} />
            <DetailBlock label="Tipo documental" value={primary.documentTypeLabel} />
            <DetailBlock
              label="Responsable"
              value={primary.owner ? primary.owner.name : "Sin editor asignado"}
            />
            <DetailBlock
              label="Solicitudes vinculadas"
              value={
                primary.linkedRequestCodes.length > 0
                  ? primary.linkedRequestCodes.join(", ")
                  : "Sin vinculacion"
              }
            />
          </div>

          <div className="grid gap-5 pt-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="rounded-[22px] border border-line bg-white/72 p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">Linea de versiones</p>
                  <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">
                    Historial del documento
                  </h3>
                </div>
                <span className="meta-pill">{primary.versions.length} versiones</span>
              </div>

              <div className="space-y-3">
                {primary.versions.map((version, index) => (
                  <article
                    key={version.id}
                    className="grid gap-3 rounded-[18px] border border-line bg-white/88 px-4 py-4 md:grid-cols-[42px_minmax(0,1fr)] md:items-start"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/8 text-sm font-semibold text-accent">
                      {index + 1}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold tracking-[-0.02em] text-foreground">
                          {version.displayCode}
                        </p>
                        <StatusChip tone={workflowTone(documentVersionStatusLabels[version.status])}>
                          {documentVersionStatusLabels[version.status]}
                        </StatusChip>
                        {version.changeKind ? (
                          <StatusChip tone="slate">
                            Cambio {versionChangeKindLabels[version.changeKind]}
                          </StatusChip>
                        ) : null}
                        {version.isCurrent ? <StatusChip tone="accent">Vigente</StatusChip> : null}
                      </div>

                      <p className="mt-2 text-sm leading-6 text-slate">
                        {version.changeSummary || "Sin resumen editorial para esta version."}
                      </p>

                      <div className="mt-3 grid gap-3 text-xs text-slate md:grid-cols-2">
                        <p>Creada: {version.createdAt}</p>
                        {version.submittedAt ? <p>Enviada: {version.submittedAt}</p> : null}
                        {version.approvedAt ? <p>Aprobada: {version.approvedAt}</p> : null}
                        {version.officializedAt ? <p>Oficializada: {version.officializedAt}</p> : null}
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <FileGroup title="Borradores" files={version.draftFiles} />
                        <FileGroup title="Oficiales" files={version.officialFiles} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[22px] border border-line bg-accent/4 p-5">
              <p className="section-label">Contexto</p>
              <div className="mt-5 space-y-4">
                <div className="rounded-[18px] bg-white/88 px-4 py-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate">Actualizado</p>
                  <p className="mt-2 font-semibold tracking-[-0.02em] text-foreground">
                    {primary.updatedAt}
                  </p>
                </div>

                <div className="rounded-[18px] bg-white/88 px-4 py-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate">Estado</p>
                  <p className="mt-2 font-semibold tracking-[-0.02em] text-foreground">
                    {documentStateLabels[primary.state]}
                  </p>
                </div>

                <div className="rounded-[18px] bg-white/88 px-4 py-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate">
                    Publicacion oficial
                  </p>
                  <p className="mt-2 font-semibold tracking-[-0.02em] text-foreground">
                    {primary.officializedAt || "Pendiente"}
                  </p>
                </div>

                <div className="rounded-[18px] bg-white/88 px-4 py-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate">
                    Sustitucion
                  </p>
                  <p className="mt-2 font-semibold tracking-[-0.02em] text-foreground">
                    {primary.replacementCode || "Sin reemplazo registrado"}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </article>

        <aside className="space-y-4">
          <article className="surface-card-compact p-5">
            <p className="section-label">Archivo vigente</p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">
              {currentVersion ? currentVersion.displayCode : primary.code}
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate">
              {currentVersion?.officialFiles.length
                ? "Version oficial disponible para consulta controlada."
                : "El documento aun no tiene un archivo oficial publicado."}
            </p>
            <div className="mt-4 space-y-3">
              {currentFiles.length > 0 ? (
                currentFiles.map((file) => <FileLinkCard key={file.id} file={file} />)
              ) : (
                <p className="text-sm leading-7 text-slate">No hay archivos disponibles.</p>
              )}
            </div>
          </article>

          {secondary.map((document) => (
            <article key={document.id} className="surface-card-compact p-5">
              <div className="mb-3 flex flex-wrap gap-2">
                <StatusChip tone={workflowTone(documentStateLabels[document.state])}>
                  {documentStateLabels[document.state]}
                </StatusChip>
                {document.versions[0] ? (
                  <StatusChip tone="slate">Version {document.versions[0].versionLabel}</StatusChip>
                ) : null}
              </div>
              <h3 className="text-xl font-semibold tracking-[-0.04em] text-foreground">
                {document.code} · {document.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate">
                {document.summary || "Sin descripcion editorial registrada."}
              </p>
              <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-slate">
                {document.processLabel}
              </p>
            </article>
          ))}
        </aside>
      </section>
    </>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function FileGroup({ files, title }: { files: ReviewFileRecord[]; title: string }) {
  return (
    <div className="rounded-[16px] border border-line bg-panel-muted/55 p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate">{title}</p>
      <div className="mt-3 space-y-2">
        {files.length > 0 ? (
          files.map((file) => <FileLinkCard key={file.id} file={file} compact />)
        ) : (
          <p className="text-sm leading-6 text-slate">Sin archivos.</p>
        )}
      </div>
    </div>
  );
}

function FileLinkCard({
  compact = false,
  file,
}: {
  compact?: boolean;
  file: ReviewFileRecord;
}) {
  return (
    <div
      className={`rounded-[16px] border border-line bg-white/88 ${compact ? "px-3 py-3" : "px-4 py-4"}`}
    >
      <p className="font-semibold tracking-[-0.02em] text-foreground">{file.originalFileName}</p>
      <p className="mt-2 text-xs leading-6 text-slate">
        {file.mimeType} · {formatFileSize(file.sizeBytes)} · {file.uploadedAt}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {file.canPreview ? (
          <FilePreviewDialog
            canDownload={file.canDownload}
            downloadHref={file.downloadHref}
            fileName={file.originalFileName}
            previewHref={file.previewHref}
          />
        ) : null}
        {file.canDownload ? (
          <a href={file.downloadHref} className="button-secondary">
            Descargar
          </a>
        ) : null}
      </div>
    </div>
  );
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
