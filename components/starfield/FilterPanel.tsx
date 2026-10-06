"use client";

import type { WorldSummaryDTO } from "@/lib/types";
import { LcarsButton, LcarsField } from "@/components/lcars";
import { useStarfieldStore } from "./store";

const PLATFORMS = [
  { value: "standalonewindows", label: "PC" },
  { value: "android", label: "Quest" },
] as const;

export function FilterPanel({ worlds }: { worlds: WorldSummaryDTO[] }) {
  const filters = useStarfieldStore((s) => s.filters);
  const setFilters = useStarfieldStore((s) => s.setFilters);
  const resetFilters = useStarfieldStore((s) => s.resetFilters);

  function togglePlatform(value: "standalonewindows" | "android") {
    // Both on = "any"; the last remaining selection can't be switched off.
    const other = value === "android" ? "standalonewindows" : "android";
    setFilters({ platform: filters.platform === "any" ? other : "any" });
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <LcarsField
        type="text"
        aria-label="Search by name"
        placeholder="Search by name…"
        value={filters.search}
        onChange={(e) => setFilters({ search: e.target.value })}
      />

      <div role="group" aria-label="Platform" className="flex w-full overflow-hidden rounded-full border border-lcars-deep">
        {PLATFORMS.map(({ value, label }) => {
          const on = filters.platform === "any" || filters.platform === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={on}
              onClick={() => togglePlatform(value)}
              className={`flex-1 px-3 py-1 text-lcars-sub font-bold uppercase transition-colors ${
                on ? "bg-lcars-teal text-lcars-void" : "bg-transparent text-lcars-teal hover:bg-lcars-deep"
              } ${value === "android" ? "border-l border-lcars-deep" : ""}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <LcarsButton variant="alert" onClick={resetFilters} className="self-start">
        Reset filters
      </LcarsButton>
    </div>
  );
}
