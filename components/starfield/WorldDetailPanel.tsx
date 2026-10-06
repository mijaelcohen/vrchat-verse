"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { LcarsBar, LcarsButton, LcarsReadout, barStyles } from "@/components/lcars";
import { playCue } from "@/lib/lcars/audio";
import { cn } from "@/lib/utils";
import type { WorldDetailDTO } from "@/lib/types";
import { useStarfieldStore } from "./store";
import { WorldLoader } from "./WorldLoader";

export function WorldDetailPanel({
  worldCount,
  dataAsOf,
}: {
  worldCount: number;
  dataAsOf: string | null;
}) {
  const selectedWorldId = useStarfieldStore((s) => s.selectedWorldId);
  const setSelectedWorldId = useStarfieldStore((s) => s.setSelectedWorldId);
  // Keyed by world id so a response can never be mistaken for a different,
  // more-recently-selected world's data (and so nothing needs to be reset
  // synchronously at the top of the effect below).
  const [result, setResult] = useState<{ id: string; detail: WorldDetailDTO | null } | null>(null);

  useEffect(() => {
    if (!selectedWorldId) return;
    let cancelled = false;

    fetch(`/api/worlds/${selectedWorldId}`)
      .then((res) => (res.ok ? (res.json() as Promise<WorldDetailDTO>) : null))
      .then((data) => {
        if (cancelled) return;
        setResult({ id: selectedWorldId, detail: data });
        playCue(data ? "open" : "error");
      });

    return () => {
      cancelled = true;
    };
  }, [selectedWorldId]);

  if (!selectedWorldId) {
    return (
      <div className="flex h-full flex-col justify-center gap-6 p-4">
        <h1 className="lcars-trim text-right text-lcars-h1 text-balance uppercase text-lcars-teal">Explore worlds</h1>
        <p className="lcars-trim max-w-xl text-lcars-body text-pretty uppercase text-lcars-ice/80">
          Choose a world on the star map, or use the arrow keys, to open its record.
        </p>
        <LcarsReadout
          className="max-w-xl"
          items={[
            { label: "Worlds catalogued", value: worldCount.toLocaleString() },
            { label: "Data as of", value: dataAsOf ? new Date(dataAsOf).toLocaleString() : "never" },
          ]}
        />
      </div>
    );
  }

  const current = result?.id === selectedWorldId ? result.detail : null;
  const loading = result?.id !== selectedWorldId;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <a
          href={`https://vrchat.com/home/launch?worldId=${encodeURIComponent(selectedWorldId)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            barStyles({ variant: "ice", cap: "right" }),
            "transition-[filter] hover:brightness-115 active:brightness-85",
          )}
        >
          Launch world
        </a>
        <LcarsButton
          variant="alert"
          className="ml-auto"
          onClick={() => {
            playCue("close");
            setSelectedWorldId(null);
          }}
        >
          Clear
        </LcarsButton>
      </div>

      {loading && !current && <WorldLoader />}
      {!loading && !current && <p className="text-lcars-body uppercase text-lcars-alert">World not found.</p>}

      {current && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            {current.thumbnailUrl && (
              <div className="relative aspect-video w-full overflow-hidden rounded-bl-(--lcars-radius-content) bg-lcars-deep">
                <Image
                  src={current.thumbnailUrl}
                  alt={current.name}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            )}
            <div>
              <h2 className="lcars-trim text-lcars-h2 text-balance uppercase text-lcars-teal">{current.name}</h2>
              <p className="mt-3 text-lcars-h4 uppercase text-lcars-ice">by {current.authorName}</p>
            </div>
            {current.description && (
              <p className="text-lcars-body text-pretty normal-case text-lcars-ice/90">{current.description}</p>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-1">
              {current.tags.slice(0, 8).map((tag) => (
                <LcarsBar key={tag} variant="deep" cap="both">
                  {tag}
                </LcarsBar>
              ))}
            </div>

            <LcarsReadout
              items={[
                {
                  label: "Capacity",
                  value: `${current.capacity ?? "—"}${current.recommendedCapacity ? ` (rec. ${current.recommendedCapacity})` : ""}`,
                },
                { label: "Platforms", value: current.platforms.join(", ") || "—" },
                { label: "Visits", value: current.visits.toLocaleString() },
                { label: "Favorites", value: current.favorites.toLocaleString() },
                { label: "Heat", value: current.heat },
                { label: "Occupants", value: `${current.occupants} (last sync)` },
              ]}
            />

            {current.lastSyncedAt && (
              <p className="text-lcars-sub uppercase text-lcars-teal">
                Last synced {new Date(current.lastSyncedAt).toLocaleString()}
              </p>
            )}

            <a
              href={`https://vrchat.com/home/world/${current.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                barStyles({ variant: "amber", size: "lg", cap: "both" }),
                "self-start transition-[filter] hover:brightness-115 active:brightness-85",
              )}
            >
              Visit in VRChat
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
