"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Box3, Vector3, type Group } from "three";

// Sketchfab "Download 3D Model" → glTF, unzipped into this folder.
export const WORLD_LOADER_MODEL_URL = "/models/uganda-knuckles/scene.gltf";

// Longest side of the model after normalising, in scene units. The camera
// below is placed so this just fills the frame regardless of the source scale.
const TARGET_SIZE = 2;
const SPIN_RADIANS_PER_SECOND = 2.2;

function SpinningModel() {
  const { scene } = useGLTF(WORLD_LOADER_MODEL_URL);
  const spinRef = useRef<Group>(null);
  const reducedMotion = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  // Clone so the cached glTF scene stays untouched, then centre the clone on
  // the origin so the group below spins it around its own vertical axis.
  const { object, scale } = useMemo(() => {
    const clone = scene.clone(true);
    const box = new Box3().setFromObject(clone);
    const size = box.getSize(new Vector3());
    clone.position.sub(box.getCenter(new Vector3()));
    return { object: clone, scale: TARGET_SIZE / Math.max(size.x, size.y, size.z, 1e-6) };
  }, [scene]);

  useFrame((_, delta) => {
    if (!reducedMotion && spinRef.current) spinRef.current.rotation.y += delta * SPIN_RADIANS_PER_SECOND;
  });

  return (
    <group ref={spinRef} scale={scale}>
      <primitive object={object} />
    </group>
  );
}

export function WorldLoaderCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0.35, 3.4], fov: 35 }}
      dpr={[1, 2]}
      gl={{ alpha: true }}
      aria-hidden
    >
      {/* Teal key light and amber rim echo the LCARS palette. */}
      <hemisphereLight args={["#a9e4ea", "#062a2e", 1.4]} />
      <directionalLight position={[3, 4, 5]} intensity={2.2} color="#ffffff" />
      <directionalLight position={[-4, 1, -3]} intensity={1.2} color="#e0a050" />
      <Suspense fallback={null}>
        <SpinningModel />
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload(WORLD_LOADER_MODEL_URL);
