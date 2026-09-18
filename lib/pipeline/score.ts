import { SCORING } from "@/lib/config";

export interface ScoreInputs {
  heat: number;
  popularity: number;
  visits: number;
  favorites: number;
}

function logCompress(value: number): number {
  return Math.log1p(Math.max(0, value));
}

export function computeRawScores(worlds: ScoreInputs[]): number[] {
  const w = SCORING.weights;
  return worlds.map(
    (world) =>
      w.heat * logCompress(world.heat) +
      w.popularity * logCompress(world.popularity) +
      w.visits * logCompress(world.visits) +
      w.favorites * logCompress(world.favorites),
  );
}

/** Normalizes raw blended scores to 0-100 for consistent star sizing/brightness. */
export function normalizeScores(rawScores: number[]): number[] {
  if (rawScores.length === 0) return [];
  const min = Math.min(...rawScores);
  const max = Math.max(...rawScores);
  const range = max - min;
  if (range === 0) return rawScores.map(() => 50);
  return rawScores.map((score) => ((score - min) / range) * 100);
}
