import { StarfieldApp } from "@/components/starfield/StarfieldApp";
import { getDataAsOf, getWorldSummaries } from "@/lib/data/worlds";

// Without this, Next statically prerenders "/" at build time — since the daily
// sync job only writes to Postgres and never triggers a redeploy, a static
// page would freeze on whatever data existed at the last deploy forever.
export const dynamic = "force-dynamic";

export default async function Home() {
  let worlds: Awaited<ReturnType<typeof getWorldSummaries>> = [];
  let dataAsOf: string | null = null;

  try {
    [worlds, dataAsOf] = await Promise.all([getWorldSummaries(), getDataAsOf()]);
  } catch (error) {
    // A transient DB hiccup shouldn't 500 the whole page — render an empty starfield instead.
    console.error("Failed to load worlds for the starfield:", error);
  }

  return <StarfieldApp worlds={worlds} dataAsOf={dataAsOf} />;
}
