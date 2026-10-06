import { cx, type CxOptions } from "class-variance-authority";
import { extendTailwindMerge } from "tailwind-merge";

// Without this, tailwind-merge can't tell our custom `text-lcars-*` font sizes (see
// globals.css) from `text-lcars-ink`-style colors, and would drop one when merging.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["lcars-sub", "lcars-body", "lcars-h1", "lcars-h2", "lcars-h3", "lcars-h4", "lcars-banner"],
    },
  },
});

export function cn(...inputs: CxOptions): string {
  return twMerge(cx(inputs));
}
