'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { canCreateDocumentRequests } from "@/lib/auth/permissions";
import type { ResponsibilityRole, RequestPriority, RequestType, WaitingReason } from "@/lib/types";
import { requireAuthorizedUser } from "@/lib/server/auth";
import {
  approveCancellation,
  assignRequestToEditor,
  closeRequest,
  createDocumentRequest,
  isRequestCapableReader,
  rejectCancellation,
  requestCancellation,
  startRequestWork,
  updateRequestClassification,
  updateRequestProgress,
  updateRequestTracking,
} from "@/lib/server/request-service";

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
  const requesterAreaId = readText(formData.get("requesterAreaId"));
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

  if (!requesterAreaId) {
    fieldErrors.requesterAreaId = "Debes seleccionar un area activa.";
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
      requesterAreaId,
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

export async function assignRequestStateAction(
  _previousState: RequestMutationState = initialMutationState,
  formData: FormData,
): Promise<RequestMutationState> {
  void _previousState;
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

  revalidateRequestPages();

  return {
    status: "success",
  };
}

export async function startRequestStateAction(
  _previousState: RequestMutationState = initialMutationState,
  formData: FormData,
): Promise<RequestMutationState> {
  void _previousState;
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

  revalidateRequestPages();

  return {
    status: "success",
  };
}

export async function updateRequestProgressStateAction(
  _previousState: RequestMutationState = initialMutationState,
  formData: FormData,
): Promise<RequestMutationState> {
  void _previousState;
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

export async function updateRequestTrackingStateAction(
  _previousState: RequestMutationState = initialMutationState,
  formData: FormData,
): Promise<RequestMutationState> {
  void _previousState;
  const user = await requireAuthorizedUser("/requests");
  const requestId = readText(formData.get("requestId"));
  const stageCode = readText(formData.get("stageCode"));
  const responsibilityRole = readResponsibilityRole(formData.get("responsibilityRole"));
  const waitingReason = readWaitingReason(formData.get("waitingReason"));
  const note = readText(formData.get("note"));

  if (!requestId || !stageCode || !responsibilityRole || !waitingReason || !note) {
    return {
      status: "error",
      message:
        "Debes indicar la solicitud, la etapa actual, la responsabilidad y el comentario del seguimiento.",
    };
  }

  try {
    await updateRequestTracking({
      actorUser: user,
      note,
      requestId,
      responsibilityRole,
      stageCode,
      waitingReason,
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "No fue posible actualizar el seguimiento de la solicitud.",
    };
  }

  revalidateRequestPages();

  return {
    status: "success",
  };
}

export async function updateRequestClassificationStateAction(
  _previousState: RequestMutationState = initialMutationState,
  formData: FormData,
): Promise<RequestMutationState> {
  void _previousState;
  const user = await requireAuthorizedUser("/requests");
  const requestId = readText(formData.get("requestId"));
  const requesterAreaId = readText(formData.get("requesterAreaId"));
  const suggestedProcessId = readText(formData.get("suggestedProcessId"));
  const suggestedDocumentTypeId = readText(formData.get("suggestedDocumentTypeId"));
  const note = readOptionalText(formData.get("note"));

  if (!requestId || !requesterAreaId || !suggestedProcessId || !suggestedDocumentTypeId) {
    return {
      status: "error",
      message:
        "Debes indicar la solicitud y completar area, proceso y tipo documental.",
    };
  }

  try {
    await updateRequestClassification({
      actorUser: user,
      note,
      requestId,
      requesterAreaId,
      suggestedDocumentTypeId,
      suggestedProcessId,
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "No fue posible actualizar la clasificacion de la solicitud.",
    };
  }

  revalidateRequestPages();

  return {
    status: "success",
  };
}

export async function requestCancellationStateAction(
  _previousState: RequestMutationState = initialMutationState,
  formData: FormData,
): Promise<RequestMutationState> {
  void _previousState;
  const user = await requireAuthorizedUser("/requests");
  const requestId = readText(formData.get("requestId"));
  const reason = readText(formData.get("reason"));

  if (!requestId || !reason) {
    return {
      status: "error",
      message: "Debes indicar la solicitud y la justificacion de la cancelacion solicitada.",
    };
  }

  try {
    await requestCancellation({
      requestId,
      actorUser: user,
      reason,
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "No fue posible solicitar la cancelacion.",
    };
  }

  revalidateRequestPages();

  return {
    status: "success",
  };
}

export async function approveCancellationStateAction(
  _previousState: RequestMutationState = initialMutationState,
  formData: FormData,
): Promise<RequestMutationState> {
  void _previousState;
  const user = await requireAuthorizedUser("/requests");

  if (user.role !== "ADMINISTRATOR") {
    return {
      status: "error",
      message: "Solo un administrador puede aprobar cancelaciones.",
    };
  }

  const requestId = readText(formData.get("requestId"));
  const note = readText(formData.get("note"));

  if (!requestId || !note) {
    return {
      status: "error",
      message: "Debes indicar la solicitud y la aprobacion de cancelacion.",
    };
  }

  try {
    await approveCancellation({
      requestId,
      actorUser: user,
      note,
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "No fue posible aprobar la cancelacion.",
    };
  }

  revalidateRequestPages();

  return {
    status: "success",
  };
}

export async function rejectCancellationStateAction(
  _previousState: RequestMutationState = initialMutationState,
  formData: FormData,
): Promise<RequestMutationState> {
  void _previousState;
  const user = await requireAuthorizedUser("/requests");

  if (user.role !== "ADMINISTRATOR") {
    return {
      status: "error",
      message: "Solo un administrador puede rechazar cancelaciones.",
    };
  }

  const requestId = readText(formData.get("requestId"));
  const note = readText(formData.get("note"));

  if (!requestId || !note) {
    return {
      status: "error",
      message: "Debes indicar la solicitud y el rechazo de cancelacion.",
    };
  }

  try {
    await rejectCancellation({
      requestId,
      actorUser: user,
      note,
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "No fue posible rechazar la cancelacion.",
    };
  }

  revalidateRequestPages();

  return {
    status: "success",
  };
}

export async function closeRequestStateAction(
  _previousState: RequestMutationState = initialMutationState,
  formData: FormData,
): Promise<RequestMutationState> {
  void _previousState;
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

function readResponsibilityRole(value: FormDataEntryValue | null): ResponsibilityRole | null {
  const text = readText(value);
  return text === "ADMINISTRATOR" || text === "EDITOR" || text === "REQUESTER" ? text : null;
}

function readWaitingReason(value: FormDataEntryValue | null): WaitingReason | null {
  const text = readText(value);

  return text === "NONE" ||
    text === "WAITING_REQUESTER_INFO" ||
    text === "WAITING_INTERNAL_RESPONSE" ||
    text === "WAITING_REVIEW" ||
    text === "WAITING_APPROVAL"
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
