"use client";

import { useSyncExternalStore } from "react";
import { isMuted, playCue, setMuted, subscribeMuted, type Cue } from "@/lib/lcars/audio";

export function useLcarsSound() {
  const muted = useSyncExternalStore(subscribeMuted, isMuted, () => true);
  return {
    muted,
    setMuted,
    play: (cue: Cue) => playCue(cue),
  };
}
