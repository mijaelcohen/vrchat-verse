"use client";

import { useMemo, useRef } from "react";
import { Instance, Instances } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Color, type Object3D } from "three";
import type { WorldSummaryDTO } from "@/lib/types";
import {
  clusterOrbitOffset,
  colorJitterFor,
  computeSpreadPositions,
  filterPositioned,
  groupKeyFor,
  scaleFor,
  worldOrbitOffset,
} from "./layout";
import { useStarfieldStore, worldMatchesFilters } from "./store";

const DIM_COLOR = new Color("#333844");
// Bloom triggers per-pixel off luminance, and luminance is perceptually
// weighted per channel (green counts ~10x more than blue) — so boosting every
// hue by the same flat scalar made green/yellow markers blow past the
// threshold while blue/purple ones never did, even at identical HSL
// lightness. Boosting relative to each color's own luminance instead makes
// every marker reach the same target luminance regardless of hue, so they
// all glow evenly.
const REC709_LUMINANCE = { r: 0.2126, g: 0.7152, b: 0.0722 };
const TARGET_LUMINANCE = 1.6; // comfortably above Bloom's luminanceThreshold (0.9) for every hue
const TWINKLE_AMPLITUDE = 0.10; // subtle — a shimmer, not a pulse
const TWINKLE_SPEED = 1.4; // radians/sec, roughly one cycle every ~4.5s
const SELECTED_SCALE_BOOST = 1.05; // the selected world's star reads 5% bigger

// Deterministic per-world phase (0-2π) so the twinkle offset is stable across
// re-renders instead of reshuffling every time the component re-mounts.
function phaseForId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 1000) / 1000 * Math.PI * 2;
}

const hsl = { h: 0, s: 0, l: 0 };

// Every world in a cluster shares the exact same colorHex (assigned per
// cluster server-side, not per world) — nudging each one off that base color
// is what makes overlapping same-cluster stars distinguishable at all.
function jitteredColor(baseHex: string, id: string): Color {
  const base = new Color(baseHex);
  base.getHSL(hsl);
  const { hueShift, lightnessShift } = colorJitterFor(id);
  const color = new Color().setHSL(
    (hsl.h + hueShift + 1) % 1,
    hsl.s,
    Math.min(0.85, Math.max(0.25, hsl.l + lightnessShift)),
  );
  const luminance =
    color.r * REC709_LUMINANCE.r + color.g * REC709_LUMINANCE.g + color.b * REC709_LUMINANCE.b;
  return color.multiplyScalar(TARGET_LUMINANCE / Math.max(luminance, 0.05));
}

export function WorldPoints({ worlds }: { worlds: WorldSummaryDTO[] }) {
  const filters = useStarfieldStore((s) => s.filters);
  const selectedWorldId = useStarfieldStore((s) => s.selectedWorldId);
  const setSelectedWorldId = useStarfieldStore((s) => s.setSelectedWorldId);
  const setHoveredWorldId = useStarfieldStore((s) => s.setHoveredWorldId);

  const positioned = useMemo(() => filterPositioned(worlds), [worlds]);
  const displayPositions = useMemo(() => computeSpreadPositions(worlds), [worlds]);

  const items = useMemo(
    () =>
      positioned.map((world) => {
        const matches = worldMatchesFilters(world, filters);
        const baseScale = scaleFor(world.popularityScore) * (matches ? 1 : 0.6);
        const color = matches ? jitteredColor(world.colorHex ?? "#ffffff", world.id) : DIM_COLOR;
        const position = displayPositions.get(world.id) ?? [world.posX, world.posY, world.posZ];
        return {
          world,
          baseScale,
          color,
          phase: phaseForId(world.id),
          position,
          groupKey: groupKeyFor(world),
        };
      }),
    [positioned, filters, displayPositions],
  );

  const objRefs = useRef<(Object3D | null)[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    
    for (let i = 0; i < items.length; i++) {
      const obj = objRefs.current[i];
      if (!obj) continue;
      const { baseScale, phase, position, groupKey, world } = items[i];
      const twinkle = 1 + TWINKLE_AMPLITUDE * Math.sin(t * TWINKLE_SPEED + phase);
      const selectedBoost = world.id === selectedWorldId ? SELECTED_SCALE_BOOST : 1;
      obj.scale.setScalar(baseScale * twinkle * selectedBoost);

      const [cx, cy, cz] = clusterOrbitOffset(groupKey, t);
      const [wx, wy, wz] = worldOrbitOffset(world.id, t);
      obj.position.set(position[0] + cx + wx, position[1] + cy + wy, position[2] + cz + wz);
    }
  });

  return (
    <Instances limit={Math.max(items.length, 1)} range={items.length}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial toneMapped={false} />
      {items.map(({ world, baseScale, color, position }, i) => (
        <Instance
          key={world.id}
          ref={(obj: Object3D | null) => {
            objRefs.current[i] = obj;
          }}
          position={position}
          scale={baseScale}
          color={color}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            setSelectedWorldId(world.id);
          }}
          onPointerOver={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            setHoveredWorldId(world.id);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            // Moving the pointer between two adjacent/overlapping stars can
            // fire the new star's onPointerOver before the old star's
            // onPointerOut — clearing unconditionally here would then wipe
            // out the *new* hover state, causing the label to flicker/show
            // the wrong name. Only clear if this instance is still the one
            // actually hovered.
            if (useStarfieldStore.getState().hoveredWorldId === world.id) {
              setHoveredWorldId(null);
            }
            document.body.style.cursor = "auto";
          }}
        />
      ))}
    </Instances>
  );
}
