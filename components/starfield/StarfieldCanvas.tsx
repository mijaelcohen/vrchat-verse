"use client";

import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { WorldSummaryDTO } from "@/lib/types";
import { WorldPoints } from "./WorldPoints";
import { CameraRig } from "./CameraRig";
import { WorldLabels } from "./WorldLabels";
import { ANCHOR_RADIUS } from "./layout";

// Clusters are now spread across a sphere of ANCHOR_RADIUS — the camera/
// starfield/orbit-limits below are sized off that so the whole layout is
// visible on load and Stars still forms a backdrop well beyond it.
const OVERVIEW_DISTANCE = ANCHOR_RADIUS * 3.2;

export function StarfieldCanvas({ worlds }: { worlds: WorldSummaryDTO[] }) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  return (
    <Canvas
      camera={{ position: [0, 0, OVERVIEW_DISTANCE], far: 4000 }}
      style={{ background: "#05070f" }}
    >
      <ambientLight intensity={0.6} />

      {/* Dense, mostly-static background layer. */}
      <Stars radius={ANCHOR_RADIUS * 6} depth={80} count={6000} factor={4} fade speed={0.1} />
      {/* Smaller accent layer that visibly twinkles, layered on top. */}
      <Stars radius={ANCHOR_RADIUS * 5.5} depth={60} count={500} factor={5} fade speed={1.2} />

      <WorldPoints worlds={worlds} />
      <WorldLabels worlds={worlds} />
      <CameraRig worlds={worlds} controlsRef={controlsRef} />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        minDistance={5}
        maxDistance={ANCHOR_RADIUS * 15}
      />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.9}
          luminanceSmoothing={0.15}
          intensity={0.4}
          radius={0.35}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
