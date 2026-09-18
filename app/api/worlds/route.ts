import { getDataAsOf, getWorldSummaries } from "@/lib/data/worlds";
import type { WorldsResponse } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const [worlds, dataAsOf] = await Promise.all([getWorldSummaries(), getDataAsOf()]);

  const body: WorldsResponse = { dataAsOf, worlds };

  return Response.json(body, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
