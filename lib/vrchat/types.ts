export interface VRChatCookieJar {
  auth?: string;
  twoFactorAuth?: string;
  capturedAt: string;
}

export interface VRChatCurrentUserResponse {
  id: string;
  username?: string;
  displayName?: string;
  requiresTwoFactorAuth?: string[];
}

export interface VRChatVerify2FAResponse {
  verified: boolean;
}

/**
 * Raw shape of a single entry from VRChat's `/worlds` search endpoint (and
 * `/worlds/{id}`, which returns a superset). Field names/types are based on
 * community-documented behavior of this unofficial API — verify against a
 * real response during initial local sync testing and adjust as needed.
 */
export interface VRChatWorld {
  id: string;
  name: string;
  description?: string;
  authorId: string;
  authorName: string;
  capacity?: number;
  recommendedCapacity?: number;
  favorites?: number;
  visits?: number;
  heat?: number;
  popularity?: number;
  occupants?: number;
  tags?: string[];
  releaseStatus?: string;
  thumbnailImageUrl?: string;
  imageUrl?: string;
  created_at?: string;
  updated_at?: string;
  unityPackages?: Array<{ platform?: string }>;
}

export interface WorldSearchQuery {
  sort?: "heat" | "popularity" | "created" | "updated";
  tag?: string;
  n?: number;
  offset?: number;
}
