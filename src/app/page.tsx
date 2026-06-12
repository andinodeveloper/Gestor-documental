import { redirect } from "next/navigation";

import { getAuthenticatedRedirectPath, getCurrentUser } from "@/lib/server/auth";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  redirect(getAuthenticatedRedirectPath(user));
}
