"use client";

import Link from "next/link";

import { NavIcon } from "@/components/icons";
import type { NavigationItem } from "@/lib/types";

function PinIcon({ pinned }: { pinned: boolean }) {
  return pinned ? (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="m14 2 8 8-2.4 2.4-2.3-.9-3.1 3.1V20l-2 2-4.2-4.2-4.1 4.1-1.4-1.4 4.1-4.1L2 12l2-2h6.4l3.1-3.1-.9-2.3z" />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="m14 2 8 8-2.4 2.4-2.3-.9-3.1 3.1V20l-2 2-4.2-4.2-4.1 4.1-1.4-1.4 4.1-4.1L2 12l2-2h6.4l3.1-3.1-.9-2.3z" />
    </svg>
  );
}

export function NavSidebar({
  items,
  pathname,
  pinned,
  onTogglePinned,
}: {
  items: NavigationItem[];
  pathname: string;
  pinned: boolean;
  onTogglePinned: () => void;
}) {
  return (
    <aside
      className={`group fixed left-4 top-4 z-30 hidden h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[22px] border border-white/78 bg-white/92 p-3 shadow-[0_10px_30px_rgba(15,61,75,0.06)] transition-[width,box-shadow] duration-200 ease-out xl:flex ${
        pinned ? "w-[252px]" : "w-[88px] hover:w-[252px]"
      }`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-1 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-[0.7rem] font-semibold tracking-[0.2em] text-white">
            GD
          </div>
          {pinned ? (
            <div className="min-w-0">
              <h2 className="truncate text-[1rem] font-semibold tracking-[-0.04em] text-foreground">
                Gestor Documental
              </h2>
            </div>
          ) : (
            <div className="min-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <h2 className="truncate text-[1rem] font-semibold tracking-[-0.04em] text-foreground">
                Gestor Documental
              </h2>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onTogglePinned}
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
            pinned
              ? "border-accent bg-accent text-white shadow-[0_8px_18px_rgba(18,77,93,0.18)]"
              : "pointer-events-none opacity-0 border-line bg-white text-slate group-hover:pointer-events-auto group-hover:opacity-100 group-hover:border-line-strong group-hover:bg-panel-muted/70"
          }`}
          aria-label={pinned ? "Desanclar sidebar" : "Anclar sidebar"}
          title={pinned ? "Desanclar sidebar" : "Anclar sidebar"}
        >
          <PinIcon pinned={pinned} />
        </button>
      </div>

      <nav className="mt-3 space-y-1">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);

          return (
            <Link
              key={item.key}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              className={`flex items-center rounded-[18px] py-3 ${
                pinned ? "gap-3 px-3" : "justify-center px-2 group-hover:justify-start group-hover:gap-3 group-hover:px-3"
              } ${
                active
                  ? "bg-accent text-white shadow-[0_14px_30px_rgba(18,77,93,0.16)]"
                  : "text-foreground hover:bg-panel-muted/80"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
                  active ? "bg-white/16 text-white" : "bg-accent/8 text-accent"
                }`}
              >
                <NavIcon name={item.key} className="h-[17px] w-[17px]" />
              </span>
              {pinned ? (
                <span className="min-w-0 text-sm font-semibold tracking-[-0.02em]">
                  {item.label}
                </span>
              ) : (
                <span className="min-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold tracking-[-0.02em] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {pinned ? <div className="mt-auto border-t border-line px-1 pt-4" /> : null}
    </aside>
  );
}
