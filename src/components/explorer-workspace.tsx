"use client";

import { startTransition, useDeferredValue, useState } from "react";

import { StatusChip, visibilityTone, workflowTone } from "@/components/status-chip";
import { documentStateLabels, visibilityLabels } from "@/lib/presenters";
import type { DocumentRecord, TreeBranch } from "@/lib/types";

function TreeNode({ node, depth = 0 }: { node: TreeBranch; depth?: number }) {
  return (
    <li>
      <div
        className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-foreground hover:bg-white/72"
        style={{ paddingLeft: `${depth * 14 + 12}px` }}
      >
        <span className="rounded-full bg-accent/8 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
          {node.code}
        </span>
        <span>{node.label}</span>
      </div>
      {node.children?.length ? (
        <ul className="space-y-1">
          {node.children.map((child) => (
            <TreeNode key={`${node.code}-${child.code}`} node={child} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function ExplorerWorkspace({
  documents,
  tree,
}: {
  documents: DocumentRecord[];
  tree: TreeBranch[];
}) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(documents[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const deferredSearch = useDeferredValue(search);

  const filteredDocuments = documents.filter((document) => {
    const haystack = [
      document.code,
      document.title,
      document.process,
      document.type,
      visibilityLabels[document.visibility],
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(deferredSearch.toLowerCase());
  });

  const selectedDocument =
    filteredDocuments.find((document) => document.id === selectedId) ?? filteredDocuments[0];

  function handleRequestDownload() {
    startTransition(() => {
      setMessage("Solicitud creada. Si se aprueba, la descarga estará disponible por 24 horas.");
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
      <section className="surface-card p-5">
        <div className="mb-5">
          <p className="section-label">Árbol documental</p>
        </div>
        <ul className="subtle-scroll max-h-[720px] space-y-1 overflow-auto pr-2">
          {tree.map((node) => (
            <TreeNode key={node.code} node={node} />
          ))}
        </ul>
      </section>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,0.95fr)_360px]">
        <section className="surface-card p-5">
          <div className="mb-5 space-y-4">
            <div>
              <p className="section-label">Explorador</p>
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por codigo, proceso o tipo documental"
              className="w-full rounded-[20px] border border-line bg-white/80 px-4 py-3 text-sm outline-none focus:border-accent focus:shadow-[0_0_0_4px_rgba(18,77,93,0.08)]"
            />
          </div>

          <div className="subtle-scroll max-h-[760px] space-y-3 overflow-auto pr-1">
            {filteredDocuments.map((document) => (
              <button
                key={document.id}
                type="button"
                onClick={() => setSelectedId(document.id)}
                className={`w-full rounded-[22px] border px-4 py-4 text-left ${
                  selectedDocument?.id === document.id
                    ? "border-accent bg-accent-soft/48"
                    : "border-line bg-white/72 hover:border-line-strong hover:bg-white/88"
                }`}
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <StatusChip tone={workflowTone(documentStateLabels[document.state])}>
                    {documentStateLabels[document.state]}
                  </StatusChip>
                  <StatusChip tone={visibilityTone(visibilityLabels[document.visibility])}>
                    {visibilityLabels[document.visibility]}
                  </StatusChip>
                </div>
                <p className="text-[1.45rem] font-semibold tracking-[-0.05em] text-foreground">
                  {document.code} · {document.title}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate">{document.process}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="surface-card p-5 2xl:sticky 2xl:top-4 2xl:h-fit">
          {selectedDocument ? (
            <div className="space-y-5">
              <div className="border-b border-line pb-5">
                <p className="section-label">Lectura controlada</p>
                <h2 className="mt-2 text-[2rem] font-semibold tracking-[-0.06em] text-foreground">
                  {selectedDocument.code}
                </h2>
                <p className="mt-2 text-lg leading-8 text-foreground">
                  {selectedDocument.title}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate">
                  {selectedDocument.type} · {selectedDocument.version} · {selectedDocument.updatedAt}
                </p>
              </div>

              <div className="rounded-[22px] border border-line bg-white/80 p-5">
                <div className="mb-4 flex flex-wrap gap-2">
                  <StatusChip tone={workflowTone(documentStateLabels[selectedDocument.state])}>
                    {documentStateLabels[selectedDocument.state]}
                  </StatusChip>
                  <StatusChip
                    tone={visibilityTone(visibilityLabels[selectedDocument.visibility])}
                  >
                    {visibilityLabels[selectedDocument.visibility]}
                  </StatusChip>
                </div>
                <p className="text-sm leading-7 text-slate">{selectedDocument.summary}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {selectedDocument.tags.map((tag) => (
                    <span key={tag} className="meta-pill">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[22px] border border-line bg-accent/4 p-5">
                <p className="section-label">Metadatos</p>
                <div className="mt-4 space-y-3 text-sm leading-6 text-slate">
                  <p>
                    <strong className="text-foreground">Responsable:</strong>{" "}
                    {selectedDocument.owner}
                  </p>
                  <p>
                    <strong className="text-foreground">Visibilidad:</strong>{" "}
                    {visibilityLabels[selectedDocument.visibility]}
                  </p>
                  <p>
                    <strong className="text-foreground">Descarga:</strong>{" "}
                    {selectedDocument.downloadWindow ?? "No aplica"}
                  </p>
                </div>
              </div>

              <div className="rounded-[22px] border border-line bg-white/80 p-5">
                <p className="section-label">Relaciones</p>
                <div className="mt-4 space-y-2">
                  {selectedDocument.relatedCodes.map((code) => (
                    <div
                      key={code}
                      className="rounded-[18px] bg-panel-muted/72 px-3 py-3 text-sm text-foreground"
                    >
                      {code}
                    </div>
                  ))}
                </div>
                {selectedDocument.replacement ? (
                  <p className="mt-4 text-sm leading-6 text-slate">
                    Sustituido por <strong className="text-foreground">{selectedDocument.replacement}</strong>.
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                <button type="button" className="button-secondary">
                  Ver historial
                </button>
                <button type="button" onClick={handleRequestDownload} className="button-primary">
                  Solicitar descarga
                </button>
              </div>

              {message ? (
                <div className="rounded-[18px] border border-green/18 bg-green-soft px-5 py-4 text-sm leading-6 text-green">
                  {message}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex min-h-[520px] items-center justify-center px-6 py-10 text-center">
              <div className="max-w-md">
                <p className="section-label">Sin resultados</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">
                  No hay documentos visibles con el filtro actual
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate">
                  Ajusta el criterio de búsqueda o revisa si tu rol tiene acceso a otra colección.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
