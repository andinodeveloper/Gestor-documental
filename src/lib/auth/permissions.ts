import type { AppPermissionCode, AppRole, SessionUser } from "@/lib/auth/types";

export const REQUESTS_CREATE_PERMISSION = "requests.create";
export const CATALOGS_MANAGE_PERMISSION = "catalogs.manage";
export const DOCUMENTS_UPLOAD_DRAFT_PERMISSION = "documents.upload.draft";
export const DOCUMENTS_UPLOAD_OFFICIAL_PERMISSION = "documents.upload.official";
export const DOCUMENTS_SUBMIT_REVIEW_PERMISSION = "documents.submit_review";
export const DOCUMENTS_REVIEW_PERMISSION = "documents.review";
export const DOCUMENTS_APPROVE_PERMISSION = "documents.approve";
export const DOCUMENTS_OFFICIALIZE_PERMISSION = "documents.officialize";
export const DOCUMENTS_DOWNLOAD_PERMISSION = "documents.download";
export const DOCUMENTS_DOWNLOAD_GRANT_PERMISSION = "documents.download.grant";

const rolePermissions: Record<AppRole, AppPermissionCode[]> = {
  ADMINISTRATOR: [
    CATALOGS_MANAGE_PERMISSION,
    REQUESTS_CREATE_PERMISSION,
    DOCUMENTS_UPLOAD_DRAFT_PERMISSION,
    DOCUMENTS_UPLOAD_OFFICIAL_PERMISSION,
    DOCUMENTS_SUBMIT_REVIEW_PERMISSION,
    DOCUMENTS_REVIEW_PERMISSION,
    DOCUMENTS_APPROVE_PERMISSION,
    DOCUMENTS_OFFICIALIZE_PERMISSION,
    DOCUMENTS_DOWNLOAD_PERMISSION,
    DOCUMENTS_DOWNLOAD_GRANT_PERMISSION,
  ],
  EDITOR: [
    CATALOGS_MANAGE_PERMISSION,
    REQUESTS_CREATE_PERMISSION,
    DOCUMENTS_UPLOAD_DRAFT_PERMISSION,
    DOCUMENTS_UPLOAD_OFFICIAL_PERMISSION,
    DOCUMENTS_SUBMIT_REVIEW_PERMISSION,
    DOCUMENTS_REVIEW_PERMISSION,
    DOCUMENTS_APPROVE_PERMISSION,
    DOCUMENTS_OFFICIALIZE_PERMISSION,
    DOCUMENTS_DOWNLOAD_PERMISSION,
    DOCUMENTS_DOWNLOAD_GRANT_PERMISSION,
  ],
  READER: [],
};

export function getDefaultPermissionsForRole(role: AppRole) {
  return rolePermissions[role] ?? [];
}

export function mergePermissions(...permissionSets: Array<ReadonlyArray<AppPermissionCode>>) {
  return [...new Set(permissionSets.flat().filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );
}

export function hasPermission(user: Pick<SessionUser, "permissions">, permissionCode: AppPermissionCode) {
  return user.permissions.includes(permissionCode);
}

export function canCreateDocumentRequests(user: Pick<SessionUser, "permissions">) {
  return hasPermission(user, REQUESTS_CREATE_PERMISSION);
}

export function canManageCatalogs(user: Pick<SessionUser, "permissions">) {
  return hasPermission(user, CATALOGS_MANAGE_PERMISSION);
}

export function canUploadDraftDocuments(user: Pick<SessionUser, "permissions">) {
  return hasPermission(user, DOCUMENTS_UPLOAD_DRAFT_PERMISSION);
}

export function canUploadOfficialDocuments(user: Pick<SessionUser, "permissions">) {
  return hasPermission(user, DOCUMENTS_UPLOAD_OFFICIAL_PERMISSION);
}

export function canSubmitDocumentReviews(user: Pick<SessionUser, "permissions">) {
  return hasPermission(user, DOCUMENTS_SUBMIT_REVIEW_PERMISSION);
}

export function canReviewDocuments(user: Pick<SessionUser, "permissions">) {
  return hasPermission(user, DOCUMENTS_REVIEW_PERMISSION);
}

export function canApproveDocuments(user: Pick<SessionUser, "permissions">) {
  return hasPermission(user, DOCUMENTS_APPROVE_PERMISSION);
}

export function canOfficializeDocuments(user: Pick<SessionUser, "permissions">) {
  return hasPermission(user, DOCUMENTS_OFFICIALIZE_PERMISSION);
}

export function canDownloadDocuments(user: Pick<SessionUser, "permissions">) {
  return hasPermission(user, DOCUMENTS_DOWNLOAD_PERMISSION);
}

export function canGrantDocumentDownloads(user: Pick<SessionUser, "permissions">) {
  return hasPermission(user, DOCUMENTS_DOWNLOAD_GRANT_PERMISSION);
}
