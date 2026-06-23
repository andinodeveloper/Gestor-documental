import { runtimeConfig } from "@/lib/config/runtime";
import {
  formatAllowedExtensionsLabel,
  formatMegabyteValue,
  getFileManagementPolicy,
  getLibreOfficeRuntimeInfo,
} from "@/lib/server/file-management-settings";

export interface AdminFileSettingsSnapshot {
  isDatabaseMode: boolean;
  policy: {
    documentAllowedExtensions: string[];
    documentAllowedExtensionsLabel: string;
    documentMaxFileSizeBytes: number;
    documentMaxFileSizeMb: number;
    requestAllowedExtensions: string[];
    requestAllowedExtensionsLabel: string;
    requestMaxAttachmentCount: number;
    requestMaxAttachmentSizeBytes: number;
    requestMaxAttachmentSizeMb: number;
    requestMaxTotalSizeBytes: number;
    requestMaxTotalSizeMb: number;
  };
  runtime: {
    libreOfficeExecutablePath?: string;
    libreOfficePreviewConfigured: boolean;
    libreOfficeTimeoutMs: number;
    previewCacheRoot: string;
  };
}

export async function getAdminFileSettingsSnapshot(): Promise<AdminFileSettingsSnapshot> {
  const [policy, runtime] = await Promise.all([
    getFileManagementPolicy(),
    Promise.resolve(getLibreOfficeRuntimeInfo()),
  ]);

  return {
    isDatabaseMode: runtimeConfig.authMode === "database",
    policy: {
      documentAllowedExtensions: policy.documentAllowedExtensions,
      documentAllowedExtensionsLabel: formatAllowedExtensionsLabel(policy.documentAllowedExtensions),
      documentMaxFileSizeBytes: policy.documentMaxFileSizeBytes,
      documentMaxFileSizeMb: formatMegabyteValue(policy.documentMaxFileSizeBytes),
      requestAllowedExtensions: policy.requestAllowedExtensions,
      requestAllowedExtensionsLabel: formatAllowedExtensionsLabel(policy.requestAllowedExtensions),
      requestMaxAttachmentCount: policy.requestMaxAttachmentCount,
      requestMaxAttachmentSizeBytes: policy.requestMaxAttachmentSizeBytes,
      requestMaxAttachmentSizeMb: formatMegabyteValue(policy.requestMaxAttachmentSizeBytes),
      requestMaxTotalSizeBytes: policy.requestMaxTotalSizeBytes,
      requestMaxTotalSizeMb: formatMegabyteValue(policy.requestMaxTotalSizeBytes),
    },
    runtime: {
      libreOfficeExecutablePath: runtime.executablePath,
      libreOfficePreviewConfigured: runtime.isConfigured,
      libreOfficeTimeoutMs: runtime.timeoutMs,
      previewCacheRoot: runtime.previewCacheRoot,
    },
  };
}
