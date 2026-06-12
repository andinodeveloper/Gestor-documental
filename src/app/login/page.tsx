import { demoCredentials } from "@/lib/auth/mock-accounts";
import { LoginPanel } from "@/components/login-panel";
import { redirectIfAuthenticated } from "@/lib/server/auth";

export default async function LoginPage() {
  await redirectIfAuthenticated();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[760px] items-center justify-center px-4 py-6 md:px-6 xl:px-8">
      <LoginPanel demoAccounts={demoCredentials} />
    </div>
  );
}
