import type { ReactNode } from "react";

type ChipTone = "accent" | "amber" | "green" | "red" | "slate";

const chipToneClasses: Record<ChipTone, string> = {
  accent: "bg-accent-soft/90 text-accent border-accent/12",
  amber: "bg-amber-soft text-amber border-amber/12",
  green: "bg-green-soft text-green border-green/12",
  red: "bg-red-soft text-red border-red/12",
  slate: "bg-slate/8 text-slate border-slate/12",
};

export function StatusChip({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: ChipTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1.5 text-[10px] font-semibold tracking-[0.16em] uppercase ${chipToneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

export function workflowTone(status: string): ChipTone {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus.includes("aprob")) return "green";
  if (normalizedStatus.includes("rech") || normalizedStatus.includes("observ")) return "red";
  if (normalizedStatus.includes("oficial")) return "accent";
  if (normalizedStatus.includes("asign") || normalizedStatus.includes("progreso")) {
    return "amber";
  }

  return "slate";
}

export function visibilityTone(label: string): ChipTone {
  const normalizedLabel = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalizedLabel.includes("confidencial")) return "red";
  if (normalizedLabel.includes("historico")) return "amber";
  if (normalizedLabel.includes("restringido")) return "accent";

  return "green";
}
