"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import type { WorldSummaryDTO } from "@/lib/types";
import { DataAsOfBadge } from "./DataAsOfBadge";
import { FilterPanel } from "./FilterPanel";
import { WorldDetailPanel } from "./WorldDetailPanel";
import { useStarfieldStore, worldMatchesFilters } from "./store";

// Three.js touches window/WebGL — must never attempt to render during SSR.
const StarfieldCanvas = dynamic(
  () => import("./StarfieldCanvas").then((mod) => mod.StarfieldCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center text-zinc-400">
        Loading starfield…
      </div>
    ),
  },
);

function isTypingInField(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.getAttribute("contenteditable") === "true";
}

export function StarfieldApp({
  worlds,
  dataAsOf,
}: {
  worlds: WorldSummaryDTO[];
  dataAsOf: string | null;
}) {
  const filters = useStarfieldStore((s) => s.filters);
  const selectedWorldId = useStarfieldStore((s) => s.selectedWorldId);
  const setSelectedWorldId = useStarfieldStore((s) => s.setSelectedWorldId);

  const visibleIds = useMemo(
    () => worlds.filter((w) => worldMatchesFilters(w, filters)).map((w) => w.id),
    [worlds, filters],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (isTypingInField()) return;
      if (visibleIds.length === 0) return;

      e.preventDefault();
      const currentIndex = selectedWorldId ? visibleIds.indexOf(selectedWorldId) : -1;
      if (currentIndex === -1) {
        setSelectedWorldId(visibleIds[0]);
        return;
      }
      const delta = e.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (currentIndex + delta + visibleIds.length) % visibleIds.length;
      setSelectedWorldId(visibleIds[nextIndex]);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visibleIds, selectedWorldId, setSelectedWorldId]);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#05070f] text-zinc-100">
      <StarfieldCanvas worlds={worlds} />
      <FilterPanel worlds={worlds} />
      <WorldDetailPanel />
      <DataAsOfBadge dataAsOf={dataAsOf} worldCount={worlds.length} />
    </div>
  );
}
