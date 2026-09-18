import { EMBEDDING } from "@/lib/config";

/** Fixed vocabulary = the most common tags across the current full corpus. */
export function buildVocabulary(tagLists: string[][]): string[] {
  const counts = new Map<string, number>();
  for (const tags of tagLists) {
    for (const tag of tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, EMBEDDING.tagVocabSize)
    .map(([tag]) => tag);
}
