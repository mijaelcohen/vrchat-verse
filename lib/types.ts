export interface WorldSummaryDTO {
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
  lastSyncedAt: string | null;
}

export interface WorldDetailDTO extends WorldSummaryDTO {
  description: string | null;
  authorId: string;
  authorName: string;
  recommendedCapacity: number | null;
  releaseStatus: string | null;
  imageUrl: string | null;
  vrchatCreatedAt: string | null;
  vrchatUpdatedAt: string | null;
}

export interface WorldsResponse {
  dataAsOf: string | null;
  worlds: WorldSummaryDTO[];
}
