import { prisma } from "@/lib/db";
import type { VRChatWorld } from "@/lib/vrchat/types";

function derivePlatforms(world: VRChatWorld): string[] {
  const platforms = new Set<string>();
  for (const pkg of world.unityPackages ?? []) {
    if (pkg.platform) platforms.add(pkg.platform);
  }
  return [...platforms];
}

function toWorldFields(world: VRChatWorld) {
  return {
    name: world.name,
    description: world.description,
    authorId: world.authorId,
    authorName: world.authorName,
    capacity: world.capacity,
    recommendedCapacity: world.recommendedCapacity,
    favorites: world.favorites ?? 0,
    visits: world.visits ?? 0,
    heat: world.heat ?? 0,
    popularity: world.popularity ?? 0,
    occupants: world.occupants ?? 0,
    tags: world.tags ?? [],
    releaseStatus: world.releaseStatus,
    platforms: derivePlatforms(world),
    thumbnailUrl: world.thumbnailImageUrl,
    imageUrl: world.imageUrl,
    vrchatCreatedAt: world.created_at ? new Date(world.created_at) : undefined,
    vrchatUpdatedAt: world.updated_at ? new Date(world.updated_at) : undefined,
  };
}

async function upsertRawWorld(world: VRChatWorld): Promise<void> {
  const fields = toWorldFields(world);
  await prisma.world.upsert({
    where: { id: world.id },
    create: { id: world.id, ...fields },
    update: fields,
  });
}

export async function upsertRawWorlds(worlds: VRChatWorld[]): Promise<{ upserted: number }> {
  let upserted = 0;
  const chunkSize = 25;
  for (let i = 0; i < worlds.length; i += chunkSize) {
    const chunk = worlds.slice(i, i + chunkSize);
    const results = await Promise.allSettled(chunk.map(upsertRawWorld));
    upserted += results.filter((r) => r.status === "fulfilled").length;
    for (const r of results) {
      if (r.status === "rejected") {
        console.error("Failed to upsert world:", r.reason);
      }
    }
  }
  return { upserted };
}
