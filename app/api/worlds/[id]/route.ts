import type { NextRequest } from "next/server";
import { getWorldDetail } from "@/lib/data/worlds";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/worlds/[id]">) {
  const { id } = await ctx.params;
  const world = await getWorldDetail(id);

  if (!world) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  return Response.json(world);
}
