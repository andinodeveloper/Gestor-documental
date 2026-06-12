'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { canCreateDocumentRequests } from "@/lib/auth/permissions";
import { requireAuthorizedUser } from "@/lib/server/auth";
import {
  assignRequestToEditor,
  cancelRequest,
  closeRequest,
  createDocumentRequest,
  isRequestCapableReader,
  placeRequestOnHoldForRequester,
  registerRequesterResponse,
  startRequestWork,
  updateRequestProgress,
  updateRequestProgressItem,
} from "@/lib/server/request-service";
import type { RequestPriority, RequestType } from "@/lib/types";

export interface RequestActionState {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Partial<Record<string, string>>;
}

export interface RequestMutationState {
  status: "idle" | "error" | "success";
  message?: string;
}

const initialState: RequestActionState = {
  status: "idle",
};

const initialMutationState: RequestMutationState = {
  status: "idle",
};

export async function createRequestAction(
  _previousState: RequestActionState = initialState,
  formData: FormData,
): Promise<RequestActionState> {
  void _previousState;
  const returnPath = normalizeReturnPath(readText(formData.get("returnPath")));
  const user = await requireAuthorizedUser(returnPath);

  if (!canCreateDocumentRequests(user)) {
    return {
      status: "error",
      message: "Tu usuario no tiene permiso para crear solicitudes documentales.",
    };
  }

  const requestType = readRequestType(formData.get("requestType"));
  const requesterUserId = readText(formData.get("requesterUserId"));
  const requesterArea = readText(formData.get("requesterArea"));
  const suggestedProcessId = readText(formData.get("suggestedProcessId"));
  const suggestedDocumentTypeId = readText(formData.get("suggestedDocumentTypeId"));
  const relatedDocumentId = readText(formData.get("relatedDocumentId"));
  const title = readText(formData.get("title"));
  const description = readText(formData.get("description"));
  const justification = readOptionalText(formData.get("justification"));
  const priority = readPriority(formData.get("priority"));
  const requiredDate = readOptionalText(formData.get("requiredDate"));
  const attachments = formData
    .getAll("attachments")
    .filter((value): value is File => value instanceof File && value.size > 0);

  const fieldErrors: Partial<Record<string, string>> = {};

  if (!requestType) {
    fieldErrors.requestType =
      "Debes indicar si la solicitud es para documento nuevo o actualizacion.";
  }

  if (!requesterUserId) {
    fieldErrors.requesterUserId = "Debes indicar el lector solicitante.";
  }

  if (!requesterArea) {
    fieldErrors.requesterArea = "Debes indicar el area solicitante.";
  }

  if (!suggestedProcessId) {
    fieldErrors.suggestedProcessId = "Debes seleccionar un proceso relacionado.";
  }

  if (!suggestedDocumentTypeId) {
    fieldErrors.suggestedDocumentTypeId = "Debes seleccionar un tipo documental.";
  }

  if (!title) {
    fieldErrors.title = "Debes indicar un titulo de trabajo para la solicitud.";
  }

  if (!description) {
    fieldErrors.description = "Debes describir el alcance o necesidad del documento.";
  }

  if (!priority) {
    fieldErrors.priority = "Debes seleccionar una prioridad.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Revisa los campos obligatorios antes de guardar la solicitud.",
      fieldErrors,
    };
  }

  const validatedRequestType = requestType as RequestType;
  const validatedPriority = priority as RequestPriority;

  if (user.role === "READER" && requesterUserId !== user.id) {
    return {
      status: "error",
      message: "Un lector solo puede registrar solicitudes a su propio nombre.",
    };
  }

  if (!(await isRequestCapableReader(requesterUserId))) {
    return {
      status: "error",
      message: "El solicitante seleccionado no esta autorizado para este flujo.",
      fieldErrors: {
        requesterUserId: "Selecciona un lector habilitado para solicitudes.",
      },
    };
  }

  try {
    await createDocumentRequest({
      requesterUserId,
      createdByUser: user,
      requestType: validatedRequestType,
      requesterArea,
      suggestedProcessId,
      suggestedDocumentTypeId,
      relatedDocumentId: relatedDocumentId || undefined,
      title,
      description,
      justification,
      priority: validatedPriority,
      requiredDate: requiredDate || undefined,
      attachments,
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "No fue posible crear la solicitud en este momento.",
    };
  }

  revalidatePath("/requests");
  revalidatePath("/dashboard");
  revalidatePath("/explorer");
  redirect(returnPath);
}

export async function assignRequestAction(formData: FormData) {
  const result = await runAssignRequest(formData);

  if (result.status === "error") {
    throw new Error(result.message);
  }
}

export async function assignRequestStateAction(
  _previousState: RequestMutationState = initialMutationState,
  formData: FormData,
): Promise<RequestMutationState> {
  void _previousState;
  return runAssignRequest(formData);
}

async function runAssignRequest(formData: FormData): Promise<RequestMutationState> {
  const user = await requireAuthorizedUser("/requests");

  if (user.role !== "ADMINISTRATOR") {
    return {
      status: "error",
      message: "Solo un administrador puede asignar solicitudes.",
    };
  }

  const requestId = readText(formData.get("requestId"));
  const editorId = readText(formData.get("editorId"));

  if (!requestId || !editorId) {
    return {
      status: "error",
      message: "Debes indicar la solicitud y el editor de destino.",
    };
  }

  try {
    await assignRequestToEditor({
      requestId,
      editorId,
      assignedByUserId: user.id,
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "No fue posible guardar la asignacion.",
    };
  }

  revalidatePath("/requests");
  revalidatePath("/dashboard");

  return {
    status: "success",
  };
}

export async function startRequestAction(formData: FormData) {
  const result = await runStartRequest(formData);

  if (result.status === "error") {
    throw new Error(result.message);
  }
}

export async function startRequestStateAction(
  _previousState: RequestMutationState = initialMutationState,
  formData: FormData,
): Promise<RequestMutationState> {
  void _previousState;
  return runStartRequest(formData);
}

async function runStartRequest(formData: FormData): Promise<RequestMutationState> {
  const user = await requireAuthorizedUser("/requests");
  const requestId = readText(formData.get("requestId"));

  if (!requestId) {
    return {
      status: "error",
      message: "Debes indicar la solicitud a iniciar.",
    };
  }

  try {
    await startRequestWork({
      requestId,
      actorUser: user,
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "No fue posible actualizar el estado.",
    };
  }

  revalidatePath("/requests");
  revalidatePath("/dashboard");

  return {
    status: "success",
  };
}

export async function updateRequestProgressAction(formData: FormData) {
  const result = await runUpdateRequestProgress(formData);

  if (result.status === "error") {
    throw new Error(result.message);
  }
}

export async function updateRequestProgressStateAction(
  _previousState: RequestMutationState = initialMutationState,
  formData: FormData,
): Promise<RequestMutationState> {
  void _previousState;
  return runUpdateRequestProgress(formData);
}

async function runUpdateRequestProgress(formData: FormData): Promise<RequestMutationState> {
  const user = await requireAuthorizedUser("/requests");
  const requestId = readText(formData.get("requestId"));
  const note = readText(formData.get("note"));

  if (!requestId || !note) {
    return {
      status: "error",
      message: "Debes indicar la solicitud y la nota de seguimiento.",
    };
  }

  try {
    await updateRequestProgress({
      requestId,
      actorUser: user,
      note,
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "No fue posible registrar la nota.",
    };
  }

  revalidateRequestPages();

  return {
    status: "success",
  };
}

export async function updateRequestProgressItemStateAction(
  _previousState: RequestMutationState = initialMutationState,
  formData: FormData,
): Promise<RequestMutationState> {
  void _previousState;

  const user = await requireAuthorizedUser("/requests");
  const requestId = readText(formData.get("requestId"));
  const activityCode = readText(formData.get("activityCode"));
  const note = readText(formData.get("note"));
  const transition = readProgressTransition(formData.get("transition"));

  if (!requestId || !activityCode || !note || !transition) {
    return {
      status: "error",
      message: "Debes indicar la solicitud, la actividad y el detalle del cambio.",
    };
  }

  try {
    await updateRequestProgressItem({
      actorUser: user,
      note,
      requestId,
      activityCode,
      transition,
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "No fue posible actualizar el seguimiento objetivo.",
    };
  }

  revalidateRequestPages();

  return {
    status: "success",
  };
}

export async function placeRequestOnHoldForRequesterStateAction(
  _previousState: RequestMutationState = initialMutationState,
  formData: FormData,
): Promise<RequestMutationState> {
  void _previousState;

  const user = await requireAuthorizedUser("/requests");
  const requestId = readText(formData.get("requestId"));
  const activityCode = readText(formData.get("activityCode"));
  const note = readText(formData.get("note"));

  if (!requestId || !activityCode || !note) {
    return {
      status: "error",
      message: "Debes indicar la solicitud, la actividad y la informacion solicitada.",
    };
  }

  try {
    await placeRequestOnHoldForRequester({
      actorUser: user,
      note,
      requestId,
      activityCode,
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "No fue posible pausar la solicitud.",
    };
  }

  revalidateRequestPages();

  return {
    status: "success",
  };
}

export async function registerRequesterResponseStateAction(
  _previousState: RequestMutationState = initialMutationState,
  formData: FormData,
): Promise<RequestMutationState> {
  void _previousState;

  const user = await requireAuthorizedUser("/requests");
  const requestId = readText(formData.get("requestId"));
  const activityCode = readText(formData.get("activityCode"));
  const note = readText(formData.get("note"));

  if (!requestId || !activityCode || !note) {
    return {
      status: "error",
      message: "Debes indicar la solicitud, la actividad y la respuesta registrada.",
    };
  }

  try {
    await registerRequesterResponse({
      actorUser: user,
      note,
      requestId,
      activityCode,
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "No fue posible registrar la respuesta del solicitante.",
    };
  }

  revalidateRequestPages();

  return {
    status: "success",
  };
}

export async function cancelRequestAction(formData: FormData) {
  const result = await runCancelRequest(formData);

  if (result.status === "error") {
    throw new Error(result.message);
  }
}

export async function cancelRequestStateAction(
  _previousState: RequestMutationState = initialMutationState,
  formData: FormData,
): Promise<RequestMutationState> {
  void _previousState;
  return runCancelRequest(formData);
}

async function runCancelRequest(formData: FormData): Promise<RequestMutationState> {
  const user = await requireAuthorizedUser("/requests");

  if (user.role !== "ADMINISTRATOR") {
    return {
      status: "error",
      message: "Solo un administrador puede cancelar solicitudes.",
    };
  }

  const requestId = readText(formData.get("requestId"));
  const reason = readText(formData.get("reason"));

  if (!requestId || !reason) {
    return {
      status: "error",
      message: "Debes indicar la solicitud y la justificacion de cancelacion.",
    };
  }

  try {
    await cancelRequest({
      requestId,
      actorUser: user,
      reason,
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "No fue posible cancelar la solicitud.",
    };
  }

  revalidateRequestPages();

  return {
    status: "success",
  };
}

export async function closeRequestAction(formData: FormData) {
  const result = await runCloseRequest(formData);

  if (result.status === "error") {
    throw new Error(result.message);
  }
}

export async function closeRequestStateAction(
  _previousState: RequestMutationState = initialMutationState,
  formData: FormData,
): Promise<RequestMutationState> {
  void _previousState;
  return runCloseRequest(formData);
}

async function runCloseRequest(formData: FormData): Promise<RequestMutationState> {
  const user = await requireAuthorizedUser("/requests");
  const requestId = readText(formData.get("requestId"));
  const note = readText(formData.get("note"));

  if (!requestId || !note) {
    return {
      status: "error",
      message: "Debes indicar la solicitud y el cierre registrado.",
    };
  }

  try {
    await closeRequest({
      requestId,
      actorUser: user,
      note,
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "No fue posible cerrar la solicitud.",
    };
  }

  revalidateRequestPages();

  return {
    status: "success",
  };
}

function readText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalText(value: FormDataEntryValue | null) {
  const text = readText(value);
  return text || undefined;
}

function readRequestType(value: FormDataEntryValue | null): RequestType | null {
  const text = readText(value);
  return text === "UPDATE_EXISTING" || text === "NEW_DOCUMENT" ? text : null;
}

function readPriority(value: FormDataEntryValue | null): RequestPriority | null {
  const text = readText(value);
  return text === "Alta" || text === "Media" || text === "Baja" ? text : null;
}

function readProgressTransition(
  value: FormDataEntryValue | null,
): "COMPLETE" | "REOPEN" | "MARK_NOT_APPLICABLE" | "RESTORE_APPLICABLE" | null {
  const text = readText(value);

  return text === "COMPLETE" ||
    text === "REOPEN" ||
    text === "MARK_NOT_APPLICABLE" ||
    text === "RESTORE_APPLICABLE"
    ? text
    : null;
}

function normalizeReturnPath(value: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/explorer";
  }

  return value;
}

function revalidateRequestPages() {
  revalidatePath("/requests");
  revalidatePath("/dashboard");
}
