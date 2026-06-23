import { canDownloadDocuments } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/types";

export function canDownloadDocumentFile(user: Pick<SessionUser, "permissions">) {
  return canDownloadDocuments(user);
}

export function canPreviewDocumentFile(
  user: Pick<SessionUser, "role">,
  fileRole: string,
) {
  if (fileRole === "OFFICIAL") {
    return true;
  }

  return user.role === "ADMINISTRATOR" || user.role === "EDITOR";
}

export function canAccessRequestAttachment(
  user: Pick<SessionUser, "id" | "permissions" | "role">,
  requesterUserId: string | null | undefined,
) {
  return (
    user.role === "ADMINISTRATOR" ||
    user.role === "EDITOR" ||
    requesterUserId === user.id
  );
}

export function canDownloadRequestAttachment(
  user: Pick<SessionUser, "id" | "permissions" | "role">,
  requesterUserId: string | null | undefined,
) {
  return canAccessRequestAttachment(user, requesterUserId) || canDownloadDocuments(user);
}
