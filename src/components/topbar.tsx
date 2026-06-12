import { roleLabels } from "@/lib/auth/policy";
import type { SessionUser } from "@/lib/auth/types";
import { LogoutButton } from "@/components/logout-button";

export function Topbar({
  currentUser,
  title,
}: {
  currentUser: SessionUser;
  title: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 rounded-[20px] border border-white/80 bg-white/88 px-4 py-4 shadow-[0_10px_24px_rgba(15,61,75,0.05)] sm:px-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="meta-pill">Módulo</span>
          <span className="rounded-full border border-line bg-panel-muted/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate">
            {roleLabels[currentUser.role]}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="truncate text-[1.05rem] font-semibold tracking-[-0.03em] text-foreground">
            {title}
          </h1>
          <span className="text-xs text-slate">{currentUser.name}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <LogoutButton />
      </div>
    </div>
  );
}
