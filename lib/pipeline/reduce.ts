import { UMAP } from "umap-js";

/** Projects tag feature vectors down to 3D for starfield positioning. */
export function reduceTo3D(features: number[][]): Array<[number, number, number]> {
  const n = features.length;
  if (n === 0) return [];

  if (n <= 3) {
    // Too few points for a meaningful UMAP embedding — spread them out deterministically.
    return features.map((_, i) => [i * 5, 0, 0]);
  }

  const nNeighbors = Math.max(2, Math.min(15, n - 1));
  const umap = new UMAP({ nComponents: 3, nNeighbors });
  const embedding = umap.fit(features);
  return embedding.map((point) => [point[0] ?? 0, point[1] ?? 0, point[2] ?? 0]);
}
