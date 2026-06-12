"use client";

import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { SessionUser } from "@/lib/auth/types";
import { NavSidebar } from "@/components/nav-sidebar";
import { Topbar } from "@/components/topbar";
import type { NavigationItem } from "@/lib/types";

const SIDEBAR_PINNED_STORAGE_KEY = "gestor-documental.sidebar-pinned";
const SIDEBAR_PINNED_EVENT = "gestor-documental:sidebar-pinned-change";

const routeTitles: Record<string, string> = {
  "/dashboard": "Operacion documental",
  "/requests": "Solicitudes",
  "/documents": "Documentos",
  "/reviews": "Revision y aprobacion",
  "/explorer": "Explorador",
  "/ai/search": "Consulta IA",
};

export function AppShell({
  children,
  items,
  user,
}: {
  children: ReactNode;
  items: NavigationItem[];
  user: SessionUser;
}) {
  const pathname = usePathname();
  const currentTitle = pathname.startsWith("/admin")
    ? "Administracion"
    : routeTitles[pathname] ?? "Gestor Documental";
  const sidebarPinned = useSyncExternalStore(
    subscribeToSidebarPinnedPreference,
    getSidebarPinnedPreference,
    getServerSidebarPinnedPreference,
  );

  const workspacePaddingClass = sidebarPinned ? "xl:pl-[272px]" : "xl:pl-[104px]";

  return (
    <div
      className={`relative mx-auto w-full max-w-[1640px] px-4 py-4 md:px-6 xl:px-8 ${workspacePaddingClass}`}
    >
      <NavSidebar
        items={items}
        pathname={pathname}
        pinned={sidebarPinned}
        onTogglePinned={() => writeSidebarPinnedPreference(!sidebarPinned)}
      />

      <div className="min-w-0">
        <div className="mb-4 flex gap-2 overflow-auto pb-1 xl:hidden">
          {items.map((item) => {
            const active = pathname.startsWith(item.href);

            return (
              <Link
                key={item.key}
                href={item.href}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${
                  active
                    ? "bg-accent text-white"
                    : "border border-line bg-white/86 text-slate"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <Topbar
          currentUser={user}
          title={currentTitle}
        />

        <main className="space-y-6 pb-10">{children}</main>
      </div>
    </div>
  );
}

function subscribeToSidebarPinnedPreference(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleChange = () => callback();

  window.addEventListener("storage", handleChange);
  window.addEventListener(SIDEBAR_PINNED_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(SIDEBAR_PINNED_EVENT, handleChange);
  };
}

function getSidebarPinnedPreference() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(SIDEBAR_PINNED_STORAGE_KEY) === "true";
}

function getServerSidebarPinnedPreference() {
  return false;
}

function writeSidebarPinnedPreference(nextValue: boolean) {
  window.localStorage.setItem(SIDEBAR_PINNED_STORAGE_KEY, String(nextValue));
  window.dispatchEvent(new Event(SIDEBAR_PINNED_EVENT));
}
