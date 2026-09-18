"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { LcarsBar, LcarsButton, LcarsReadout } from "@/components/lcars";
import { playCue } from "@/lib/lcars/audio";
import type { WorldDetailDTO } from "@/lib/types";
import { useStarfieldStore } from "./store";

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
      <div className="flex h-full flex-col justify-center gap-3 p-4">
        <p className="text-3xl uppercase text-lcars-teal">Select a star</p>
        <p className="max-w-md text-lg uppercase text-lcars-ice/80">
          Choose a world on the star map, or use the arrow keys, to open its record.
        </p>
        <LcarsReadout
          className="max-w-md"
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
        <LcarsBar variant="ice" cap="right">
          {selectedWorldId}
        </LcarsBar>
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

      {loading && !current && <p className="text-lg uppercase text-lcars-teal">Accessing record…</p>}
      {!loading && !current && <p className="text-lg uppercase text-lcars-alert">World not found.</p>}

      {current && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            {current.thumbnailUrl && (
              <div className="relative aspect-video w-full overflow-hidden rounded-bl-[36px] bg-lcars-deep">
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
              <h2 className="text-4xl uppercase leading-none text-lcars-teal">{current.name}</h2>
              <p className="mt-1 text-lg uppercase text-lcars-ice">by {current.authorName}</p>
            </div>
            {current.description && (
              <p className="text-base normal-case leading-snug text-lcars-ice/90">{current.description}</p>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-1">
              {current.tags.slice(0, 8).map((tag) => (
                <LcarsBar key={tag} variant="deep" cap="both" className="px-3 py-1 text-xs">
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
              <p className="text-xs uppercase text-lcars-teal">
                Last synced {new Date(current.lastSyncedAt).toLocaleString()}
              </p>
            )}

            <a
              href={`https://vrchat.com/home/world/${current.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-lcars-amber px-6 py-2 text-lg uppercase text-lcars-ink hover:brightness-125"
            >
              Visit in VRChat
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
