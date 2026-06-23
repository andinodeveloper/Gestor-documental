'use server';

import { revalidatePath } from "next/cache";

import { requireAuthorizedUser } from "@/lib/server/auth";
import {
  normalizeAllowedExtensionsInput,
  parseMegabyteValue,
  updateFileManagementPolicy,
} from "@/lib/server/file-management-settings";

const DEFAULT_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024;
const DEFAULT_TOTAL_SIZE_BYTES = 75 * 1024 * 1024;
const DEFAULT_DOCUMENT_SIZE_BYTES = 15 * 1024 * 1024;

export async function updateFileManagementPolicyAction(formData: FormData) {
  const user = await requireAuthorizedUser("/admin/settings");

  if (user.role !== "ADMINISTRATOR") {
    throw new Error("Solo un administrador puede actualizar esta configuracion.");
  }

  await updateFileManagementPolicy({
    actorUserId: user.id,
    documentAllowedExtensions: normalizeAllowedExtensionsInput(
      readText(formData.get("documentAllowedExtensions")),
    ),
    documentMaxFileSizeBytes: parseMegabyteValue(
      readText(formData.get("documentMaxFileSizeMb")),
      DEFAULT_DOCUMENT_SIZE_BYTES,
    ),
    requestAllowedExtensions: normalizeAllowedExtensionsInput(
      readText(formData.get("requestAllowedExtensions")),
    ),
    requestMaxAttachmentCount: readPositiveInteger(
      formData.get("requestMaxAttachmentCount"),
      10,
    ),
    requestMaxAttachmentSizeBytes: parseMegabyteValue(
      readText(formData.get("requestMaxAttachmentSizeMb")),
      DEFAULT_ATTACHMENT_SIZE_BYTES,
    ),
    requestMaxTotalSizeBytes: parseMegabyteValue(
      readText(formData.get("requestMaxTotalSizeMb")),
      DEFAULT_TOTAL_SIZE_BYTES,
    ),
  });

  revalidatePath("/admin/settings");
  revalidatePath("/requests");
  revalidatePath("/dashboard");
  revalidatePath("/explorer");
  revalidatePath("/documents");
  revalidatePath("/reviews");
}

function readText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function readPositiveInteger(value: FormDataEntryValue | null, fallback: number) {
  const parsedValue = Number.parseInt(readText(value), 10);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
}
