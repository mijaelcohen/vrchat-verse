import { PACING } from "@/lib/config";
import { sleep } from "@/lib/time";
import type { VRChatClient } from "./client";
import type { VRChatWorld, WorldSearchQuery } from "./types";

/**
 * Pages sequentially through VRChat's `/worlds` search endpoint up to `limit`
 * results, sleeping `PACING.requestDelayMs` between page requests (PRD §10's
 * conservative pacing — deliberately not parallelized).
 */
export async function searchWorlds(
  client: VRChatClient,
  query: WorldSearchQuery & { limit: number },
): Promise<VRChatWorld[]> {
  const results: VRChatWorld[] = [];
  let offset = 0;
  const pageSize = Math.min(PACING.pageSize, 100);

  while (results.length < query.limit) {
    const n = Math.min(pageSize, query.limit - results.length);
    const params = new URLSearchParams();
    params.set("n", String(n));
    params.set("offset", String(offset));
    if (query.sort) params.set("sort", query.sort);
    if (query.tag) params.set("tag", query.tag);

    const res = await client.request<VRChatWorld[]>(`/worlds?${params.toString()}`, {
      method: "GET",
    });

    if (res.status === 403 && offset > 0) {
      // VRChat's search backend refuses to paginate past a fixed result
      // window (undocumented, empirically ~1000 hits) — treat this as the
      // end of the result set for this query rather than a fatal error.
      console.warn(
        `VRChat search backend capped pagination at offset ${offset} for query "${params.toString()}"; stopping early.`,
      );
      break;
    }

    if (res.status !== 200 || !Array.isArray(res.data)) {
      throw new Error(
        `VRChat world search failed (status ${res.status}) for query "${params.toString()}"`,
      );
    }

    if (res.data.length === 0) break;

    results.push(...res.data);
    offset += res.data.length;

    if (res.data.length < n) break; // short page: no more results for this query

    await sleep(PACING.requestDelayMs);
  }

  return results;
}
