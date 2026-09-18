/** Multi-hot (bag-of-tags) feature vector for one world against a fixed vocabulary. */
export function buildFeatureVector(tags: string[], vocabulary: string[]): number[] {
  const tagSet = new Set(tags);
  return vocabulary.map((tag) => (tagSet.has(tag) ? 1 : 0));
}

export function buildFeatureMatrix(tagLists: string[][], vocabulary: string[]): number[][] {
  return tagLists.map((tags) => buildFeatureVector(tags, vocabulary));
}
