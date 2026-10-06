import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Shape and label metrics follow thelcars.com's buttons: the label is bold,
 * uppercase, line-height 1.175 and pinned to the bottom of the shape rather than
 * centred in it.
 *
 * - `size="lg"` is the site's nav button: fixed width, height = width / 2.8
 *   (see --lcars-btn-* in globals.css), 1.5rem side padding, 0.7rem bottom padding.
 * - `size="sm"` is a compact version of the same shape for chips, tags and labels.
 * - `cap="both"` is the full pill, label bottom-right. `cap="right"` is the
 *   flat-side button: flat left edge with a black stripe, label bottom-left.
 *   `cap="left"` mirrors it. `cap="none"` is a square block, label bottom-right.
 */
export const barStyles = cva(
  "relative inline-flex max-w-full select-none flex-col justify-end font-bold uppercase leading-[1.175] [overflow-wrap:anywhere]",
  {
    variants: {
      variant: {
        teal: "bg-lcars-teal text-lcars-ink",
        deep: "bg-lcars-deep text-lcars-ice",
        ice: "bg-lcars-ice text-lcars-ink",
        amber: "bg-lcars-amber text-lcars-ink",
        alert: "bg-lcars-alert text-lcars-ink",
      },
      size: {
        lg: "h-(--lcars-btn-h) w-(--lcars-btn-w) pb-(--lcars-btn-pad-b) text-(length:--lcars-btn-font)",
        sm: "min-h-[2.25rem] pb-[0.4rem] text-lcars-sub",
      },
      cap: {
        both: "items-end rounded-full text-right",
        none: "items-end rounded-none text-right",
        right: "items-start rounded-r-full text-left before:absolute before:inset-y-0 before:bg-black",
        left: "items-end rounded-l-full text-right before:absolute before:inset-y-0 before:bg-black",
      },
    },
    compoundVariants: [
      { size: "lg", cap: ["both", "none"], class: "px-(--lcars-btn-pad-x)" },
      { size: "sm", cap: ["both", "none"], class: "px-4" },
      { size: "lg", cap: "right", class: "pl-[2.9rem] pr-4 before:left-[1.4rem] before:w-3" },
      { size: "sm", cap: "right", class: "pl-[2rem] pr-4 before:left-[0.9rem] before:w-2" },
      { size: "lg", cap: "left", class: "pl-4 pr-[2.9rem] before:right-[1.4rem] before:w-3" },
      { size: "sm", cap: "left", class: "pl-4 pr-[2rem] before:right-[0.9rem] before:w-2" },
    ],
    defaultVariants: { variant: "teal", size: "sm", cap: "right" },
  },
);

export type LcarsBarProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof barStyles>;

export function LcarsBar({ variant, size, cap, className, ...props }: LcarsBarProps) {
  return <div className={cn(barStyles({ variant, size, cap }), className)} {...props} />;
}
