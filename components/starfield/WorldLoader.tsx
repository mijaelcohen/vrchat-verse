"use client";

import dynamic from "next/dynamic";
import { Component, type ReactNode } from "react";

// Three.js touches window/WebGL — must never attempt to render during SSR.
const WorldLoaderCanvas = dynamic(() => import("./WorldLoaderCanvas").then((mod) => mod.WorldLoaderCanvas), {
  ssr: false,
});

// If the model file is missing or WebGL is unavailable the spinner simply
// disappears and the "Accessing record…" text below carries the loading state.
class ModelBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function WorldLoader() {
  return (
    <div role="status" className="flex flex-col items-center gap-2 py-4">
      <div className="h-44 w-full max-w-xs">
        <ModelBoundary>
          <WorldLoaderCanvas />
        </ModelBoundary>
      </div>
      <p className="text-lcars-body uppercase text-lcars-teal">Accessing record…</p>
      <p className="text-lcars-sub uppercase text-lcars-ice/60">
        Model:{" "}
        <a
          href="https://sketchfab.com/3d-models/uganda-knuckles-4038bc3ae5cf4fe0bc93d194883ec151"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-lcars-ice"
        >
          Uganda-knuckles
        </a>{" "}
        by NonoSquare11 · CC BY
      </p>
    </div>
  );
}
