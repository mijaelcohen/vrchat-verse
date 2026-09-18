import "dotenv/config";
import { prisma } from "@/lib/db";
import { getValidSession } from "@/lib/vrchat/auth";
import { searchWorlds } from "@/lib/vrchat/worlds";
import { upsertRawWorlds } from "@/lib/pipeline/upsert";
import { recomputeEmbeddingsAndScores } from "@/lib/pipeline/finalize";
import { CORPUS } from "@/lib/config";
import type { VRChatWorld } from "@/lib/vrchat/types";

async function fetchCorpus(client: Awaited<ReturnType<typeof getValidSession>>): Promise<Map<string, VRChatWorld>> {
  const byId = new Map<string, VRChatWorld>();

  const heatResults = await searchWorlds(client, { sort: "heat", limit: CORPUS.topByHeat });
  for (const world of heatResults) byId.set(world.id, world);

  const popularityResults = await searchWorlds(client, {
    sort: "popularity",
    limit: CORPUS.topByPopularity,
  });
  for (const world of popularityResults) byId.set(world.id, world);

  for (const tag of CORPUS.majorTags) {
    const tagResults = await searchWorlds(client, { tag, limit: CORPUS.topPerMajorTag });
    for (const world of tagResults) byId.set(world.id, world);
  }

  return byId;
}

async function main(): Promise<void> {
  const authOnly = process.argv.includes("--auth-only");

  const client = await getValidSession();

  if (authOnly) {
    const check = await client.request<{ displayName?: string; username?: string }>("/auth/user", {
      method: "GET",
    });
    console.log(`Authenticated as: ${check.data.displayName ?? check.data.username ?? "(unknown)"}`);
    return;
  }

  const run = await prisma.syncRun.create({
    data: { startedAt: new Date(), status: "running" },
  });

  try {
    const corpus = await fetchCorpus(client);
    const worlds = [...corpus.values()];

    const { upserted } = await upsertRawWorlds(worlds);

    const { worldCount } = await recomputeEmbeddingsAndScores();

    await prisma.syncRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        status: upserted === worlds.length ? "success" : "partial",
        worldsSeen: worlds.length,
        worldsUpserted: upserted,
      },
    });

    console.log(`Sync complete: ${worldCount} worlds in table, ${upserted}/${worlds.length} upserted this run.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.syncRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), status: "failed", errorMessage: message },
    });
    console.error("Sync failed:", message);
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("Unhandled error in sync script:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
