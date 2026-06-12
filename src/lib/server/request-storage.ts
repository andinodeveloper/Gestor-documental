import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_ALLOWED_EXTENSIONS = ["pdf", "docx"];
const DEFAULT_MAX_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024;

const mimeTypesByExtension: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
};

export interface StoredRequestAttachment {
  originalFileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByUserId?: string;
}

export function getRequestAttachmentPolicy() {
  const configuredExtensions =
    process.env.FILE_ALLOWED_EXTENSIONS
      ?.split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean) ?? [];

  const allowedExtensions =
    configuredExtensions.length > 0 ? configuredExtensions : DEFAULT_ALLOWED_EXTENSIONS;

  return {
    allowedExtensions,
    maxAttachmentSizeBytes: DEFAULT_MAX_ATTACHMENT_SIZE_BYTES,
  };
}

export async function saveRequestAttachment(input: {
  requestId: string;
  file: File;
  uploadedByUserId?: string;
}) {
  const { requestId, file, uploadedByUserId } = input;
  const { allowedExtensions, maxAttachmentSizeBytes } = getRequestAttachmentPolicy();
  const originalFileName = file.name.trim();
  const extension = getFileExtension(originalFileName);

  if (!originalFileName) {
    throw new Error("Cada anexo debe tener nombre de archivo.");
  }

  if (!allowedExtensions.includes(extension)) {
    throw new Error(
      `Solo se permiten archivos con extensiones: ${allowedExtensions.join(", ")}.`,
    );
  }

  if (file.size === 0) {
    throw new Error(`El archivo ${originalFileName} esta vacio.`);
  }

  if (file.size > maxAttachmentSizeBytes) {
    throw new Error(
      `El archivo ${originalFileName} supera el tamano maximo de ${formatMegabytes(maxAttachmentSizeBytes)} MB.`,
    );
  }

  const relativePath = toStoragePath(requestId, extension);
  const absolutePath = resolveStoragePath(relativePath);
  const targetDirectory = path.dirname(absolutePath);
  const buffer = Buffer.from(await file.arrayBuffer());

  await mkdir(targetDirectory, { recursive: true });
  await writeFile(absolutePath, buffer);

  return {
    originalFileName,
    storagePath: relativePath,
    mimeType: file.type || mimeTypesByExtension[extension] || "application/octet-stream",
    sizeBytes: buffer.byteLength,
    uploadedByUserId,
  } satisfies StoredRequestAttachment;
}

export async function deleteStoredRequestAttachments(storagePaths: string[]) {
  await Promise.all(
    storagePaths.map(async (storagePath) => {
      const absolutePath = resolveStoragePath(storagePath);
      await rm(absolutePath, { force: true });
    }),
  );
}

export async function readStoredRequestAttachment(storagePath: string) {
  const absolutePath = resolveStoragePath(storagePath);
  return readFile(absolutePath);
}

export function formatAttachmentSize(sizeBytes: number) {
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
    throw new Error("La ruta de almacenamiento del anexo es invalida.");
  }

  return absolutePath;
}

function getFileExtension(fileName: string) {
  return path.extname(fileName).replace(".", "").trim().toLowerCase();
}

function toStoragePath(requestId: string, extension: string) {
  return `request-attachments/${requestId}/${randomUUID()}.${extension}`;
}

function formatMegabytes(sizeBytes: number) {
  return (sizeBytes / (1024 * 1024)).toFixed(0);
}
