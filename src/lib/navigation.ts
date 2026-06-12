import type { AppRole } from "@/lib/auth/types";
import type { NavigationItem } from "@/lib/types";

const allRoles = ["ADMINISTRATOR", "EDITOR", "READER"] satisfies AppRole[];
const editorialRoles = ["ADMINISTRATOR", "EDITOR"] satisfies AppRole[];
const administratorOnlyRoles = ["ADMINISTRATOR"] satisfies AppRole[];

export const navigationItems: NavigationItem[] = [
  {
    key: "dashboard",
    href: "/dashboard",
    label: "Dashboard",
    hint: "Gobierno y pendientes",
    allowedRoles: editorialRoles,
  },
  {
    key: "requests",
    href: "/requests",
    label: "Solicitudes",
    hint: "Ingreso y seguimiento",
    allowedRoles: allRoles,
  },
  {
    key: "documents",
    href: "/documents",
    label: "Documentos",
    hint: "Versiones y relaciones",
    allowedRoles: editorialRoles,
  },
  {
    key: "reviews",
    href: "/reviews",
    label: "Revisión",
    hint: "Rondas y comentarios",
    allowedRoles: editorialRoles,
  },
  {
    key: "explorer",
    href: "/explorer",
    label: "Explorador",
    hint: "Lectura controlada",
    allowedRoles: allRoles,
  },
  {
    key: "ai",
    href: "/ai/search",
    label: "IA",
    hint: "Consulta con fuentes",
    allowedRoles: allRoles,
  },
  {
    key: "admin",
    href: "/admin/users",
    label: "Administración",
    hint: "Usuarios y permisos",
    allowedRoles: administratorOnlyRoles,
  },
];
