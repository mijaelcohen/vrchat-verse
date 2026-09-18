"use client";

import { useMemo, useState } from "react";
import type { WorldSummaryDTO } from "@/lib/types";
import { useStarfieldStore } from "./store";

export function FilterPanel({ worlds }: { worlds: WorldSummaryDTO[] }) {
  const filters = useStarfieldStore((s) => s.filters);
  const setFilters = useStarfieldStore((s) => s.setFilters);
  const resetFilters = useStarfieldStore((s) => s.resetFilters);
  const [open, setOpen] = useState(true);

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
    <div className="absolute left-4 top-4 z-10 flex max-h-[calc(100vh-2rem)] w-72 flex-col rounded-lg border border-white/10 bg-black/80 text-zinc-100 backdrop-blur">
      <div className={`flex shrink-0 items-center justify-between p-4 ${open ? "pb-0" : ""}`}>
        <h2 className="text-sm font-semibold">Filters</h2>
        <button className="text-xs text-zinc-400 hover:text-white" onClick={() => setOpen((o) => !o)}>
          {open ? "Hide" : "Show"}
        </button>
      </div>

      {open && (
        <div className="mt-3 flex flex-col gap-3 overflow-y-auto px-4 pb-4">
          <input
            type="text"
            placeholder="Search by name…"
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="rounded border border-white/10 bg-white/5 px-2 py-1 text-sm outline-none focus:border-indigo-400"
          />

          <label className="flex flex-col gap-1 text-xs text-zinc-400">
            Platform
            <select
              value={filters.platform}
              onChange={(e) =>
                setFilters({ platform: e.target.value as typeof filters.platform })
              }
              className="rounded border border-white/10 bg-white/5 px-2 py-1 text-sm text-zinc-100"
            >
              <option value="any">Any</option>
              <option value="standalonewindows">PC</option>
              <option value="android">Quest</option>
            </select>
          </label>

          <div>
            <p className="mb-1 text-xs text-zinc-400">Tags</p>
            <div className="flex max-h-32 flex-wrap gap-1 overflow-y-auto">
              {topTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`rounded px-2 py-0.5 text-xs ${
                    filters.tags.includes(tag) ? "bg-indigo-500 text-white" : "bg-white/10 text-zinc-300"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <button onClick={resetFilters} className="self-start text-xs text-zinc-400 underline hover:text-white">
            Reset filters
          </button>

          {clusterLegend.length > 0 && (
            <div className="border-t border-white/10 pt-3">
              <p className="mb-1 text-xs text-zinc-400">Color key</p>
              <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
                {clusterLegend.map((cluster) => (
                  <div key={cluster.label} className="flex items-center gap-2 text-xs text-zinc-300">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: cluster.color }}
                    />
                    <span className="truncate">{cluster.label}</span>
                    <span className="ml-auto shrink-0 text-zinc-500">{cluster.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
