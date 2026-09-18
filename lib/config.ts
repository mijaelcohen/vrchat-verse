/**
 * Single source of truth for sync-pipeline tunables. Nothing here should be
 * hardcoded elsewhere in scripts/sync.ts or lib/pipeline/*.
 */

export const CORPUS = {
  /** Top N worlds by VRChat's "heat" sort. */
  topByHeat: 100,
  /** Top N worlds by VRChat's "popularity" sort. */
  topByPopularity: 100,
  /** Top N worlds per major tag query (in addition to the sorts above). */
  topPerMajorTag: 100,
  /**
   * VRChat's tag taxonomy isn't fully documented up front — finalize this list
   * empirically from real API responses during initial sync development
   * (look at the `tags` arrays actually returned and pick the most common
   * `author_tag_*`/`system_*` genre-ish tags).
   */
  majorTags: [] as string[],
};

export const PACING = {
  /** Delay between paginated VRChat API requests, per PRD §10's "conservative pace". */
  requestDelayMs: 2000,
  pageSize: 100,
};

export const EMBEDDING = {
  /** Size of the fixed tag vocabulary used to build multi-hot feature vectors. */
  tagVocabSize: 200,
  numClusters: 12,
};

export const SCORING = {
  weights: {
    heat: 0.35,
    popularity: 0.35,
    visits: 0.2,
    favorites: 0.1,
  },
};
