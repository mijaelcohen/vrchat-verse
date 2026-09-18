"use client";

import { useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { WorldSummaryDTO } from "@/lib/types";
import { clusterOrbitOffset, computeSpreadPositions, groupKeyFor, worldOrbitOffset } from "./layout";
import { useStarfieldStore } from "./store";

// Degrees between adjacent letters around the ring. Fixed (rather than
// spreading the whole name across a full circle) so short and long names
// both read at a normal, legible size instead of short names being
// stretched thin.
const DEGREES_PER_CHAR = 16;
const RING_SPIN_SPEED = 20; // degrees/sec
const RING_RADIUS_PX = 42;
const RING_PERSPECTIVE_PX = 260;
// Caps how far the name is allowed to wrap around the ring. Without a cap, a
// long name's letters (length * DEGREES_PER_CHAR > 360deg) would wrap past a
// full turn and start overlapping their own earlier letters. A little short
// of 360deg so the first and last letters never sit flush against each other.
const MAX_RING_DEGREES = 340;
const MAX_NAME_CHARS = Math.floor(MAX_RING_DEGREES / DEGREES_PER_CHAR);

function truncateForRing(name: string): string {
  if (name.length <= MAX_NAME_CHARS) return name;
  return `${name.slice(0, MAX_NAME_CHARS - 1).trimEnd()}…`;
}

// Only the hovered/selected world gets a name tag — showing every world's
// name at once (even distance-culled) got crowded and overlapping in a
// dense cluster. At most one label is ever mounted this way, so it's also
// free of the earlier performance/crash concerns around rendering many
// labels. Hover takes priority over selection when both are set.
//
// The name is laid out as a real 3D drum of letters (CSS rotateY +
// translateZ, like Universal Studios' arched wordmark carried all the way
// around a cylinder) that spins around the star, rather than flat 2D text.
// An actual WebGL text mesh (drei's Text/troika) was tried here first, but
// its SDF font-atlas generation reliably crashed the WebGL context in
// testing — this CSS-based approach gets real depth (near letters read
// larger, far letters rotate out of view via backface-visibility) without
// that risk.
export function WorldLabels({ worlds }: { worlds: WorldSummaryDTO[] }) {
  const hoveredWorldId = useStarfieldStore((s) => s.hoveredWorldId);
  const selectedWorldId = useStarfieldStore((s) => s.selectedWorldId);
  const activeWorldId = hoveredWorldId ?? selectedWorldId;
  const displayPositions = useMemo(() => computeSpreadPositions(worlds), [worlds]);

  const hovered = useMemo(() => {
    if (!activeWorldId) return null;
    const world = worlds.find((w) => w.id === activeWorldId);
    const position = world && displayPositions.get(activeWorldId);
    if (!world || !position) return null;
    return {
      world,
      position,
      groupKey: groupKeyFor(world),
    };
  }, [activeWorldId, worlds, displayPositions]);

  const groupRef = useRef<Group>(null);
  const drumRef = useRef<HTMLDivElement>(null);

  // The star itself drifts every frame (see clusterOrbitOffset/worldOrbitOffset
  // in WorldPoints), so the label is re-positioned imperatively each frame
  // too — otherwise it visibly detaches from the marker it's naming. The
  // letter drum's spin is also driven imperatively (a CSS transform written
  // straight to the DOM node) so it stays smooth without a React re-render
  // every frame.
  useFrame((state) => {
    if (!hovered || !groupRef.current) return;
    const t = state.clock.elapsedTime;
    const [cx, cy, cz] = clusterOrbitOffset(hovered.groupKey, t);
    const [wx, wy, wz] = worldOrbitOffset(hovered.world.id, t);
    groupRef.current.position.set(
      hovered.position[0] + cx + wx,
      hovered.position[1] + cy + wy,
      hovered.position[2] + cz + wz,
    );
    if (drumRef.current) {
      drumRef.current.style.transform = `rotateY(${(t * RING_SPIN_SPEED) % 360}deg)`;
    }
  });

  if (!hovered) return null;

  const displayName = truncateForRing(hovered.world.name);
  const backdropDiameter = (RING_RADIUS_PX + 14) * 2;

  return (
    <group ref={groupRef}>
      {/* drei's Html only honors the `pointerEvents` prop in `transform`
          mode — we're not using that mode, so it's set via `style` instead.
          Without this, the label's wrapper div (a real DOM node stacked
          on top of the canvas) intercepts pointer events itself, which
          swallows hover/click on the star underneath it. */}
      <Html center distanceFactor={12} style={{ pointerEvents: "none" }}>
        <div style={{ position: "relative", width: 0, height: 0 }}>
          {/* A soft, non-rotating dark disc behind the letters — without it
              the light text washes out against bright clustered stars. */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: `${backdropDiameter}px`,
              height: `${backdropDiameter}px`,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              background: "radial-gradient(closest-side, rgba(5,7,15,0.7), rgba(5,7,15,0) 75%)",
            }}
          />
          <div style={{ perspective: `${RING_PERSPECTIVE_PX}px` }}>
            <div
              ref={drumRef}
              style={{
                position: "relative",
                width: 0,
                height: 0,
                transformStyle: "preserve-3d",
              }}
            >
              {[...displayName].map((ch, i) => {
                const angle = i * DEGREES_PER_CHAR;
                return (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      transformStyle: "preserve-3d",
                      transform: `rotateY(${angle}deg) translateZ(${RING_RADIUS_PX}px)`,
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        transform: "translate(-50%, -50%)",
                        fontSize: "13px",
                        fontWeight: 600,
                        fontFamily: "system-ui, sans-serif",
                        color: "#f8fafc",
                        // Stacks shadows in every direction to fake a solid
                        // outline/stroke — plain blur alone got lost against
                        // busy, brightly-colored star clusters.
                        textShadow: [
                          "0 0 3px rgba(0,0,0,0.95)",
                          "1px 1px 1px rgba(0,0,0,0.95)",
                          "-1px 1px 1px rgba(0,0,0,0.95)",
                          "1px -1px 1px rgba(0,0,0,0.95)",
                          "-1px -1px 1px rgba(0,0,0,0.95)",
                        ].join(", "),
                        backfaceVisibility: "hidden",
                      }}
                    >
                      {ch === " " ? " " : ch}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Html>
    </group>
  );
}
