import type { WorldSummaryDTO } from "@/lib/types";

export type PositionedWorld = WorldSummaryDTO & { posX: number; posY: number; posZ: number };

// The raw UMAP embedding puts cluster centroids very close together (as
// close as ~0.4 units apart in this dataset) while individual clusters
// themselves span 8-23 units — so clusters overlap heavily in the source
// data. Scaling outward from a single global center can't fix that when a
// cluster already sits near the center. Instead, each cluster gets its own
// fixed anchor point, spread out around a sphere far enough apart that
// clusters read as distinct "constellations" without leaving huge empty gaps
// between them. Distance from camera/Stars/OrbitControls in
// StarfieldCanvas.tsx is tuned against this radius — keep them in sync if
// this changes.
export const ANCHOR_RADIUS = 30;
// A plain Fibonacci lattice places every cluster anchor on the surface of a
// perfect sphere, which is exactly why the whole starfield read as "too
// circular" no matter how organic each individual cluster's shell got — the
// big-picture silhouette was still a smooth ball. Anchors get the same
// lumpy/organic treatment as cluster shells (see organicLatticePoints below),
// but with bigger, lower-frequency lumps so the overall arrangement reads as
// one uneven cumulus-cloud of constellations rather than a globe, and a
// dedicated minimum separation so nearby anchors get pushed further apart
// instead of drifting into each other's shells.
const ANCHOR_LUMP_AMPLITUDE = 0.45;
const ANCHOR_POINT_ROUGHNESS = 0.2;
const ANCHOR_ANGULAR_JITTER = 0.5;
const ANCHOR_POLAR_JITTER = 0.35;
const ANCHOR_MIN_RADIUS_FACTOR = 0.55;
const ANCHOR_MAX_RADIUS_FACTOR = 1.5;
const ANCHOR_MIN_DISTANCE = 23;
// Placing members at their raw (scaled) UMAP offsets from the cluster
// centroid produced a solid 3D blob — plenty of worlds ended up buried deep
// inside the cluster, occluded by outer members from every angle and
// effectively unclickable. Instead, every cluster's members are laid out on
// the surface of their own hollow sphere (a mini Fibonacci lattice, same
// technique as the cluster anchors below), so every world sits on an outer
// shell with a clear line of sight from outside — none hidden behind others.
const CLUSTER_SHELL_BASE_RADIUS = 2.2;
const CLUSTER_SHELL_RADIUS_PER_SQRT_MEMBER = 1.15;
// Caps how far a single cluster's shell can grow before the galaxy-oval
// stretch/flatten (see applyGalaxyShape) is applied on top. Chosen comfortably
// below the nearest-neighbor distance between cluster anchors so two big
// neighboring clusters' ovals can't bleed into each other even after the
// oval's long axis stretches past this base radius.
const CLUSTER_SHELL_MAX_RADIUS = 11;
// The shell spacing above already keeps members apart in most cases, but a
// tiny cluster (few members, small shell) can still pack closer than this.
// This is the minimum center-to-center distance enforced between any two
// worlds in the same cluster as a safety net.
const MIN_WORLD_DISTANCE = 0.9;
const RELAXATION_ITERATIONS = 40;

// A perfectly even Fibonacci lattice at a fixed radius reads as a
// mathematically "too perfect" ball rather than an organic cluster of
// worlds. These add smooth, gentle undulation (low-frequency "lumps") plus a
// touch of per-point roughness and angular scatter, so the shell reads as a
// hand-scattered, asteroid-like cluster instead of a drawn sphere — while
// staying tightly bounded around the nominal shell radius so every world
// stays near the outer surface (still reachable, nothing sinks back into a
// buried core).
const ORGANIC_LUMP_AMPLITUDE = 0.34; // smooth radius undulation from a couple of random low-freq waves
const ORGANIC_POINT_ROUGHNESS = 0.24; // extra per-point radius noise on top of the lumps
const ORGANIC_ANGULAR_JITTER = 0.36; // radians — scatters points off the perfect golden-angle spiral
const ORGANIC_POLAR_JITTER = 0.22; // scatters points off the perfect golden-angle spiral in the other axis
const ORGANIC_MIN_RADIUS_FACTOR = 0.5;
const ORGANIC_MAX_RADIUS_FACTOR = 1.5;

// Flattens each cluster shell from a sphere into a galaxy-like oval disc:
// squash along one axis (the disc's short axis) and stretch along another
// (the disc's long axis), both randomized per cluster and rotated to a
// random orientation so clusters don't all read as identical pancakes lined
// up the same way.
const GALAXY_FLATTEN_MIN = 0.32;
const GALAXY_FLATTEN_MAX = 0.5;
const GALAXY_STRETCH_MIN = 1.1;
const GALAXY_STRETCH_MAX = 1.3;

/** Deterministic per-cluster ellipsoid shaping + orientation for the galaxy-oval look. */
function galaxyShapeFor(groupKey: string): {
  flatten: number;
  stretch: number;
  tilt: number;
  spin: number;
} {
  return {
    flatten: GALAXY_FLATTEN_MIN + hashUnit(`${groupKey}:flat`) * (GALAXY_FLATTEN_MAX - GALAXY_FLATTEN_MIN),
    stretch: GALAXY_STRETCH_MIN + hashUnit(`${groupKey}:stretch`) * (GALAXY_STRETCH_MAX - GALAXY_STRETCH_MIN),
    tilt: (hashUnit(`${groupKey}:tilt`) - 0.5) * Math.PI * 0.6,
    spin: hashUnit(`${groupKey}:spin`) * Math.PI * 2,
  };
}

/**
 * Squashes one axis and stretches another to turn a spherical point cloud
 * into an oval disc, then applies a random tilt/spin per cluster so the
 * ovals face different directions instead of all lying flat the same way.
 */
function applyGalaxyShape(
  points: [number, number, number][],
  groupKey: string,
): [number, number, number][] {
  const { flatten, stretch, tilt, spin } = galaxyShapeFor(groupKey);
  const cosSpin = Math.cos(spin);
  const sinSpin = Math.sin(spin);
  const cosTilt = Math.cos(tilt);
  const sinTilt = Math.sin(tilt);

  return points.map(([x, y, z]) => {
    // Flatten the disc's short axis (y) and stretch its long axis (x) while
    // the sphere is still axis-aligned.
    const fx = x * stretch;
    const fy = y * flatten;
    const fz = z;

    // Spin around the (still axis-aligned) short axis for orientation variety.
    const sx = fx * cosSpin - fz * sinSpin;
    const sz = fx * sinSpin + fz * cosSpin;

    // Tilt the disc's plane by rotating around x, so galaxies face varied
    // directions in 3D rather than all lying flat on the same plane.
    const ty = fy * cosTilt - sz * sinTilt;
    const tz = fy * sinTilt + sz * cosTilt;

    return [sx, ty, tz];
  });
}

function clusterShellRadius(memberCount: number): number {
  const grown = CLUSTER_SHELL_BASE_RADIUS + CLUSTER_SHELL_RADIUS_PER_SQRT_MEMBER * Math.sqrt(memberCount);
  return Math.min(grown, CLUSTER_SHELL_MAX_RADIUS);
}

/**
 * A golden-angle Fibonacci lattice, scattered into an organic, lumpy cluster
 * shape instead of a mathematically even sphere: points keep their even
 * golden-angle base spread (so there are still no big empty gaps or a dense
 * pole), then get smooth per-cluster "lumps", per-point roughness, and a bit
 * of angular scatter layered on top, seeded deterministically off the
 * cluster's own key so the shape is stable across re-renders.
 */
function organicClusterPoints(n: number, baseRadius: number, groupKey: string): [number, number, number][] {
  const spherePoints = organicLatticePoints(n, baseRadius, groupKey, {
    lumpAmplitude: ORGANIC_LUMP_AMPLITUDE,
    pointRoughness: ORGANIC_POINT_ROUGHNESS,
    angularJitter: ORGANIC_ANGULAR_JITTER,
    polarJitter: ORGANIC_POLAR_JITTER,
    minRadiusFactor: ORGANIC_MIN_RADIUS_FACTOR,
    maxRadiusFactor: ORGANIC_MAX_RADIUS_FACTOR,
  });
  return applyGalaxyShape(spherePoints, groupKey);
}

/**
 * Same technique as organicClusterPoints, tuned by the caller: an even
 * golden-angle base spread (no big gaps, no dense pole) with smooth low-
 * frequency "lumps", per-point roughness, and angular scatter layered on top,
 * all seeded deterministically off `groupKey` so the shape is stable across
 * re-renders. Used for both individual cluster shells (tight, subtle lumps)
 * and the top-level cluster-anchor arrangement (bigger, coarser lumps so the
 * whole field reads as an uneven cumulus cloud rather than a sphere).
 */
function organicLatticePoints(
  n: number,
  baseRadius: number,
  groupKey: string,
  opts: {
    lumpAmplitude: number;
    pointRoughness: number;
    angularJitter: number;
    polarJitter: number;
    minRadiusFactor: number;
    maxRadiusFactor: number;
  },
): [number, number, number][] {
  if (n <= 0) return [];
  if (n === 1) return [[0, 0, 0]];

  const points: [number, number, number][] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const freqA = 2 + hashUnit(`${groupKey}:fA`) * 2;
  const freqB = 3 + hashUnit(`${groupKey}:fB`) * 3;
  const phaseA = hashUnit(`${groupKey}:pA`) * Math.PI * 2;
  const phaseB = hashUnit(`${groupKey}:pB`) * Math.PI * 2;

  for (let i = 0; i < n; i++) {
    let y = 1 - (i / (n - 1)) * 2;
    let theta = goldenAngle * i;

    theta += (hashUnit(`${groupKey}:${i}:jt`) - 0.5) * opts.angularJitter;
    y = Math.max(-1, Math.min(1, y + (hashUnit(`${groupKey}:${i}:jy`) - 0.5) * opts.polarJitter));
    const r = Math.sqrt(Math.max(0, 1 - y * y));

    const lump =
      1 +
      opts.lumpAmplitude *
        (0.5 * Math.sin(theta * freqA + y * 3 + phaseA) + 0.5 * Math.sin(theta * freqB - y * 2 + phaseB));
    const roughness = 1 + (hashUnit(`${groupKey}:${i}:jr`) - 0.5) * opts.pointRoughness;
    const radiusFactor = Math.max(
      opts.minRadiusFactor,
      Math.min(opts.maxRadiusFactor, lump * roughness),
    );
    const radius = baseRadius * radiusFactor;

    points.push([Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius]);
  }
  return points;
}

function organicAnchorPoints(n: number, baseRadius: number): [number, number, number][] {
  return organicLatticePoints(n, baseRadius, "anchors", {
    lumpAmplitude: ANCHOR_LUMP_AMPLITUDE,
    pointRoughness: ANCHOR_POINT_ROUGHNESS,
    angularJitter: ANCHOR_ANGULAR_JITTER,
    polarJitter: ANCHOR_POLAR_JITTER,
    minRadiusFactor: ANCHOR_MIN_RADIUS_FACTOR,
    maxRadiusFactor: ANCHOR_MAX_RADIUS_FACTOR,
  });
}

/** Deterministic unit vector for two ids, used to break exact position ties. */
function deterministicDirection(idA: string, idB: string): [number, number, number] {
  const seed = idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
  const theta = hashUnit(seed) * Math.PI * 2;
  const z = hashUnit(`${seed}:z`) * 2 - 1;
  const r = Math.sqrt(Math.max(0, 1 - z * z));
  return [Math.cos(theta) * r, z, Math.sin(theta) * r];
}

/**
 * Pushes apart any two positions closer than MIN_WORLD_DISTANCE, iterating a
 * few times so a chain of overlaps resolves rather than just the first pair.
 * Mutates `positions` in place.
 */
function relaxOverlaps(
  ids: string[],
  positions: [number, number, number][],
  minDistance: number = MIN_WORLD_DISTANCE,
): void {
  for (let iter = 0; iter < RELAXATION_ITERATIONS; iter++) {
    let movedAny = false;
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const a = positions[i];
        const b = positions[j];
        let dx = b[0] - a[0];
        let dy = b[1] - a[1];
        let dz = b[2] - a[2];
        let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist >= minDistance) continue;
        movedAny = true;

        if (dist < 1e-6) {
          [dx, dy, dz] = deterministicDirection(ids[i], ids[j]);
          dist = 1;
        }
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;
        const push = (minDistance - dist) / 2;

        a[0] -= nx * push;
        a[1] -= ny * push;
        a[2] -= nz * push;
        b[0] += nx * push;
        b[1] += ny * push;
        b[2] += nz * push;
      }
    }
    if (!movedAny) break;
  }
}

export function filterPositioned(worlds: WorldSummaryDTO[]): PositionedWorld[] {
  return worlds.filter(
    (w): w is PositionedWorld => w.posX !== null && w.posY !== null && w.posZ !== null,
  );
}

/** Which cluster (or singleton) group a world belongs to for layout purposes. */
export function groupKeyFor(world: Pick<WorldSummaryDTO, "id" | "clusterId">): string {
  return world.clusterId !== null ? `c${world.clusterId}` : `w${world.id}`;
}

/**
 * Re-layouts the raw UMAP/k-means positions for display: each cluster is
 * placed at its own well-separated anchor point (see ANCHOR_RADIUS above),
 * and each world is placed on the surface of that cluster's own organic
 * shell (see organicClusterPoints/CLUSTER_SHELL_* above) so clusters and
 * individual stars both read as visually distinct, and every world stays
 * reachable rather than buried inside a dense blob — without looking like a
 * perfectly regular sphere. Worlds without a cluster id are treated as their
 * own singleton cluster.
 */
export function computeSpreadPositions(worlds: WorldSummaryDTO[]): Map<string, [number, number, number]> {
  const positioned = filterPositioned(worlds);
  const result = new Map<string, [number, number, number]>();
  if (positioned.length === 0) return result;

  const groups = new Map<string, PositionedWorld[]>();
  for (const w of positioned) {
    const key = groupKeyFor(w);
    const arr = groups.get(key);
    if (arr) arr.push(w);
    else groups.set(key, [w]);
  }

  const groupKeys = [...groups.keys()];
  const anchors = organicAnchorPoints(groupKeys.length, ANCHOR_RADIUS);
  relaxOverlaps(groupKeys, anchors, ANCHOR_MIN_DISTANCE);

  groupKeys.forEach((key, idx) => {
    const members = groups.get(key)!;
    const [ax, ay, az] = anchors[idx];
    const shellRadius = clusterShellRadius(members.length);
    const shellPoints = organicClusterPoints(members.length, shellRadius, key);
    const memberPositions: [number, number, number][] = shellPoints.map(([dx, dy, dz]) => [
      ax + dx,
      ay + dy,
      az + dz,
    ]);
    relaxOverlaps(
      members.map((w) => w.id),
      memberPositions,
    );
    members.forEach((w, i) => result.set(w.id, memberPositions[i]));
  });

  return result;
}

/**
 * Marker radius for a world's star, scaled by popularityScore (0-100). Size
 * is the only popularity signal in the UI, so the range stays tight — nothing
 * reads as super tiny or super huge — and uses sqrt so the long tail of
 * lower-popularity worlds doesn't all collapse into the same dot size.
 * Shared between the star markers and their text labels (labels sit just
 * below each marker, offset by this same radius).
 */
export function scaleFor(popularityScore: number): number {
  const normalized = Math.max(0, Math.min(100, popularityScore)) / 100;
  return 0.15 + Math.sqrt(normalized) * 0.35;
}

function hashUnit(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 1000) / 1000;
}

/**
 * Every world in a cluster is stored with the *identical* colorHex (assigned
 * per cluster, not per world) — so once positions overlap even a little, same-
 * colored stars are impossible to tell apart. This gives each world its own
 * deterministic small hue/lightness nudge off its cluster's base color, so a
 * dense cluster reads as many distinct stars instead of one blob of one
 * color. Deterministic (hashed off the world id) so it's stable across
 * re-renders rather than reshuffling.
 */
export function colorJitterFor(id: string): { hueShift: number; lightnessShift: number } {
  return {
    hueShift: (hashUnit(id) - 0.5) * 0.1, // ± a few degrees of hue
    lightnessShift: (hashUnit(`${id}:l`) - 0.5) * 0.4, // meaningfully lighter/darker
  };
}

// A fully static field reads as a picture, not a "space" — these give every
// world and every cluster shell a tiny, slow wobble around its resting spot.
// Small enough not to reopen the overlap/occlusion problems the layout above
// solves, but enough to feel alive. Each entity gets its own deterministic
// phase/speed (from its id) so nothing moves in lockstep.
const WORLD_ORBIT_RADIUS = 0.15;
const WORLD_ORBIT_SPEED = 0.25; // rad/s baseline, randomized per world below
const CLUSTER_ORBIT_RADIUS = 1.2;
const CLUSTER_ORBIT_SPEED = 0.06; // rad/s baseline, randomized per cluster below

/** A small Lissajous-style wobble: bounded, non-periodic-looking, deterministic per seed. */
function orbitOffset(seed: string, t: number, radius: number, speedBase: number): [number, number, number] {
  const speed = speedBase * (0.6 + hashUnit(`${seed}:spd`) * 0.8);
  const px = hashUnit(`${seed}:px`) * Math.PI * 2;
  const py = hashUnit(`${seed}:py`) * Math.PI * 2;
  const pz = hashUnit(`${seed}:pz`) * Math.PI * 2;
  return [
    Math.sin(t * speed + px) * radius,
    Math.sin(t * speed * 1.31 + py) * radius,
    Math.sin(t * speed * 0.77 + pz) * radius,
  ];
}

/** Slow per-world wobble around its resting position, independent of its cluster's drift. */
export function worldOrbitOffset(id: string, t: number): [number, number, number] {
  return orbitOffset(`w:${id}`, t, WORLD_ORBIT_RADIUS, WORLD_ORBIT_SPEED);
}

/** Slow drift of an entire cluster shell around its anchor point, shared by all its members. */
export function clusterOrbitOffset(groupKey: string, t: number): [number, number, number] {
  return orbitOffset(`g:${groupKey}`, t, CLUSTER_ORBIT_RADIUS, CLUSTER_ORBIT_SPEED);
}
