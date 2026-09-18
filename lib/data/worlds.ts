import { prisma } from "@/lib/db";
import type { WorldDetailDTO, WorldSummaryDTO } from "@/lib/types";

const summarySelect = {
  id: true,
  name: true,
  thumbnailUrl: true,
  tags: true,
  popularityScore: true,
  posX: true,
  posY: true,
  posZ: true,
  clusterId: true,
  clusterLabel: true,
  colorHex: true,
  platforms: true,
  favorites: true,
  visits: true,
  heat: true,
  occupants: true,
  capacity: true,
  lastSyncedAt: true,
} as const;

type RawSummary = {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  tags: string[];
  popularityScore: number;
  posX: number | null;
  posY: number | null;
  posZ: number | null;
  clusterId: number | null;
  clusterLabel: string | null;
  colorHex: string | null;
  platforms: string[];
  favorites: number;
  visits: number;
  heat: number;
  occupants: number;
  capacity: number | null;
  lastSyncedAt: Date | null;
};

function toSummaryDTO(world: RawSummary): WorldSummaryDTO {
  return { ...world, lastSyncedAt: world.lastSyncedAt?.toISOString() ?? null };
}

export async function getWorldSummaries(): Promise<WorldSummaryDTO[]> {
  const worlds = await prisma.world.findMany({
    select: summarySelect,
    orderBy: { popularityScore: "desc" },
  });
  return worlds.map(toSummaryDTO);
}

export async function getWorldDetail(id: string): Promise<WorldDetailDTO | null> {
  const world = await prisma.world.findUnique({ where: { id } });
  if (!world) return null;

  return {
    ...toSummaryDTO(world),
    description: world.description,
    authorId: world.authorId,
    authorName: world.authorName,
    recommendedCapacity: world.recommendedCapacity,
    releaseStatus: world.releaseStatus,
    imageUrl: world.imageUrl,
    vrchatCreatedAt: world.vrchatCreatedAt?.toISOString() ?? null,
    vrchatUpdatedAt: world.vrchatUpdatedAt?.toISOString() ?? null,
  };
}

export async function getDataAsOf(): Promise<string | null> {
  const lastSuccess = await prisma.syncRun.findFirst({
    where: { status: "success" },
    orderBy: { finishedAt: "desc" },
    select: { finishedAt: true },
  });
  return lastSuccess?.finishedAt?.toISOString() ?? null;
}
