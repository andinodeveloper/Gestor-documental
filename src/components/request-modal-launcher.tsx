'use client';

import { useActionState, useEffect, useState } from "react";

import { createRequestAction, type RequestActionState } from "@/app/(workspace)/requests/actions";
import { requestTypeLabels } from "@/lib/presenters";
import type {
  RequestOptionRecord,
  RequestType,
  RequesterOptionRecord,
} from "@/lib/types";
import type { SessionUser } from "@/lib/auth/types";
import { SubmitButton } from "@/components/submit-button";

const initialState: RequestActionState = {
  status: "idle",
};

export function RequestModalLauncher({
  allowedExtensionsLabel,
  areaOptions,
  buttonClassName = "button-primary",
  buttonLabel = "Nueva solicitud",
  canCreateRequests,
  currentUser,
  documentTypeOptions,
  maxAttachmentCountLabel,
  maxAttachmentSizeLabel,
  maxTotalSizeLabel,
  processOptions,
  relatedDocumentOptions,
  requesterOptions,
  returnPath,
}: {
  allowedExtensionsLabel: string;
  areaOptions: RequestOptionRecord[];
  buttonClassName?: string;
  buttonLabel?: string;
  canCreateRequests: boolean;
  currentUser: Pick<SessionUser, "id" | "name" | "role">;
  documentTypeOptions: RequestOptionRecord[];
  maxAttachmentCountLabel: string;
  maxAttachmentSizeLabel: string;
  maxTotalSizeLabel: string;
  processOptions: RequestOptionRecord[];
  relatedDocumentOptions: RequestOptionRecord[];
  requesterOptions: RequesterOptionRecord[];
  returnPath: string;
}) {
  const [open, setOpen] = useState(false);
  const catalogReady =
    areaOptions.length > 0 && processOptions.length > 0 && documentTypeOptions.length > 0;
  const canResolveRequester =
    currentUser.role === "READER" || requesterOptions.length > 0;
  const isDisabled = !canCreateRequests || !catalogReady || !canResolveRequester;

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

  if (!canCreateRequests) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className={`${buttonClassName} disabled:cursor-not-allowed disabled:opacity-60`}
        disabled={isDisabled}
        onClick={() => setOpen(true)}
      >
        {buttonLabel}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/18 px-4 py-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Cerrar modal"
            className="absolute inset-0"
            onClick={() => setOpen(false)}
          />

          <div className="surface-card relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-[960px] flex-col overflow-hidden">
            <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
              <div>
                <p className="section-label">Nueva solicitud</p>
                <h2 className="panel-title mt-2">Ingreso formal del requerimiento</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate">
                  Registra la necesidad documental y, si ya existe un avance, vincula anexos o
                  borradores como insumo de trabajo para el editor.
                </p>
              </div>
              <button type="button" className="button-secondary" onClick={() => setOpen(false)}>
                Cerrar
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <RequestCreateForm
                allowedExtensionsLabel={allowedExtensionsLabel}
                areaOptions={areaOptions}
                catalogReady={catalogReady}
                currentUser={currentUser}
                documentTypeOptions={documentTypeOptions}
                maxAttachmentCountLabel={maxAttachmentCountLabel}
                maxAttachmentSizeLabel={maxAttachmentSizeLabel}
                maxTotalSizeLabel={maxTotalSizeLabel}
                processOptions={processOptions}
                relatedDocumentOptions={relatedDocumentOptions}
                requesterOptions={requesterOptions}
                returnPath={returnPath}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function RequestCreateForm({
  allowedExtensionsLabel,
  areaOptions,
  catalogReady,
  currentUser,
  documentTypeOptions,
  maxAttachmentCountLabel,
  maxAttachmentSizeLabel,
  maxTotalSizeLabel,
  processOptions,
  relatedDocumentOptions,
  requesterOptions,
  returnPath,
}: {
  allowedExtensionsLabel: string;
  areaOptions: RequestOptionRecord[];
  catalogReady: boolean;
  currentUser: Pick<SessionUser, "id" | "name" | "role">;
  documentTypeOptions: RequestOptionRecord[];
  maxAttachmentCountLabel: string;
  maxAttachmentSizeLabel: string;
  maxTotalSizeLabel: string;
  processOptions: RequestOptionRecord[];
  relatedDocumentOptions: RequestOptionRecord[];
  requesterOptions: RequesterOptionRecord[];
  returnPath: string;
}) {
  const [state, formAction] = useActionState(createRequestAction, initialState);
  const [requestType, setRequestType] = useState<RequestType>("NEW_DOCUMENT");
  const isReaderSelfRequest = currentUser.role === "READER";

  if (!catalogReady) {
    return (
      <div className="rounded-[18px] border border-red/18 bg-red-soft px-4 py-4 text-sm leading-6 text-red">
        No hay catalogos activos de areas, procesos o tipos documentales. Ejecuta la semilla
        inicial antes de capturar solicitudes.
      </div>
    );
  }

  if (!isReaderSelfRequest && requesterOptions.length === 0) {
    return (
      <div className="rounded-[18px] border border-red/18 bg-red-soft px-4 py-4 text-sm leading-6 text-red">
        No hay lectores autorizados para este flujo. Primero debes habilitar el permiso individual
        de solicitudes al menos para un lector.
      </div>
    );
  }

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col">
      <input type="hidden" name="returnPath" value={returnPath} />
      {isReaderSelfRequest ? (
        <input type="hidden" name="requesterUserId" value={currentUser.id} />
      ) : null}

      <div className="subtle-scroll flex-1 space-y-4 overflow-auto px-6 py-5">
      {isReaderSelfRequest ? (
        <div className="rounded-[18px] border border-line bg-accent/4 px-4 py-4 text-sm leading-6 text-slate">
          <p className="font-semibold text-foreground">Solicitante vinculado</p>
          <p className="mt-2">{currentUser.name}</p>
          <p className="mt-2">
            La solicitud quedara registrada a tu nombre y tambien como capturada por tu usuario.
          </p>
        </div>
      ) : (
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-foreground">Solicitante lector</span>
          <select
            name="requesterUserId"
            className="field-input"
            defaultValue=""
            required
          >
            <option value="">Selecciona el lector dueño de la solicitud</option>
            {requesterOptions.map((requester) => (
              <option key={requester.id} value={requester.id}>
                {requester.name} - {requester.username}
              </option>
            ))}
          </select>
          <p className="text-xs leading-5 text-slate">
            La solicitud quedara ligada al lector seleccionado, aunque el registro sea capturado
            por un administrador o editor.
          </p>
          <FieldError message={state.fieldErrors?.requesterUserId} />
        </label>
      )}

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-foreground">Tipo de solicitud</span>
        <select
          name="requestType"
          value={requestType}
          onChange={(event) => setRequestType(event.target.value as RequestType)}
          className="field-input"
        >
          <option value="NEW_DOCUMENT">{requestTypeLabels.NEW_DOCUMENT}</option>
          <option value="UPDATE_EXISTING">{requestTypeLabels.UPDATE_EXISTING}</option>
        </select>
        <FieldError message={state.fieldErrors?.requestType} />
      </label>

      {requestType === "UPDATE_EXISTING" ? (
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-foreground">Documento relacionado</span>
          <select name="relatedDocumentId" className="field-input" defaultValue="">
            <option value="">Selecciona un documento existente</option>
            {relatedDocumentOptions.map((document) => (
              <option key={document.id} value={document.id}>
                {document.label}
              </option>
            ))}
          </select>
          {relatedDocumentOptions.length === 0 ? (
            <p className="text-xs leading-5 text-slate">
              Aun no hay documentos oficiales registrados en la base para asociar la
              actualizacion.
            </p>
          ) : null}
          <FieldError message={state.fieldErrors?.relatedDocumentId} />
        </label>
      ) : null}

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-foreground">Area solicitante</span>
        <select name="requesterAreaId" className="field-input" defaultValue="" required>
          <option value="">Selecciona un area</option>
          {areaOptions.map((area) => (
            <option key={area.id} value={area.id}>
              {area.label}
            </option>
          ))}
        </select>
        <p className="text-xs leading-5 text-slate">
          Selecciona unicamente areas activas del catalogo funcional.
        </p>
        <FieldError message={state.fieldErrors?.requesterAreaId} />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-foreground">Proceso sugerido</span>
          <select name="suggestedProcessId" className="field-input" defaultValue="" required>
            <option value="">Selecciona un proceso</option>
            {processOptions.map((process) => (
              <option key={process.id} value={process.id}>
                {process.label}
              </option>
            ))}
          </select>
          <FieldError message={state.fieldErrors?.suggestedProcessId} />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-foreground">Tipo documental</span>
          <select
            name="suggestedDocumentTypeId"
            className="field-input"
            defaultValue=""
            required
          >
            <option value="">Selecciona un tipo</option>
            {documentTypeOptions.map((documentType) => (
              <option key={documentType.id} value={documentType.id}>
                {documentType.label}
              </option>
            ))}
          </select>
          <FieldError message={state.fieldErrors?.suggestedDocumentTypeId} />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-foreground">Titulo de trabajo</span>
        <input
          name="title"
          className="field-input"
          placeholder="Nombre tentativo del documento o version solicitada"
          required
        />
        <FieldError message={state.fieldErrors?.title} />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-foreground">Prioridad</span>
          <select name="priority" className="field-input" defaultValue="Media" required>
            <option value="Alta">Alta</option>
            <option value="Media">Media</option>
            <option value="Baja">Baja</option>
          </select>
          <FieldError message={state.fieldErrors?.priority} />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-foreground">Fecha requerida</span>
          <input name="requiredDate" type="date" className="field-input" />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-foreground">Descripcion</span>
        <textarea
          name="description"
          className="field-textarea"
          rows={5}
          placeholder="Describe el alcance, objetivo, usuarios impactados y necesidad concreta."
          required
        />
        <FieldError message={state.fieldErrors?.description} />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-foreground">Justificacion</span>
        <textarea
          name="justification"
          className="field-textarea"
          rows={4}
          placeholder="Motivo del requerimiento, urgencia o contexto normativo."
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-foreground">Anexos o borradores</span>
        <input
          name="attachments"
          type="file"
          className="field-file"
          multiple
          accept={allowedExtensionsLabel
            .split(", ")
            .map((extension) => `.${extension.toLowerCase()}`)
            .join(",")}
        />
        <p className="text-xs leading-5 text-slate">
          Formatos permitidos: {allowedExtensionsLabel}. Tamano maximo por archivo:{" "}
          {maxAttachmentSizeLabel}. Cantidad maxima: {maxAttachmentCountLabel}. Total por
          solicitud: {maxTotalSizeLabel}.
        </p>
      </label>

      {state.status === "error" && state.message ? (
        <div className="rounded-[18px] border border-red/18 bg-red-soft px-4 py-3 text-sm leading-6 text-red">
          {state.message}
        </div>
      ) : null}
      </div>

      <div className="shrink-0 border-t border-line bg-white/92 px-6 py-4">
        <div className="flex flex-wrap justify-end gap-3">
          <SubmitButton
            idleLabel="Crear solicitud"
            pendingLabel="Creando solicitud..."
            className="button-primary disabled:cursor-wait disabled:opacity-70"
          />
        </div>
      </div>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs leading-5 text-red">{message}</p>;
}
