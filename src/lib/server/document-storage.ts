import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { getFileManagementPolicy } from "@/lib/server/file-management-settings";

const mimeTypesByExtension: Record<string, string> = {
  csv: "text/csv",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  odp: "application/vnd.oasis.opendocument.presentation",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odt: "application/vnd.oasis.opendocument.text",
  pdf: "application/pdf",
  png: "image/png",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  rtf: "application/rtf",
  txt: "text/plain",
  webp: "image/webp",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export interface StoredDocumentFile {
  originalFileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByUserId?: string;
}

export async function getDocumentFilePolicy() {
  const policy = await getFileManagementPolicy();

  return {
    allowedExtensions: policy.documentAllowedExtensions,
    maxFileSizeBytes: policy.documentMaxFileSizeBytes,
  };
}

export async function saveDocumentFile(input: {
  documentId: string;
  documentVersionId: string;
  file: File;
  fileRole: "DRAFT" | "OFFICIAL";
  uploadedByUserId?: string;
}) {
  const { allowedExtensions, maxFileSizeBytes } = await getDocumentFilePolicy();
  const originalFileName = input.file.name.trim();
  const extension = getFileExtension(originalFileName);

  if (!originalFileName) {
    throw new Error("Debes indicar un archivo documental valido.");
  }

  if (!allowedExtensions.includes(extension)) {
    throw new Error(
      `Solo se permiten archivos con extensiones: ${allowedExtensions.join(", ")}.`,
    );
  }

  if (input.file.size === 0) {
    throw new Error(`El archivo ${originalFileName} esta vacio.`);
  }

  if (input.file.size > maxFileSizeBytes) {
    throw new Error(
      `El archivo ${originalFileName} supera el tamano maximo de ${formatMegabytes(maxFileSizeBytes)} MB.`,
    );
  }

  const relativePath = toStoragePath({
    documentId: input.documentId,
    documentVersionId: input.documentVersionId,
    extension,
    fileRole: input.fileRole,
  });
  const absolutePath = resolveStoragePath(relativePath);
  const targetDirectory = path.dirname(absolutePath);
  const buffer = Buffer.from(await input.file.arrayBuffer());

  await mkdir(targetDirectory, { recursive: true });
  await writeFile(absolutePath, buffer);

  return {
    originalFileName,
    storagePath: relativePath,
    mimeType: input.file.type || mimeTypesByExtension[extension] || "application/octet-stream",
    sizeBytes: buffer.byteLength,
    uploadedByUserId: input.uploadedByUserId,
  } satisfies StoredDocumentFile;
}

export async function readStoredDocumentFile(storagePath: string) {
  return readFile(resolveStoragePath(storagePath));
}

export async function deleteStoredDocumentFiles(storagePaths: string[]) {
  await Promise.all(
    storagePaths.map(async (storagePath) => {
      await rm(resolveStoragePath(storagePath), { force: true });
    }),
  );
}

export function formatDocumentFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStorageRoot() {
  const configuredRoot = process.env.FILE_STORAGE_ROOT?.trim() || "./storage";
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), configuredRoot);
}

function resolveStoragePath(storagePath: string) {
  const normalizedRelativePath = storagePath.replace(/\\/g, "/");
  const storageRoot = getStorageRoot();
  const absolutePath = path.resolve(storageRoot, normalizedRelativePath);
  const relativePath = path.relative(storageRoot, absolutePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("La ruta de almacenamiento del documento es invalida.");
  }

  return absolutePath;
}

function getFileExtension(fileName: string) {
  return path.extname(fileName).replace(".", "").trim().toLowerCase();
}

function toStoragePath(input: {
  documentId: string;
  documentVersionId: string;
  extension: string;
  fileRole: "DRAFT" | "OFFICIAL";
}) {
  return `document-files/${input.documentId}/${input.documentVersionId}/${input.fileRole.toLowerCase()}/${randomUUID()}.${input.extension}`;
}

function formatMegabytes(sizeBytes: number) {
  return (sizeBytes / (1024 * 1024)).toFixed(0);
}
