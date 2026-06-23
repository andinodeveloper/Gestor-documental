import { execFile as execFileCallback } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import * as XLSX from "xlsx";

import {
  classifyFilePreviewKind,
  getLibreOfficeRuntimeInfo,
} from "@/lib/server/file-management-settings";
import type { FilePreviewKind } from "@/lib/types";

const execFile = promisify(execFileCallback);

export async function buildStoredFilePreviewResponse(input: {
  fileId: string;
  mimeType: string;
  originalFileName: string;
  storagePath: string;
}) {
  const previewKind = classifyFilePreviewKind(input);

  switch (previewKind) {
    case "pdf":
    case "image": {
      const buffer = await readFile(resolveStoragePath(input.storagePath));
      return createInlineFileResponse(
        buffer,
        resolvePreviewMimeType(input.mimeType, input.originalFileName, previewKind),
        input.originalFileName,
      );
    }
    case "plain-text": {
      const buffer = await readFile(resolveStoragePath(input.storagePath));
      return createHtmlPreviewResponse(
        renderTextPreviewDocument(input.originalFileName, buffer.toString("utf-8")),
      );
    }
    case "spreadsheet": {
      const html = await ensureSpreadsheetPreviewHtml({
        fileId: input.fileId,
        originalFileName: input.originalFileName,
        storagePath: input.storagePath,
      });
      return createHtmlPreviewResponse(html);
    }
    case "office": {
      const pdfBuffer = await ensureOfficePreviewPdf({
        fileId: input.fileId,
        originalFileName: input.originalFileName,
        storagePath: input.storagePath,
      });
      return createInlineFileResponse(pdfBuffer, "application/pdf", `${input.originalFileName}.pdf`);
    }
    default:
      return createHtmlPreviewResponse(
        renderPreviewMessageDocument({
          description:
            "El tipo de archivo cargado no tiene una vista previa web disponible en esta version.",
          title: input.originalFileName,
        }),
        415,
      );
  }
}

export function createPreviewErrorResponse(input: {
  description: string;
  status: number;
  title: string;
}) {
  return createHtmlPreviewResponse(renderPreviewMessageDocument(input), input.status);
}

export function buildFilePreviewHref(basePath: string, fileId: string) {
  return `${basePath}/${encodeURIComponent(fileId)}/preview`;
}

export function getFilePreviewKind(input: { mimeType: string; originalFileName: string }) {
  return classifyFilePreviewKind(input);
}

async function ensureSpreadsheetPreviewHtml(input: {
  fileId: string;
  originalFileName: string;
  storagePath: string;
}) {
  const cachePath = await ensurePreviewCachePath(`${input.fileId}.spreadsheet.html`);
  const cachedHtml = await readCachedPreviewFile(cachePath);

  if (cachedHtml) {
    return cachedHtml.toString("utf-8");
  }

  const workbook = XLSX.read(await readFile(resolveStoragePath(input.storagePath)), {
    cellDates: true,
    cellFormula: false,
    type: "buffer",
  });
  const sheetNames = workbook.SheetNames;

  if (sheetNames.length === 0) {
    const emptyHtml = renderPreviewMessageDocument({
      description: "El libro no contiene hojas visibles para previsualizar.",
      title: input.originalFileName,
    });
    await writeCachedPreviewFile(cachePath, emptyHtml);
    return emptyHtml;
  }

  const sheetLinks = sheetNames
    .map(
      (sheetName, index) =>
        `<a class="sheet-link" href="#sheet-${index + 1}">${escapeHtml(sheetName)}</a>`,
    )
    .join("");
  const sheetSections = sheetNames
    .map((sheetName, index) => {
      const sheet = workbook.Sheets[sheetName];
      const tableHtml = XLSX.utils.sheet_to_html(sheet, {
        editable: false,
        id: `sheet-table-${index + 1}`,
      });

      return `
        <section class="sheet-section" id="sheet-${index + 1}">
          <header class="sheet-header">
            <h2>${escapeHtml(sheetName)}</h2>
          </header>
          <div class="sheet-table-wrapper">
            ${tableHtml}
          </div>
        </section>
      `;
    })
    .join("");
  const html = `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(input.originalFileName)}</title>
        <style>
          :root {
            color-scheme: light;
            --line: #d7dde5;
            --ink: #12212c;
            --muted: #536271;
            --panel: #ffffff;
            --panel-alt: #f4f7fa;
            --accent: #155e75;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: "Segoe UI", Tahoma, sans-serif;
            color: var(--ink);
            background: linear-gradient(180deg, #eef5f7 0%, #f8fbfc 100%);
          }

          .preview-shell {
            min-height: 100vh;
            padding: 20px;
          }

          .preview-header {
            position: sticky;
            top: 0;
            z-index: 20;
            margin-bottom: 16px;
            border: 1px solid var(--line);
            border-radius: 20px;
            background: rgba(255, 255, 255, 0.96);
            backdrop-filter: blur(8px);
            padding: 18px 20px;
            box-shadow: 0 18px 42px rgba(18, 33, 44, 0.08);
          }

          .preview-header h1 {
            margin: 0;
            font-size: 1.15rem;
          }

          .preview-header p {
            margin: 8px 0 0;
            color: var(--muted);
            font-size: 0.95rem;
          }

          .sheet-links {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 14px;
          }

          .sheet-link {
            display: inline-flex;
            align-items: center;
            border: 1px solid rgba(21, 94, 117, 0.18);
            border-radius: 999px;
            background: rgba(21, 94, 117, 0.08);
            color: var(--accent);
            text-decoration: none;
            font-size: 0.85rem;
            font-weight: 600;
            padding: 8px 12px;
          }

          .sheet-section {
            border: 1px solid var(--line);
            border-radius: 22px;
            background: var(--panel);
            box-shadow: 0 18px 42px rgba(18, 33, 44, 0.06);
            overflow: hidden;
          }

          .sheet-section + .sheet-section {
            margin-top: 16px;
          }

          .sheet-header {
            border-bottom: 1px solid var(--line);
            background: var(--panel-alt);
            padding: 16px 18px;
          }

          .sheet-header h2 {
            margin: 0;
            font-size: 1rem;
          }

          .sheet-table-wrapper {
            overflow: auto;
            padding: 16px;
          }

          table {
            border-collapse: collapse;
            min-width: max-content;
            background: var(--panel);
          }

          td,
          th {
            border: 1px solid var(--line);
            padding: 6px 8px;
            vertical-align: top;
            white-space: pre-wrap;
          }

          th {
            background: #edf4f7;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        <main class="preview-shell">
          <section class="preview-header">
            <h1>${escapeHtml(input.originalFileName)}</h1>
            <p>Vista previa de hoja de calculo. La descarga del original se gestiona por permisos separados.</p>
            <nav class="sheet-links">${sheetLinks}</nav>
          </section>
          ${sheetSections}
        </main>
      </body>
    </html>
  `;

  await writeCachedPreviewFile(cachePath, html);
  return html;
}

async function ensureOfficePreviewPdf(input: {
  fileId: string;
  originalFileName: string;
  storagePath: string;
}) {
  const cachePath = await ensurePreviewCachePath(`${input.fileId}.office.pdf`);
  const cachedPdf = await readCachedPreviewFile(cachePath);

  if (cachedPdf) {
    return cachedPdf;
  }

  const runtimeInfo = getLibreOfficeRuntimeInfo();

  if (!runtimeInfo.isConfigured || !runtimeInfo.executablePath) {
    throw new Error(
      "La vista previa ofimatica requiere configurar LIBREOFFICE_EXECUTABLE_PATH en el servidor.",
    );
  }

  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "gestor-documental-preview-"));
  const outputDirectory = path.join(tempRoot, "output");
  const sourceExtension = path.extname(input.originalFileName) || path.extname(input.storagePath);
  const sourcePath = path.join(tempRoot, `source${sourceExtension}`);
  const profileRoot = path.join(tempRoot, "profile");
  const sourceStoragePath = resolveStoragePath(input.storagePath);

  try {
    await mkdir(outputDirectory, { recursive: true });
    await mkdir(profileRoot, { recursive: true });
    await copyFile(sourceStoragePath, sourcePath);

    await execFile(
      runtimeInfo.executablePath,
      [
        "--headless",
        `-env:UserInstallation=${pathToFileURL(profileRoot).href}`,
        "--convert-to",
        "pdf",
        "--outdir",
        outputDirectory,
        sourcePath,
      ],
      {
        timeout: runtimeInfo.timeoutMs,
        windowsHide: true,
      },
    );

    const expectedPdfPath = path.join(
      outputDirectory,
      `${path.parse(sourcePath).name}.pdf`,
    );
    const pdfBuffer = await readFile(expectedPdfPath);

    await writeCachedPreviewFile(cachePath, pdfBuffer);
    return pdfBuffer;
  } finally {
    await rm(tempRoot, { force: true, recursive: true });
  }
}

async function ensurePreviewCachePath(fileName: string) {
  const runtimeInfo = getLibreOfficeRuntimeInfo();
  await mkdir(runtimeInfo.previewCacheRoot, { recursive: true });
  return path.join(runtimeInfo.previewCacheRoot, fileName);
}

async function readCachedPreviewFile(cachePath: string) {
  try {
    await access(cachePath);
    return readFile(cachePath);
  } catch {
    return null;
  }
}

async function writeCachedPreviewFile(cachePath: string, content: Buffer | string) {
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, content);
}

function createInlineFileResponse(buffer: Buffer, mimeType: string, fileName: string) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Content-Type": mimeType || "application/octet-stream",
    },
  });
}

function createHtmlPreviewResponse(html: string, status = 200) {
  return new Response(html, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

function renderTextPreviewDocument(fileName: string, content: string) {
  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(fileName)}</title>
        <style>
          body {
            margin: 0;
            font-family: Consolas, "Courier New", monospace;
            background: #0f1720;
            color: #f4f7fa;
          }

          .shell {
            min-height: 100vh;
            padding: 20px;
          }

          .header {
            margin-bottom: 14px;
          }

          .header h1 {
            margin: 0;
            font-family: "Segoe UI", Tahoma, sans-serif;
            font-size: 1.1rem;
          }

          .header p {
            margin: 8px 0 0;
            font-family: "Segoe UI", Tahoma, sans-serif;
            color: #b7c6d3;
            font-size: 0.92rem;
          }

          pre {
            margin: 0;
            overflow: auto;
            border-radius: 20px;
            background: rgba(18, 33, 44, 0.94);
            padding: 20px;
            white-space: pre-wrap;
            word-break: break-word;
            box-shadow: inset 0 0 0 1px rgba(183, 198, 211, 0.14);
          }
        </style>
      </head>
      <body>
        <main class="shell">
          <header class="header">
            <h1>${escapeHtml(fileName)}</h1>
            <p>Vista previa textual en solo lectura.</p>
          </header>
          <pre>${escapeHtml(content)}</pre>
        </main>
      </body>
    </html>
  `;
}

function renderPreviewMessageDocument(input: { description: string; title: string }) {
  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(input.title)}</title>
        <style>
          body {
            margin: 0;
            font-family: "Segoe UI", Tahoma, sans-serif;
            background: linear-gradient(180deg, #eef4f6 0%, #f8fbfc 100%);
            color: #12212c;
          }

          .shell {
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 24px;
          }

          .card {
            width: min(640px, 100%);
            border: 1px solid #d7dde5;
            border-radius: 24px;
            background: rgba(255, 255, 255, 0.94);
            padding: 24px;
            box-shadow: 0 20px 44px rgba(18, 33, 44, 0.08);
          }

          h1 {
            margin: 0;
            font-size: 1.15rem;
          }

          p {
            margin: 14px 0 0;
            color: #536271;
            line-height: 1.7;
          }
        </style>
      </head>
      <body>
        <main class="shell">
          <section class="card">
            <h1>${escapeHtml(input.title)}</h1>
            <p>${escapeHtml(input.description)}</p>
          </section>
        </main>
      </body>
    </html>
  `;
}

function resolveStoragePath(storagePath: string) {
  const normalizedRelativePath = storagePath.replace(/\\/g, "/");
  const storageRoot = path.resolve(
    process.cwd(),
    process.env.FILE_STORAGE_ROOT?.trim() || "./storage",
  );
  const absolutePath = path.resolve(storageRoot, normalizedRelativePath);
  const relativePath = path.relative(storageRoot, absolutePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("La ruta de almacenamiento del archivo es invalida.");
  }

  return absolutePath;
}

function resolvePreviewMimeType(
  mimeType: string,
  fileName: string,
  previewKind: FilePreviewKind,
) {
  const normalizedMimeType = mimeType.trim().toLowerCase();

  if (normalizedMimeType) {
    return normalizedMimeType;
  }

  const extension = path.extname(fileName).replace(".", "").trim().toLowerCase();

  if (previewKind === "pdf") {
    return "application/pdf";
  }

  switch (extension) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
