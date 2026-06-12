import { maskEmail, normalizeDui } from "@/lib/auth/identity";
import { getDefaultPermissionsForRole, mergePermissions, REQUESTS_CREATE_PERMISSION } from "@/lib/auth/permissions";
import { roleLabels } from "@/lib/auth/policy";
import type { AuthAccount, AuthFailureReason, DemoCredential } from "@/lib/auth/types";
import type { UserRecord } from "@/lib/types";

type MockAuthAccount = AuthAccount & {
  directPermissions: string[];
  password: string;
};

const genericRecoveryMessage =
  "Si la identidad existe y tiene un correo registrado, se preparara una contrasena temporal para el siguiente ingreso.";

const mockAccounts: MockAuthAccount[] = [
  {
    id: "usr-admin-ana",
    name: "Ana Pleitez",
    username: "ana.pleitez",
    role: "ADMINISTRATOR",
    status: "ACTIVE",
    permissions: mergePermissions(getDefaultPermissionsForRole("ADMINISTRATOR")),
    directPermissions: [],
    readerGroups: ["DIRECTIVO", "AUDITORIA_CONTROL"],
    access: "Total",
    email: "ana.pleitez@gestordoc.local",
    dui: "01234567-8",
    password: "Admin123!",
    mustChangePassword: false,
  },
  {
    id: "usr-editor-luis",
    name: "Luis Martinez",
    username: "luis.martinez",
    role: "EDITOR",
    status: "ACTIVE",
    permissions: mergePermissions(getDefaultPermissionsForRole("EDITOR")),
    directPermissions: [],
    readerGroups: ["CENTROS_DISTRIBUCION"],
    access: "Operativo + historico asignado",
    email: "luis.martinez@gestordoc.local",
    dui: "02345678-9",
    password: "Editor123!",
    mustChangePassword: false,
  },
  {
    id: "usr-editor-gabriela",
    name: "Gabriela Perez",
    username: "gabriela.perez",
    role: "EDITOR",
    status: "ACTIVE",
    permissions: mergePermissions(getDefaultPermissionsForRole("EDITOR")),
    directPermissions: [],
    readerGroups: ["TIENDAS_SALAS"],
    access: "Operativo",
    email: "gabriela.perez@gestordoc.local",
    dui: "03456789-0",
    password: "Editor123!",
    mustChangePassword: false,
  },
  {
    id: "usr-reader-juan",
    name: "Juan Arias",
    username: "juan.arias",
    role: "READER",
    status: "ACTIVE",
    permissions: mergePermissions(
      getDefaultPermissionsForRole("READER"),
      [REQUESTS_CREATE_PERMISSION],
    ),
    directPermissions: [REQUESTS_CREATE_PERMISSION],
    readerGroups: ["CENTROS_DISTRIBUCION"],
    access: "Lectura controlada + IA + descarga temporal",
    email: "juan.arias@gestordoc.local",
    dui: "04567890-1",
    password: "Lector123!",
    mustChangePassword: true,
  },
  {
    id: "usr-reader-marta",
    name: "Marta Rivera",
    username: "marta.rivera",
    role: "READER",
    status: "ACTIVE",
    permissions: mergePermissions(getDefaultPermissionsForRole("READER")),
    directPermissions: [],
    readerGroups: ["OPERATIVO"],
    access: "Lectura controlada + IA",
    dui: "05678901-2",
    password: "Lector123!",
    mustChangePassword: false,
  },
  {
    id: "usr-reader-rosa",
    name: "Rosa Quintanilla",
    username: "rosa.quintanilla",
    role: "READER",
    status: "INACTIVE",
    permissions: mergePermissions(getDefaultPermissionsForRole("READER")),
    directPermissions: [],
    readerGroups: ["OPERATIVO"],
    access: "Bloqueado por baja",
    dui: "06789012-3",
    password: "Lector123!",
    mustChangePassword: false,
  },
];

const accountsByUsername = new Map(
  mockAccounts.map((account) => [account.username.toLowerCase(), account]),
);
const accountsById = new Map(mockAccounts.map((account) => [account.id, account]));
const accountsByEmail = new Map(
  mockAccounts
    .filter((account) => account.email)
    .map((account) => [account.email!.toLowerCase(), account]),
);
const accountsByDui = new Map(
  mockAccounts
    .filter((account) => account.dui)
    .map((account) => [normalizeDui(account.dui!), account]),
);

export const demoCredentials: DemoCredential[] = [
  {
    label: "Administrador",
    username: "ana.pleitez",
    password: "Admin123!",
    role: "ADMINISTRATOR",
  },
  {
    label: "Editor",
    username: "luis.martinez",
    password: "Editor123!",
    role: "EDITOR",
  },
  {
    label: "Lector",
    username: "juan.arias",
    password: "Lector123!",
    role: "READER",
  },
];

export const mockUserRecords: UserRecord[] = mockAccounts.map((account) => ({
  id: account.id,
  name: account.name,
  username: account.username,
  roleCode: account.role,
  role: roleLabels[account.role],
  readerGroups: account.readerGroups,
  status: account.status === "ACTIVE" ? "Activo" : "Inactivo",
  access: account.access,
  canCreateRequests: account.permissions.includes(REQUESTS_CREATE_PERMISSION),
}));

export function listMockAccountsByRole(role: MockAuthAccount["role"]) {
  return mockAccounts
    .filter((account) => account.role === role && account.status === "ACTIVE")
    .map((account) => toAuthAccount(account));
}

export function listMockAccountsByRoleAndPermission(
  role: MockAuthAccount["role"],
  permissionCode: string,
) {
  return mockAccounts
    .filter(
      (account) =>
        account.role === role &&
        account.status === "ACTIVE" &&
        account.permissions.includes(permissionCode),
    )
    .map((account) => toAuthAccount(account));
}

export function findMockAccountById(id: string) {
  const account = accountsById.get(id) ?? null;
  return account ? toAuthAccount(account) : null;
}

export async function authenticateLocalUser(credential: string, password: string) {
  const account = await findStoredAccountByCredential(credential);

  if (!account || account.password !== password) {
    return { reason: "INVALID_CREDENTIALS" as AuthFailureReason };
  }

  if (account.status !== "ACTIVE") {
    return { reason: "INACTIVE_ACCOUNT" as AuthFailureReason };
  }

  return { account: toAuthAccount(account) };
}

export async function findAccountByUsername(username: string) {
  const account = accountsByUsername.get(username.trim().toLowerCase()) ?? null;
  return account ? toAuthAccount(account) : null;
}

export async function findAccountByCredential(credential: string) {
  const account = await findStoredAccountByCredential(credential);
  return account ? toAuthAccount(account) : null;
}

async function findStoredAccountByCredential(credential: string) {
  const normalized = credential.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  return (
    accountsByUsername.get(normalized) ??
    accountsByEmail.get(normalized) ??
    accountsByDui.get(normalizeDui(normalized)) ??
    null
  );
}

export async function beginPasswordRecovery(credential: string) {
  const account = await findAccountByCredential(credential);

  if (!account) {
    return { message: genericRecoveryMessage };
  }

  if (!account.email) {
    return {
      message:
        "La cuenta no tiene correo registrado. En la integracion real este caso se derivara a restablecimiento manual por un administrador.",
    };
  }

  return {
    message: `Se dejo listo el restablecimiento para ${maskEmail(account.email)}. En la integracion real se emitira una contrasena temporal.`,
  };
}

export async function updateMockAccountPassword(input: {
  mustChangePassword: boolean;
  password: string;
  userId: string;
}) {
  const account = accountsById.get(input.userId);

  if (!account) {
    throw new Error("No fue posible encontrar la cuenta local a actualizar.");
  }

  account.password = input.password;
  account.mustChangePassword = input.mustChangePassword;

  const matchingDemoAccount = demoCredentials.find(
    (credential) => credential.username === account.username,
  );

  if (matchingDemoAccount) {
    matchingDemoAccount.password = input.password;
  }
}

function toAuthAccount(account: MockAuthAccount): AuthAccount {
  const { directPermissions, password, ...accountWithoutPassword } = account;
  void directPermissions;
  void password;
  return accountWithoutPassword;
}
