import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getNavigationForUser } from "@/lib/auth/policy";
import { AppShell } from "@/components/app-shell";
import { PASSWORD_CHANGE_PATH, requireCurrentUser } from "@/lib/server/auth";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const user = await requireCurrentUser();

  if (user.mustChangePassword) {
    redirect(PASSWORD_CHANGE_PATH);
  }

  const items = getNavigationForUser(user);

  return <AppShell items={items} user={user}>{children}</AppShell>;
}
