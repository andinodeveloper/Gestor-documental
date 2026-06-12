"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminTabs = [
  {
    href: "/admin/users",
    label: "Usuarios",
  },
  {
    href: "/admin/groups",
    label: "Grupos y permisos",
  },
  {
    href: "/admin/roles",
    label: "Roles y permisos",
  },
  {
    href: "/admin/permissions",
    label: "Permisos",
  },
] as const;

export function AdminSectionTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2">
      {adminTabs.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={isActive ? "button-primary" : "button-secondary"}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
