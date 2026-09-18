"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import type { WorldSummaryDTO } from "@/lib/types";
import { LcarsButton, LcarsFrame, LcarsStatusPill, useLcarsSound } from "@/components/lcars";
import { playCue } from "@/lib/lcars/audio";
import { FilterPanel } from "./FilterPanel";
import { WorldDetailPanel } from "./WorldDetailPanel";
import { useStarfieldStore, worldMatchesFilters } from "./store";

// Three.js touches window/WebGL — must never attempt to render during SSR.
const StarfieldCanvas = dynamic(
  () => import("./StarfieldCanvas").then((mod) => mod.StarfieldCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center uppercase text-lcars-teal">
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
  const sound = useLcarsSound();
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
      playCue(delta > 0 ? "step-up" : "step-down");
      const nextIndex = (currentIndex + delta + visibleIds.length) % visibleIds.length;
      setSelectedWorldId(visibleIds[nextIndex]);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visibleIds, selectedWorldId, setSelectedWorldId]);

  return (
    <LcarsFrame
      rail={<FilterPanel worlds={worlds} />}
      map={<StarfieldCanvas worlds={worlds} />}
      detail={<WorldDetailPanel worldCount={worlds.length} dataAsOf={dataAsOf} />}
      footer={
        <>
          <LcarsButton variant="deep" onClick={() => sound.setMuted(!sound.muted)} className="text-xs">
            Sound: {sound.muted ? "off" : "on"}
          </LcarsButton>
          <LcarsStatusPill dataAsOf={dataAsOf} worldCount={worlds.length} />
        </>
      }
    />
  );
}
