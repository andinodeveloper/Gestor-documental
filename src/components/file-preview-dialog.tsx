'use client';

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function FilePreviewDialog({
  canDownload = false,
  downloadHref,
  fileName,
  previewHref,
}: {
  canDownload?: boolean;
  downloadHref?: string;
  fileName: string;
  previewHref: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    return () => {
      setMounted(false);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button type="button" className="button-secondary" onClick={() => setOpen(true)}>
        Vista previa
      </button>

      {mounted && open
        ? createPortal(
            <div className="fixed inset-0 z-[80] bg-foreground/28 backdrop-blur-sm">
              <div className="flex h-full w-full items-start justify-center overflow-y-auto px-4 py-4 md:px-6">
                <button
                  type="button"
                  aria-label="Cerrar vista previa"
                  className="absolute inset-0"
                  onClick={() => setOpen(false)}
                />

                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label={`Vista previa de ${fileName}`}
                  className="surface-card relative z-10 flex h-[min(92dvh,980px)] w-full max-w-[1240px] flex-col overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
                    <div className="min-w-0">
                      <p className="section-label">Vista previa</p>
                      <h2 className="panel-title mt-2 break-words">{fileName}</h2>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {canDownload && downloadHref ? (
                        <a href={downloadHref} className="button-secondary">
                          Descargar
                        </a>
                      ) : null}
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => setOpen(false)}
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 bg-panel-muted/40 p-4">
                    <iframe
                      title={`Vista previa de ${fileName}`}
                      src={previewHref}
                      className="h-full w-full rounded-[20px] border border-line bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
            ,
            document.body,
          )
        : null}
    </>
  );
}
