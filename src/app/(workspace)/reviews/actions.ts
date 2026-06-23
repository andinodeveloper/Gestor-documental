'use server';

import { revalidatePath } from "next/cache";

import type { DraftCommentType, VersionChangeKind } from "@/lib/types";
import { requireAuthorizedUser } from "@/lib/server/auth";
import {
  addReviewComment,
  createDraftFromRequest,
  officializeVersion,
  recordReviewDecision,
  replaceDraftFile,
  resolveReviewComment,
  submitVersionForReview,
} from "@/lib/server/review-service";

export interface ReviewMutationState {
  status: "idle" | "error" | "success";
  message?: string;
}

const initialMutationState: ReviewMutationState = {
  status: "idle",
};

export async function createDraftFromRequestStateAction(
  _previousState: ReviewMutationState = initialMutationState,
  formData: FormData,
): Promise<ReviewMutationState> {
  void _previousState;
  const user = await requireAuthorizedUser("/reviews");
  const requestId = readText(formData.get("requestId"));
  const draftFile = readFile(formData.get("draftFile"));
  const changeKind = readVersionChangeKind(formData.get("changeKind"));
  const changeSummary = readOptionalText(formData.get("changeSummary"));

  if (!requestId || !draftFile) {
    return {
      status: "error",
      message: "Debes indicar la solicitud y cargar un borrador para continuar.",
    };
  }

  try {
    await createDraftFromRequest({
      actorUser: user,
      changeKind,
      changeSummary,
      draftFile,
      requestId,
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "No fue posible crear el borrador documental.",
    };
  }

  revalidateReviewModule();

  return {
    status: "success",
  };
}

export async function replaceDraftFileStateAction(
  _previousState: ReviewMutationState = initialMutationState,
  formData: FormData,
): Promise<ReviewMutationState> {
  void _previousState;
  const user = await requireAuthorizedUser("/reviews");
  const versionId = readText(formData.get("versionId"));
  const draftFile = readFile(formData.get("draftFile"));
  const changeSummary = readOptionalText(formData.get("changeSummary"));

  if (!versionId || !draftFile) {
    return {
      status: "error",
      message: "Debes indicar la version y cargar un nuevo archivo de borrador.",
    };
  }

  try {
    await replaceDraftFile({
      actorUser: user,
      changeSummary,
      draftFile,
      versionId,
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "No fue posible sustituir el borrador.",
    };
  }

  revalidateReviewModule();

  return {
    status: "success",
  };
}

export async function submitVersionForReviewStateAction(
  _previousState: ReviewMutationState = initialMutationState,
  formData: FormData,
): Promise<ReviewMutationState> {
  void _previousState;
  const user = await requireAuthorizedUser("/reviews");
  const versionId = readText(formData.get("versionId"));
  const reviewerIds = formData
    .getAll("reviewerIds")
    .map((value) => readText(value))
    .filter(Boolean);
  const approverIds = formData
    .getAll("approverIds")
    .map((value) => readText(value))
    .filter(Boolean);
  const note = readOptionalText(formData.get("note"));

  if (!versionId) {
    return {
      status: "error",
      message: "Debes indicar la version a someter.",
    };
  }

  try {
    await submitVersionForReview({
      actorUser: user,
      approverIds,
      note,
      reviewerIds,
      versionId,
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "No fue posible enviar el borrador a revision.",
    };
  }

  revalidateReviewModule();

  return {
    status: "success",
  };
}

export async function addReviewCommentStateAction(
  _previousState: ReviewMutationState = initialMutationState,
  formData: FormData,
): Promise<ReviewMutationState> {
  void _previousState;
  const user = await requireAuthorizedUser("/reviews");
  const assignmentId = readText(formData.get("assignmentId"));
  const comment = readText(formData.get("comment"));
  const commentType = readDraftCommentType(formData.get("commentType"));
  const sectionReference = readOptionalText(formData.get("sectionReference"));
  const suggestedText = readOptionalText(formData.get("suggestedText"));

  if (!assignmentId || !comment || !commentType) {
    return {
      status: "error",
      message: "Debes indicar la asignacion, el tipo y el contenido del comentario.",
    };
  }

  try {
    await addReviewComment({
      actorUser: user,
      assignmentId,
      comment,
      commentType,
      sectionReference,
      suggestedText,
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "No fue posible registrar el comentario.",
    };
  }

  revalidateReviewModule();

  return {
    status: "success",
  };
}

export async function resolveReviewCommentStateAction(
  _previousState: ReviewMutationState = initialMutationState,
  formData: FormData,
): Promise<ReviewMutationState> {
  void _previousState;
  const user = await requireAuthorizedUser("/reviews");
  const commentId = readText(formData.get("commentId"));

  if (!commentId) {
    return {
      status: "error",
      message: "Debes indicar el comentario que deseas resolver.",
    };
  }

  try {
    await resolveReviewComment({
      actorUser: user,
      commentId,
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "No fue posible resolver el comentario.",
    };
  }

  revalidateReviewModule();

  return {
    status: "success",
  };
}

export async function recordReviewDecisionStateAction(
  _previousState: ReviewMutationState = initialMutationState,
  formData: FormData,
): Promise<ReviewMutationState> {
  void _previousState;
  const user = await requireAuthorizedUser("/reviews");
  const assignmentId = readText(formData.get("assignmentId"));
  const decision = readDecision(formData.get("decision"));
  const decisionComment = readOptionalText(formData.get("decisionComment"));

  if (!assignmentId || !decision) {
    return {
      status: "error",
      message: "Debes indicar la asignacion y la decision a registrar.",
    };
  }

  try {
    await recordReviewDecision({
      actorUser: user,
      assignmentId,
      decision,
      decisionComment,
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "No fue posible guardar la decision de revision.",
    };
  }

  revalidateReviewModule();

  return {
    status: "success",
  };
}

export async function officializeVersionStateAction(
  _previousState: ReviewMutationState = initialMutationState,
  formData: FormData,
): Promise<ReviewMutationState> {
  void _previousState;
  const user = await requireAuthorizedUser("/reviews");
  const versionId = readText(formData.get("versionId"));
  const officialFile = readFile(formData.get("officialFile"));

  if (!versionId || !officialFile) {
    return {
      status: "error",
      message: "Debes indicar la version y cargar el archivo oficial.",
    };
  }

  try {
    await officializeVersion({
      actorUser: user,
      officialFile,
      versionId,
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "No fue posible oficializar la version.",
    };
  }

  revalidateReviewModule();

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

function readFile(value: FormDataEntryValue | null) {
  return value instanceof File && value.size > 0 ? value : null;
}

function readVersionChangeKind(value: FormDataEntryValue | null): VersionChangeKind | undefined {
  const text = readText(value);
  return text === "MAJOR" || text === "MINOR" ? text : undefined;
}

function readDraftCommentType(value: FormDataEntryValue | null): DraftCommentType | null {
  const text = readText(value);
  return text === "OBSERVATION" || text === "SUGGESTION" ? text : null;
}

function readDecision(value: FormDataEntryValue | null) {
  const text = readText(value);
  return text === "APPROVED" || text === "REJECTED" ? text : null;
}

function revalidateReviewModule() {
  revalidatePath("/reviews");
  revalidatePath("/requests");
  revalidatePath("/documents");
  revalidatePath("/dashboard");
  revalidatePath("/explorer");
  revalidatePath("/ai/search");
}
