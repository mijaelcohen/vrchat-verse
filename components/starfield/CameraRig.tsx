"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { WorldSummaryDTO } from "@/lib/types";
import { computeSpreadPositions } from "./layout";
import { useStarfieldStore } from "./store";

// How far the camera sits from a focused world once centered on screen.
// Clusters now have a wider footprint (INTRA_CLUSTER_SPREAD in layout.ts),
// so this is larger than a single world would need, to show some
// surrounding context rather than sitting inside the cluster's stars.
export const FOCUS_DISTANCE = 58;
const ANIMATION_DURATION = 0.6; // seconds

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

interface Animation {
  startTarget: Vector3;
  startPos: Vector3;
  endTarget: Vector3;
  endPos: Vector3;
  elapsed: number;
}

export function CameraRig({
  worlds,
  controlsRef,
}: {
  worlds: WorldSummaryDTO[];
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();
  const selectedWorldId = useStarfieldStore((s) => s.selectedWorldId);
  const animation = useRef<Animation | null>(null);
  // Only the very first focus uses FOCUS_DISTANCE as a default entry zoom;
  // every subsequent world change (click or arrow key) keeps whatever
  // distance the camera is already at, including manual scroll-zoom.
  const hasFocusedOnce = useRef(false);

  // Mirrors WorldPoints' display transform so the camera focuses on the
  // world's actual on-screen position, not its raw pre-spread DB position.
  const displayPositions = useMemo(() => computeSpreadPositions(worlds), [worlds]);

  useEffect(() => {
    if (!selectedWorldId) return;
    const position = displayPositions.get(selectedWorldId);
    if (!position) return;
    const controls = controlsRef.current;
    if (!controls) return;

    const endTarget = new Vector3(...position);
    const startTarget = controls.target.clone();
    const startPos = camera.position.clone();

    // Preserve the camera's current viewing angle — just dolly to the target
    // distance from the newly-focused world so it lands centered on screen.
    const viewDir = startPos.clone().sub(startTarget);
    const currentDistance = viewDir.length();
    if (currentDistance < 1e-6) viewDir.set(0, 0, 1);
    viewDir.normalize();
    const distance = hasFocusedOnce.current ? currentDistance : FOCUS_DISTANCE;
    hasFocusedOnce.current = true;
    const endPos = endTarget.clone().add(viewDir.multiplyScalar(distance));

    animation.current = { startTarget, startPos, endTarget, endPos, elapsed: 0 };
  }, [selectedWorldId, displayPositions, camera, controlsRef]);

  useFrame((_, delta) => {
    const anim = animation.current;
    const controls = controlsRef.current;
    if (!anim || !controls) return;

    anim.elapsed += delta;
    const t = Math.min(1, anim.elapsed / ANIMATION_DURATION);
    const eased = easeOutCubic(t);

    controls.target.lerpVectors(anim.startTarget, anim.endTarget, eased);
    camera.position.lerpVectors(anim.startPos, anim.endPos, eased);
    controls.update();

    if (t >= 1) animation.current = null;
  });

  return null;
}
