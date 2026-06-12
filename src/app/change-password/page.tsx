import { redirect } from "next/navigation";

import { PasswordChangePanel } from "@/components/password-change-panel";
import { getDefaultRouteForRole } from "@/lib/auth/policy";
import { requireCurrentUser } from "@/lib/server/auth";

export default async function ChangePasswordPage() {
  const user = await requireCurrentUser();

  if (!user.mustChangePassword) {
    redirect(getDefaultRouteForRole(user.role));
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[760px] items-center justify-center px-4 py-6 md:px-6 xl:px-8">
      <PasswordChangePanel name={user.name} username={user.username} />
    </div>
  );
}
