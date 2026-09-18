"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { WorldDetailDTO } from "@/lib/types";
import { useStarfieldStore } from "./store";

export function WorldDetailPanel() {
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
        if (!cancelled) setResult({ id: selectedWorldId, detail: data });
      });

    return () => {
      cancelled = true;
    };
  }, [selectedWorldId]);

  if (!selectedWorldId) return null;

  const current = result?.id === selectedWorldId ? result.detail : null;
  const loading = result?.id !== selectedWorldId;

  return (
    <div className="absolute right-4 top-4 z-10 w-80 rounded-lg border border-white/10 bg-black/80 p-4 text-zinc-100 backdrop-blur">
      <button
        className="absolute right-3 top-3 text-zinc-400 hover:text-white"
        onClick={() => setSelectedWorldId(null)}
        aria-label="Close"
      >
        ✕
      </button>

      {loading && !current && <p className="text-sm text-zinc-400">Loading…</p>}
      {!loading && !current && <p className="text-sm text-zinc-400">World not found.</p>}

      {current && (
        <div className="flex flex-col gap-3">
          {current.thumbnailUrl && (
            <div className="relative h-36 w-full overflow-hidden rounded-md bg-white/5">
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
            <h2 className="text-lg font-semibold leading-tight">{current.name}</h2>
            <p className="text-sm text-zinc-400">by {current.authorName}</p>
          </div>

          {current.description && <p className="text-sm text-zinc-300">{current.description}</p>}

          <div className="flex flex-wrap gap-1">
            {current.tags.slice(0, 8).map((tag) => (
              <span key={tag} className="rounded bg-white/10 px-2 py-0.5 text-xs text-zinc-300">
                {tag}
              </span>
            ))}
          </div>

          <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-zinc-400">
            <dt>Capacity</dt>
            <dd>
              {current.capacity ?? "—"}
              {current.recommendedCapacity ? ` (rec. ${current.recommendedCapacity})` : ""}
            </dd>
            <dt>Platforms</dt>
            <dd>{current.platforms.join(", ") || "—"}</dd>
            <dt>Visits</dt>
            <dd>{current.visits.toLocaleString()}</dd>
            <dt>Favorites</dt>
            <dd>{current.favorites.toLocaleString()}</dd>
            <dt>Heat</dt>
            <dd>{current.heat}</dd>
            <dt>Occupants</dt>
            <dd>{current.occupants} (as of last sync)</dd>
          </dl>

          {current.lastSyncedAt && (
            <p className="text-xs text-zinc-500">
              Last synced {new Date(current.lastSyncedAt).toLocaleString()}
            </p>
          )}

          <a
            href={`https://vrchat.com/home/world/${current.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 rounded-md bg-indigo-500 px-3 py-2 text-center text-sm font-medium text-white hover:bg-indigo-400"
          >
            Visit in VRChat
          </a>
        </div>
      )}
    </div>
  );
}
