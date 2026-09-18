/**
 * Throwaway local seed script — NOT part of the shipped app. Inserts fake
 * worlds and runs the real embedding/clustering/scoring pipeline against
 * them, purely so the frontend can be verified against realistic-shaped
 * data without needing a real VRChat account. Safe to delete.
 */
import "dotenv/config";
import { prisma } from "@/lib/db";
import { recomputeEmbeddingsAndScores } from "@/lib/pipeline/finalize";

const TAG_POOLS = [
  ["horror", "escape_room", "puzzle", "system_approved"],
  ["horror", "maze", "spooky", "system_approved"],
  ["club", "music", "dance", "avatar_friendly"],
  ["club", "music", "edm", "avatar_friendly"],
  ["chill", "hangout", "game", "avatar_friendly"],
  ["chill", "hangout", "art", "avatar_friendly"],
  ["game", "parkour", "sports"],
  ["game", "parkour", "obby"],
  ["anime", "roleplay", "avatar_friendly"],
  ["anime", "roleplay", "school"],
  ["nature", "photography", "chill"],
  ["nature", "explore", "chill"],
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  const count = 120;
  for (let i = 0; i < count; i++) {
    const tags = randomFrom(TAG_POOLS);
    const heat = Math.floor(Math.random() * 100);
    const popularity = Math.floor(Math.random() * 100);
    const visits = Math.floor(Math.random() * 500000);
    const favorites = Math.floor(Math.random() * 20000);

    await prisma.world.upsert({
      where: { id: `wrld_fake_${i}` },
      create: {
        id: `wrld_fake_${i}`,
        name: `Fake World ${i}`,
        description: `A procedurally generated test world #${i} for local UI verification.`,
        authorId: `usr_fake_author_${i % 10}`,
        authorName: `FakeAuthor${i % 10}`,
        capacity: 16,
        recommendedCapacity: 8,
        favorites,
        visits,
        heat,
        popularity,
        occupants: Math.floor(Math.random() * 16),
        tags,
        releaseStatus: "public",
        platforms: Math.random() > 0.3 ? ["standalonewindows", "android"] : ["standalonewindows"],
        thumbnailUrl: `https://picsum.photos/seed/${i}/400/300`,
        imageUrl: `https://picsum.photos/seed/${i}/800/600`,
        vrchatCreatedAt: new Date(Date.now() - Math.random() * 1e11),
        vrchatUpdatedAt: new Date(),
      },
      update: {},
    });
  }

  const { worldCount } = await recomputeEmbeddingsAndScores();
  console.log(`Seeded ${count} fake worlds; recomputed embeddings for ${worldCount} worlds.`);

  await prisma.syncRun.create({
    data: {
      startedAt: new Date(),
      finishedAt: new Date(),
      status: "success",
      worldsSeen: count,
      worldsUpserted: count,
    },
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
