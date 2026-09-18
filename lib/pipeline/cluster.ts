import { kmeans } from "ml-kmeans";
import { EMBEDDING } from "@/lib/config";

export interface ClusterResult {
  clusterIds: number[];
  numClusters: number;
}

/** k-means over the same tag feature space used for reduce.ts, per PRD §8. */
export function clusterFeatures(features: number[][]): ClusterResult {
  const n = features.length;
  if (n === 0) return { clusterIds: [], numClusters: 0 };

  const k = Math.max(1, Math.min(EMBEDDING.numClusters, n));
  if (k === 1) {
    return { clusterIds: features.map(() => 0), numClusters: 1 };
  }

  const result = kmeans(features, k, { seed: 42 });
  return { clusterIds: result.clusters, numClusters: k };
}

/**
 * Labels each cluster with the tag that is most *over-represented* there
 * relative to its frequency across the whole corpus (a simple lift score),
 * rather than just the most common tag in the cluster (which would tend to
 * pick the same globally-popular tag for every cluster).
 */
export function deriveClusterLabels(
  tagLists: string[][],
  clusterIds: number[],
  numClusters: number,
): string[] {
  const globalCounts = new Map<string, number>();
  for (const tags of tagLists) {
    for (const tag of tags) globalCounts.set(tag, (globalCounts.get(tag) ?? 0) + 1);
  }
  const total = tagLists.length || 1;

  const labels: string[] = [];
  for (let c = 0; c < numClusters; c++) {
    const memberTagLists = tagLists.filter((_, i) => clusterIds[i] === c);
    const clusterSize = memberTagLists.length || 1;

    const clusterCounts = new Map<string, number>();
    for (const tags of memberTagLists) {
      for (const tag of tags) clusterCounts.set(tag, (clusterCounts.get(tag) ?? 0) + 1);
    }

    let bestTag = "misc";
    let bestLift = -Infinity;
    for (const [tag, count] of clusterCounts) {
      if (count < 2) continue; // ignore one-off noise tags
      const inClusterRatio = count / clusterSize;
      const globalRatio = (globalCounts.get(tag) ?? 1) / total;
      const lift = inClusterRatio / globalRatio;
      if (lift > bestLift) {
        bestLift = lift;
        bestTag = tag;
      }
    }
    labels.push(bestTag.replace(/^author_tag_/, "").replace(/^system_/, ""));
  }
  return labels;
}

function hslToHex(h: number, s: number, l: number): string {
  const sFrac = s / 100;
  const lFrac = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sFrac * Math.min(lFrac, 1 - lFrac);
  const f = (n: number) => lFrac - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) =>
    Math.round(255 * x)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

/** Evenly-spaced hue wheel by cluster id, so each genre reads as a distinct color. */
export function clusterColorHex(clusterId: number, numClusters: number): string {
  const hue = (360 * clusterId) / Math.max(numClusters, 1);
  return hslToHex(hue, 65, 55);
}
