'use client';

import { useEffect, useMemo, useRef, useState } from "react";

import { workflowStatusLabels } from "@/lib/presenters";
import type { RequestBoardFilters, WorkflowStatus } from "@/lib/types";

const requestStatusOptions: WorkflowStatus[] = [
  "PENDING_ASSIGNMENT",
  "ASSIGNED",
  "IN_PROGRESS",
  "IN_REVIEW",
  "OBSERVED",
  "APPROVED",
  "OFFICIALIZED",
  "CLOSED",
  "CANCELLED",
];

const REQUEST_FILTERS_PINNED_STORAGE_KEY = "gestor-documental.requests-filters-pinned";
const HOVER_EXPAND_DELAY_MS = 400;

export function RequestFiltersPanel({
  documentTypeOptions,
  filters,
  isReaderView,
  processOptions,
  requesterOptions,
}: {
  documentTypeOptions: Array<{ id: string; label: string }>;
  filters: RequestBoardFilters;
  isReaderView: boolean;
  processOptions: Array<{ id: string; label: string }>;
  requesterOptions: Array<{ id: string; name: string; username: string }>;
}) {
  const [isPinned, setIsPinned] = useState(() => readPinnedFiltersPreference());
  const [isExpanded, setIsExpanded] = useState(() => readPinnedFiltersPreference());
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);
  const hoverExpandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function togglePinned() {
    if (hoverExpandTimerRef.current) {
      clearTimeout(hoverExpandTimerRef.current);
      hoverExpandTimerRef.current = null;
    }

    const nextValue = !isPinned;
    setIsPinned(nextValue);
    setIsExpanded(nextValue);
    window.localStorage.setItem(REQUEST_FILTERS_PINNED_STORAGE_KEY, String(nextValue));
  }

  function scheduleExpand() {
    if (isPinned || isExpanded) {
      return;
    }

    if (hoverExpandTimerRef.current) {
      clearTimeout(hoverExpandTimerRef.current);
    }

    hoverExpandTimerRef.current = setTimeout(() => {
      setIsExpanded(true);
      hoverExpandTimerRef.current = null;
    }, HOVER_EXPAND_DELAY_MS);
  }

  function cancelScheduledExpand() {
    if (hoverExpandTimerRef.current) {
      clearTimeout(hoverExpandTimerRef.current);
      hoverExpandTimerRef.current = null;
    }
  }

  function collapseIfUnpinned() {
    cancelScheduledExpand();

    if (!isPinned) {
      setIsExpanded(false);
    }
  }

  useEffect(
    () => () => {
      if (hoverExpandTimerRef.current) {
        clearTimeout(hoverExpandTimerRef.current);
      }
    },
    [],
  );

  return (
    <article
      className={`surface-card relative overflow-hidden transition-all duration-200 ease-out ${
        isPinned ? "shadow-[0_18px_38px_rgba(15,61,75,0.08)]" : ""
      }`}
      onMouseLeave={collapseIfUnpinned}
    >
      <div
        onMouseEnter={scheduleExpand}
        onMouseLeave={cancelScheduledExpand}
        className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-start md:justify-between"
      >
        <div className="rounded-2xl xl:max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <p className="section-label">Filtros del tablero</p>
            <span className="meta-pill">
              {activeFilterCount === 0
                ? "Sin filtros activos"
                : `${String(activeFilterCount).padStart(2, "0")} filtros activos`}
            </span>
          </div>
          <h2 className="panel-title mt-2">
            {isReaderView ? "Seguimiento de mis solicitudes" : "Lectura operativa de solicitudes"}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate">
            {isReaderView
              ? "Manten el cursor un instante sobre el encabezado, toca el panel o anclalo para usar los filtros solo cuando los necesites."
              : "Mantiene despejada la vista operativa y despliega los filtros bajo demanda cuando dejas el cursor un instante sobre el encabezado."}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start xl:pr-14">
          <button
            type="button"
            onClick={() => setIsExpanded((currentValue) => !currentValue)}
            className="button-secondary xl:hidden"
            aria-expanded={isExpanded}
            aria-controls="requests-filters-panel"
          >
            {isExpanded ? "Ocultar filtros" : "Mostrar filtros"}
          </button>
          <a
            href="/requests"
            className={
              activeFilterCount > 0
                ? "inline-flex items-center justify-center rounded-full border border-red bg-red-soft px-4 py-2.5 text-sm font-semibold text-red hover:bg-red-soft/80"
                : "button-secondary"
            }
          >
            Limpiar filtros
          </a>
        </div>
      </div>

      <button
        type="button"
        onClick={togglePinned}
        className={`absolute right-5 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-200 ${
          isPinned
            ? "border-accent bg-accent text-white shadow-[0_8px_18px_rgba(18,77,93,0.18)]"
            : "border-line bg-white text-slate hover:border-line-strong hover:bg-panel-muted/70 xl:opacity-70"
        }`}
        aria-label={isPinned ? "Desanclar filtros" : "Anclar filtros"}
        title={isPinned ? "Desanclar filtros" : "Anclar filtros"}
      >
        <PinIcon pinned={isPinned} />
      </button>

      <div
        id="requests-filters-panel"
        className={`border-t border-line transition-[max-height,opacity,padding] duration-200 ease-out ${
          isExpanded ? "max-h-[960px] opacity-100" : "max-h-0 overflow-hidden opacity-0"
        }`}
      >
        <form
          action="/requests"
          className={`grid gap-4 px-5 pb-5 pt-5 ${isReaderView ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-4"}`}
        >
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-foreground">Estado</span>
            <select name="status" className="field-input" defaultValue={filters.status || ""}>
              <option value="">Todos</option>
              {requestStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {workflowStatusLabels[status]}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-foreground">Prioridad</span>
            <select name="priority" className="field-input" defaultValue={filters.priority || ""}>
              <option value="">Todas</option>
              <option value="Alta">Alta</option>
              <option value="Media">Media</option>
              <option value="Baja">Baja</option>
            </select>
          </label>

          {!isReaderView ? (
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-foreground">Solicitante</span>
              <select
                name="requesterUserId"
                className="field-input"
                defaultValue={filters.requesterUserId || ""}
              >
                <option value="">Todos</option>
                {requesterOptions.map((requester) => (
                  <option key={requester.id} value={requester.id}>
                    {requester.name} - {requester.username}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-foreground">Proceso</span>
            <select name="processId" className="field-input" defaultValue={filters.processId || ""}>
              <option value="">Todos</option>
              {processOptions.map((process) => (
                <option key={process.id} value={process.id}>
                  {process.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-foreground">Tipo documental</span>
            <select
              name="documentTypeId"
              className="field-input"
              defaultValue={filters.documentTypeId || ""}
            >
              <option value="">Todos</option>
              {documentTypeOptions.map((documentType) => (
                <option key={documentType.id} value={documentType.id}>
                  {documentType.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-foreground">Creada desde</span>
            <input
              name="createdFrom"
              type="date"
              className="field-input"
              defaultValue={filters.createdFrom || ""}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-foreground">Creada hasta</span>
            <input
              name="createdTo"
              type="date"
              className="field-input"
              defaultValue={filters.createdTo || ""}
            />
          </label>

          <div className="flex items-end">
            <button type="submit" className="button-primary w-full">
              Aplicar filtros
            </button>
          </div>
        </form>
      </div>
    </article>
  );
}

function readPinnedFiltersPreference() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(REQUEST_FILTERS_PINNED_STORAGE_KEY) === "true";
}

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

function countActiveFilters(filters: RequestBoardFilters) {
  return [
    filters.createdFrom,
    filters.createdTo,
    filters.documentTypeId,
    filters.priority,
    filters.processId,
    filters.requesterUserId,
    filters.status,
  ].filter(Boolean).length;
}
