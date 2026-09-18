"use client";

import { useMemo } from "react";
import type { WorldSummaryDTO } from "@/lib/types";
import { LcarsButton, LcarsField, LcarsLegend, LcarsSelect } from "@/components/lcars";
import { useStarfieldStore } from "./store";

export function FilterPanel({ worlds }: { worlds: WorldSummaryDTO[] }) {
  const filters = useStarfieldStore((s) => s.filters);
  const setFilters = useStarfieldStore((s) => s.setFilters);
  const resetFilters = useStarfieldStore((s) => s.resetFilters);

  const topTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const world of worlds) {
      for (const tag of world.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag]) => tag);
  }, [worlds]);

  function toggleTag(tag: string) {
    const has = filters.tags.includes(tag);
    setFilters({ tags: has ? filters.tags.filter((t) => t !== tag) : [...filters.tags, tag] });
  }

  const clusterLegend = useMemo(() => {
    const byCluster = new Map<number, { color: string; label: string; count: number }>();
    for (const world of worlds) {
      if (world.clusterId === null) continue;
      const entry = byCluster.get(world.clusterId);
      if (entry) {
        entry.count += 1;
      } else {
        byCluster.set(world.clusterId, {
          color: world.colorHex ?? "#8888ff",
          label: world.clusterLabel ?? `Cluster ${world.clusterId}`,
          count: 1,
        });
      }
    }
    return [...byCluster.values()].sort((a, b) => b.count - a.count);
  }, [worlds]);

  return (
    <div className="flex flex-col gap-3 pr-1">
      <LcarsField
        type="text"
        aria-label="Search by name"
        placeholder="Search by name…"
        value={filters.search}
        onChange={(e) => setFilters({ search: e.target.value })}
      />

      <label className="flex flex-col gap-1 text-xs uppercase text-lcars-teal">
        Platform
        <LcarsSelect
          value={filters.platform}
          onChange={(e) => setFilters({ platform: e.target.value as typeof filters.platform })}
        >
          <option value="any">Any</option>
          <option value="standalonewindows">PC</option>
          <option value="android">Quest</option>
        </LcarsSelect>
      </label>

      <div>
        <p className="mb-1 text-xs uppercase text-lcars-teal">Tags</p>
        <div className="flex flex-wrap gap-1">
          {topTags.map((tag) => (
            <LcarsButton
              key={tag}
              active={filters.tags.includes(tag)}
              onClick={() => toggleTag(tag)}
              className="px-3 py-1 text-xs"
            >
              {tag}
            </LcarsButton>
          ))}
        </div>
      </div>

      <LcarsButton variant="alert" onClick={resetFilters} className="self-start text-xs">
        Reset filters
      </LcarsButton>

      {clusterLegend.length > 0 && (
        <div>
          <p className="mb-1 text-xs uppercase text-lcars-teal">Color key</p>
          <LcarsLegend entries={clusterLegend} />
        </div>
      )}
    </div>
  );
}
