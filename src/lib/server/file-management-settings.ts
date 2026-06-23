import path from "node:path";

import type { FilePreviewKind } from "@/lib/types";
import { readAppSettingValue, writeAppSettingValue } from "@/lib/server/app-settings-store";

const FILE_MANAGEMENT_POLICY_SETTING_KEY = "file_management.policy.v1";

const DEFAULT_ALLOWED_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
  "rtf",
  "csv",
  "odt",
  "ods",
  "odp",
  "png",
  "jpg",
  "jpeg",
  "webp",
];

const DEFAULT_REQUEST_MAX_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024;
const DEFAULT_REQUEST_MAX_ATTACHMENT_COUNT = 10;
const DEFAULT_REQUEST_MAX_TOTAL_SIZE_BYTES = 75 * 1024 * 1024;
const DEFAULT_DOCUMENT_MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

export interface FileManagementPolicy {
  documentAllowedExtensions: string[];
  documentMaxFileSizeBytes: number;
  requestAllowedExtensions: string[];
  requestMaxAttachmentCount: number;
  requestMaxAttachmentSizeBytes: number;
  requestMaxTotalSizeBytes: number;
}

export interface LibreOfficeRuntimeInfo {
  executablePath?: string;
  isConfigured: boolean;
  previewCacheRoot: string;
  timeoutMs: number;
}

type StoredFileManagementPolicy = Partial<FileManagementPolicy>;

export async function getFileManagementPolicy(): Promise<FileManagementPolicy> {
  const defaults = getDefaultFileManagementPolicy();
  const storedPolicy =
    (await readAppSettingValue<StoredFileManagementPolicy>(FILE_MANAGEMENT_POLICY_SETTING_KEY)) ??
    {};

  return {
    documentAllowedExtensions: normalizeExtensionList(
      storedPolicy.documentAllowedExtensions,
      defaults.documentAllowedExtensions,
    ),
    documentMaxFileSizeBytes: normalizeByteLimit(
      storedPolicy.documentMaxFileSizeBytes,
      defaults.documentMaxFileSizeBytes,
    ),
    requestAllowedExtensions: normalizeExtensionList(
      storedPolicy.requestAllowedExtensions,
      defaults.requestAllowedExtensions,
    ),
    requestMaxAttachmentCount: normalizeCountLimit(
      storedPolicy.requestMaxAttachmentCount,
      defaults.requestMaxAttachmentCount,
    ),
    requestMaxAttachmentSizeBytes: normalizeByteLimit(
      storedPolicy.requestMaxAttachmentSizeBytes,
      defaults.requestMaxAttachmentSizeBytes,
    ),
    requestMaxTotalSizeBytes: normalizeByteLimit(
      storedPolicy.requestMaxTotalSizeBytes,
      defaults.requestMaxTotalSizeBytes,
    ),
  };
}

export async function updateFileManagementPolicy(input: {
  actorUserId: string;
  documentAllowedExtensions: string[];
  documentMaxFileSizeBytes: number;
  requestAllowedExtensions: string[];
  requestMaxAttachmentCount: number;
  requestMaxAttachmentSizeBytes: number;
  requestMaxTotalSizeBytes: number;
}) {
  await writeAppSettingValue<FileManagementPolicy>({
    settingKey: FILE_MANAGEMENT_POLICY_SETTING_KEY,
    updatedByUserId: input.actorUserId,
    value: {
      documentAllowedExtensions: normalizeExtensionList(
        input.documentAllowedExtensions,
        DEFAULT_ALLOWED_EXTENSIONS,
      ),
      documentMaxFileSizeBytes: normalizeByteLimit(
        input.documentMaxFileSizeBytes,
        DEFAULT_DOCUMENT_MAX_FILE_SIZE_BYTES,
      ),
      requestAllowedExtensions: normalizeExtensionList(
        input.requestAllowedExtensions,
        DEFAULT_ALLOWED_EXTENSIONS,
      ),
      requestMaxAttachmentCount: normalizeCountLimit(
        input.requestMaxAttachmentCount,
        DEFAULT_REQUEST_MAX_ATTACHMENT_COUNT,
      ),
      requestMaxAttachmentSizeBytes: normalizeByteLimit(
        input.requestMaxAttachmentSizeBytes,
        DEFAULT_REQUEST_MAX_ATTACHMENT_SIZE_BYTES,
      ),
      requestMaxTotalSizeBytes: normalizeByteLimit(
        input.requestMaxTotalSizeBytes,
        DEFAULT_REQUEST_MAX_TOTAL_SIZE_BYTES,
      ),
    },
  });
}

export function getLibreOfficeRuntimeInfo(): LibreOfficeRuntimeInfo {
  const executablePath = process.env.LIBREOFFICE_EXECUTABLE_PATH?.trim() || undefined;
  const timeoutMs = normalizeCountLimit(
    Number.parseInt(process.env.LIBREOFFICE_TIMEOUT_MS || "", 10),
    45_000,
  );
  const previewCacheRoot = path.resolve(
    process.cwd(),
    process.env.FILE_PREVIEW_CACHE_ROOT?.trim() || "./storage/derived-previews",
  );

  return {
    executablePath,
    isConfigured: Boolean(executablePath),
    previewCacheRoot,
    timeoutMs,
  };
}

export function normalizeAllowedExtensionsInput(value: string) {
  return normalizeExtensionList(value.split(","), DEFAULT_ALLOWED_EXTENSIONS);
}

export function formatAllowedExtensionsLabel(extensions: string[]) {
  return extensions.map((extension) => extension.toUpperCase()).join(", ");
}

export function formatMegabyteValue(sizeBytes: number) {
  return Number((sizeBytes / (1024 * 1024)).toFixed(1));
}

export function parseMegabyteValue(value: string, fallbackBytes: number) {
  const normalizedValue = Number.parseFloat(value.trim().replace(",", "."));

  if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) {
    return fallbackBytes;
  }

  return Math.round(normalizedValue * 1024 * 1024);
}

export function classifyFilePreviewKind(input: {
  mimeType?: string;
  originalFileName: string;
}): FilePreviewKind {
  const extension = path.extname(input.originalFileName).replace(".", "").trim().toLowerCase();
  const mimeType = input.mimeType?.trim().toLowerCase() || "";

  if (extension === "pdf" || mimeType === "application/pdf") {
    return "pdf";
  }

  if (["png", "jpg", "jpeg", "webp"].includes(extension) || mimeType.startsWith("image/")) {
    return "image";
  }

  if (["xls", "xlsx", "ods", "csv"].includes(extension)) {
    return "spreadsheet";
  }

  if (["doc", "docx", "ppt", "pptx", "odt", "odp", "rtf"].includes(extension)) {
    return "office";
  }

  if (extension === "txt" || mimeType.startsWith("text/")) {
    return "plain-text";
  }

  return "unsupported";
}

function getDefaultFileManagementPolicy() {
  return {
    documentAllowedExtensions: [...DEFAULT_ALLOWED_EXTENSIONS],
    documentMaxFileSizeBytes: DEFAULT_DOCUMENT_MAX_FILE_SIZE_BYTES,
    requestAllowedExtensions: [...DEFAULT_ALLOWED_EXTENSIONS],
    requestMaxAttachmentCount: DEFAULT_REQUEST_MAX_ATTACHMENT_COUNT,
    requestMaxAttachmentSizeBytes: DEFAULT_REQUEST_MAX_ATTACHMENT_SIZE_BYTES,
    requestMaxTotalSizeBytes: DEFAULT_REQUEST_MAX_TOTAL_SIZE_BYTES,
  } satisfies FileManagementPolicy;
}

function normalizeExtensionList(value: unknown, fallback: string[]) {
  const sourceValues = Array.isArray(value) ? value : [];
  const normalizedValues = sourceValues
    .map((item) => (typeof item === "string" ? item.trim().toLowerCase() : ""))
    .filter(Boolean);

  return [...new Set(normalizedValues.length > 0 ? normalizedValues : fallback)];
}

function normalizeByteLimit(value: unknown, fallback: number) {
  const numericValue = typeof value === "number" ? value : Number.parseInt(String(value || ""), 10);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return fallback;
  }

  return Math.round(numericValue);
}

function normalizeCountLimit(value: unknown, fallback: number) {
  const numericValue = typeof value === "number" ? value : Number.parseInt(String(value || ""), 10);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return fallback;
  }

  return Math.round(numericValue);
}
