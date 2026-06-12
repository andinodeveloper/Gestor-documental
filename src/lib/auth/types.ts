export const APP_ROLES = ["ADMINISTRATOR", "EDITOR", "READER"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const ACCOUNT_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];
export type AuthFailureReason = "INVALID_CREDENTIALS" | "INACTIVE_ACCOUNT";
export type AppPermissionCode = string;

export interface SessionUser {
  id: string;
  name: string;
  username: string;
  role: AppRole;
  permissions: AppPermissionCode[];
  readerGroups: string[];
  access: string;
  email?: string;
  dui?: string;
  mustChangePassword: boolean;
}

export interface AuthAccount extends SessionUser {
  status: AccountStatus;
}

export interface DemoCredential {
  label: string;
  username: string;
  password: string;
  role: AppRole;
}
