"use client";

import { startTransition, useState } from "react";

import { StatusChip } from "@/components/status-chip";
import type { AiResponsePreset } from "@/lib/types";

export function AiSearchWorkspace({ presets }: { presets: AiResponsePreset[] }) {
  const [question, setQuestion] = useState(presets[0]?.prompt ?? "");
  const [selectedId, setSelectedId] = useState(presets[0]?.id ?? "");
  const [loading, setLoading] = useState(false);

  const activePreset =
    presets.find((preset) => preset.id === selectedId) ??
    presets.find((preset) => preset.prompt === question) ??
    presets[0];

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    startTransition(() => {
      const nextPreset =
        presets.find((preset) =>
          question.toLowerCase().includes(preset.id.toLowerCase()),
        ) ?? presets.find((preset) => preset.prompt === question) ?? presets[0];

      setTimeout(() => {
        setSelectedId(nextPreset.id);
        setLoading(false);
      }, 480);
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_340px]">
      <section className="surface-card p-6">
        <div className="mb-5 space-y-2">
          <p className="section-label">Consulta inteligente</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={4}
            className="w-full rounded-[20px] border border-line bg-white/80 px-4 py-4 text-sm leading-7 outline-none focus:border-accent focus:shadow-[0_0_0_4px_rgba(18,77,93,0.08)]"
          />
          <div className="flex flex-wrap gap-3">
            <button type="submit" className="button-primary">
              {loading ? "Consultando..." : "Ejecutar"}
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                setQuestion(presets[1]?.prompt ?? "");
                setSelectedId(presets[1]?.id ?? "");
              }}
            >
              Alterna
            </button>
          </div>
        </form>

        <div className="mt-6 rounded-[22px] border border-line bg-accent/4 p-5">
          <div className="mb-3 flex flex-wrap gap-2">
            <StatusChip tone="accent">Filtrado por permisos</StatusChip>
            <StatusChip tone="green">Fuentes obligatorias</StatusChip>
          </div>
          <p className="text-sm leading-7 text-foreground">{activePreset.answer}</p>
        </div>

        <div className="mt-5 space-y-3">
          {activePreset.citations.map((citation) => (
            <article
              key={`${citation.code}-${citation.section}`}
              className="rounded-[20px] border border-line bg-white/80 px-5 py-4"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <StatusChip tone="slate">{citation.code}</StatusChip>
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate">
                  {citation.section}
                </span>
              </div>
              <h3 className="font-semibold tracking-[-0.02em] text-foreground">
                {citation.title}
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate">{citation.snippet}</p>
            </article>
          ))}
        </div>
      </section>

      <aside className="space-y-5">
        <section className="surface-card-compact p-5">
          <p className="section-label">Consultas rapidas</p>
          <div className="mt-4 space-y-3">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setQuestion(preset.prompt);
                  setSelectedId(preset.id);
                }}
                className="w-full rounded-[18px] border border-line bg-white/80 px-4 py-3 text-left text-sm leading-6 text-foreground hover:border-line-strong hover:bg-white/90"
              >
                {preset.prompt}
              </button>
            ))}
          </div>
        </section>

        <section className="surface-card-compact p-5">
          <p className="section-label">Gobernanza IA</p>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate">
            <li>Solo indexa versiones oficializadas.</li>
            <li>Permisos y denegaciones se evalúan en consulta.</li>
            <li>Las fuentes se auditan junto con la respuesta.</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
