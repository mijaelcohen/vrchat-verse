import { prisma } from "@/lib/db";
import { buildFeatureMatrix } from "./features";
import { buildVocabulary } from "./vocabulary";
import { reduceTo3D } from "./reduce";
import { clusterColorHex, clusterFeatures, deriveClusterLabels } from "./cluster";
import { computeRawScores, normalizeScores } from "./score";

/**
 * Recomputes embedding position, cluster, and popularity score over the FULL
 * `worlds` table (not just the freshly-fetched subset), so clusters stay
 * globally consistent as the corpus grows across daily runs.
 */
export async function recomputeEmbeddingsAndScores(): Promise<{ worldCount: number }> {
  const worlds = await prisma.world.findMany({
    select: { id: true, tags: true, heat: true, popularity: true, visits: true, favorites: true },
  });

  if (worlds.length === 0) return { worldCount: 0 };

  const tagLists = worlds.map((w) => w.tags);
  const vocabulary = buildVocabulary(tagLists);
  const features = buildFeatureMatrix(tagLists, vocabulary);

  const positions = reduceTo3D(features);
  const { clusterIds, numClusters } = clusterFeatures(features);
  const clusterLabels = deriveClusterLabels(tagLists, clusterIds, numClusters);

  const rawScores = computeRawScores(worlds);
  const scores = normalizeScores(rawScores);

  const chunkSize = 25;
  for (let i = 0; i < worlds.length; i += chunkSize) {
    const chunk = worlds.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map((world, offset) => {
        const idx = i + offset;
        const clusterId = clusterIds[idx] ?? 0;
        const position = positions[idx] ?? [0, 0, 0];
        return prisma.world.update({
          where: { id: world.id },
          data: {
            posX: position[0],
            posY: position[1],
            posZ: position[2],
            clusterId,
            clusterLabel: clusterLabels[clusterId] ?? "misc",
            colorHex: clusterColorHex(clusterId, numClusters),
            popularityScore: scores[idx] ?? 0,
            lastSyncedAt: new Date(),
          },
        });
      }),
    );
  }

  return { worldCount: worlds.length };
}
