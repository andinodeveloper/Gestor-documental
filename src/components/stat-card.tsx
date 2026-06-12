import { StatusChip } from "@/components/status-chip";
import type { MetricCard } from "@/lib/types";

export function StatCard({ metric }: { metric: MetricCard }) {
  return (
    <article className="surface-card-compact p-5">
      <div className="mb-6 flex items-start justify-between gap-4">
        <p className="max-w-40 text-sm leading-6 text-slate">{metric.label}</p>
        <StatusChip tone={metric.tone}>{metric.detail}</StatusChip>
      </div>
      <div className="flex items-end justify-between gap-5">
        <strong className="text-[2.8rem] font-semibold tracking-[-0.08em] text-foreground">
          {metric.value}
        </strong>
      </div>
    </article>
  );
}
