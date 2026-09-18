// Procedural LCARS-style cues synthesized with Web Audio — no audio assets.
// Nothing here touches window/AudioContext at import time (SSR-safe).

export type Cue = "hover" | "select" | "step-up" | "step-down" | "open" | "close" | "error";

const STORAGE_KEY = "lcars-sound-muted";
const MASTER_GAIN = 0.15;
const HOVER_THROTTLE_MS = 60;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted: boolean | null = null;
let lastHover = 0;
const listeners = new Set<() => void>();

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function readMuted(): boolean {
  if (muted !== null) return muted;
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage unavailable — fall through to the default.
  }
  // Default: sound on at low volume, except for users who asked for reduced motion.
  muted = stored === null ? prefersReducedMotion() : stored === "1";
  return muted;
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return true;
  return readMuted();
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // Persisting is best-effort.
  }
  listeners.forEach((fn) => fn());
}

export function subscribeMuted(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = MASTER_GAIN;
    master.connect(ctx.destination);
  }
  return ctx;
}

// Browsers block audio until a user gesture — create/resume the context on the first one.
if (typeof window !== "undefined") {
  const unlock = () => {
    const c = ensureContext();
    if (c && c.state === "suspended") void c.resume();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

interface Tone {
  freq: number;
  endFreq?: number;
  start: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
}

function play(tones: Tone[]): void {
  if (isMuted()) return;
  const c = ctx;
  if (!c || !master || c.state !== "running") return; // not unlocked by a gesture yet
  const now = c.currentTime;
  for (const t of tones) {
    const osc = c.createOscillator();
    const env = c.createGain();
    const begin = now + t.start;
    const end = begin + t.duration;
    osc.type = t.type ?? "sine";
    osc.frequency.setValueAtTime(t.freq, begin);
    if (t.endFreq) osc.frequency.exponentialRampToValueAtTime(t.endFreq, end);
    env.gain.setValueAtTime(0.0001, begin);
    env.gain.exponentialRampToValueAtTime(t.gain ?? 1, begin + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(env).connect(master);
    osc.start(begin);
    osc.stop(end + 0.02);
  }
}

export function playCue(cue: Cue): void {
  switch (cue) {
    case "hover": {
      const now = performance.now();
      if (now - lastHover < HOVER_THROTTLE_MS) return;
      lastHover = now;
      play([{ freq: 1800, endFreq: 2200, start: 0, duration: 0.05, gain: 0.25 }]);
      break;
    }
    case "select":
      play([
        { freq: 880, start: 0, duration: 0.07, gain: 0.8 },
        { freq: 1320, start: 0.07, duration: 0.1, gain: 0.8 },
      ]);
      break;
    case "step-up":
      play([{ freq: 900, endFreq: 1100, start: 0, duration: 0.06, gain: 0.6 }]);
      break;
    case "step-down":
      play([{ freq: 900, endFreq: 700, start: 0, duration: 0.06, gain: 0.6 }]);
      break;
    case "open":
      play([{ freq: 500, endFreq: 1500, start: 0, duration: 0.18, type: "triangle", gain: 0.6 }]);
      break;
    case "close":
      play([{ freq: 1500, endFreq: 500, start: 0, duration: 0.18, type: "triangle", gain: 0.6 }]);
      break;
    case "error":
      play([
        { freq: 220, start: 0, duration: 0.12, type: "square", gain: 0.5 },
        { freq: 165, start: 0.14, duration: 0.18, type: "square", gain: 0.5 },
      ]);
      break;
  }
}
