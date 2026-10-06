"use client";

import { useMemo } from "react";
import type { WorldSummaryDTO } from "@/lib/types";
import { LcarsLegend } from "@/components/lcars";

export function GalaxyLegend({ worlds }: { worlds: WorldSummaryDTO[] }) {
  const entries = useMemo(() => {
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

  return entries.length > 0 ? <LcarsLegend entries={entries} /> : null;
}
