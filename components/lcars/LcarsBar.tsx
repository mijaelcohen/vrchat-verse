import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const barStyles = cva("inline-flex items-center px-4 py-1.5 text-sm uppercase leading-none", {
  variants: {
    variant: {
      teal: "bg-lcars-teal text-lcars-ink",
      deep: "bg-lcars-deep text-lcars-ice",
      ice: "bg-lcars-ice text-lcars-ink",
      amber: "bg-lcars-amber text-lcars-ink",
      alert: "bg-lcars-alert text-lcars-ink",
    },
    cap: {
      none: "rounded-none",
      left: "rounded-l-full pl-5",
      right: "rounded-r-full pr-5",
      both: "rounded-full px-5",
    },
  },
  defaultVariants: { variant: "teal", cap: "right" },
});

export type LcarsBarProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof barStyles>;

export function LcarsBar({ variant, cap, className, ...props }: LcarsBarProps) {
  return <div className={cn(barStyles({ variant, cap }), className)} {...props} />;
}
