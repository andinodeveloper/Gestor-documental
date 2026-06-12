import type { SessionUser } from "@/lib/auth/types";
import type { DocumentRecord } from "@/lib/types";

const readerVisibleStates = new Set(["OFFICIAL", "ARCHIVED", "OBSOLETE"]);

export function canUserReadDocument(user: SessionUser, document: DocumentRecord) {
  if (user.role !== "READER") {
    return true;
  }

  if (!readerVisibleStates.has(document.state)) {
    return false;
  }

  if (document.allowedUsernames?.includes(user.username)) {
    return true;
  }

  switch (document.visibility) {
    case "PUBLIC_INTERNAL":
      return true;
    case "RESTRICTED_BY_GROUP":
    case "ARCHIVED_RESTRICTED":
      return hasGroupAccess(user, document.allowedReaderGroups);
    case "RESTRICTED_BY_ROLE":
    case "CONFIDENTIAL":
      return (
        hasRoleAccess(user, document.allowedRoles) ||
        hasGroupAccess(user, document.allowedReaderGroups)
      );
    case "RESTRICTED_BY_USER":
      return false;
    default:
      return false;
  }
}

export function canUserQueryDocumentWithAi(user: SessionUser, document: DocumentRecord) {
  return document.state === "OFFICIAL" && document.aiEnabled === true && canUserReadDocument(user, document);
}

function hasRoleAccess(user: SessionUser, allowedRoles?: string[]) {
  return Boolean(allowedRoles?.includes(user.role));
}

function hasGroupAccess(user: SessionUser, allowedGroups?: string[]) {
  return Boolean(
    allowedGroups?.some((groupCode) => user.readerGroups.includes(groupCode)),
  );
}
