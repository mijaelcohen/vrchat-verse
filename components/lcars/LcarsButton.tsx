"use client";

import type { ButtonHTMLAttributes } from "react";
import type { VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { barStyles } from "./LcarsBar";
import { useLcarsSound } from "./useLcarsSound";

type Props = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof barStyles> & {
    /** Toggle state: active buttons use the bright variant, inactive ones sit back in deep teal. */
    active?: boolean;
    silent?: boolean;
  };

export function LcarsButton({
  variant,
  // Buttons default to the site's full-size nav pill; pass size="sm" for chips and toggles.
  size = "lg",
  cap = "both",
  active,
  silent,
  className,
  onClick,
  onPointerEnter,
  type = "button",
  ...props
}: Props) {
  const sound = useLcarsSound();
  const resolved = variant ?? (active === undefined || active ? "teal" : "deep");

  return (
    <button
      type={type}
      aria-pressed={active}
      className={cn(
        barStyles({ variant: resolved, size, cap }),
        "cursor-pointer transition-[filter] hover:brightness-115 active:brightness-85",
        className,
      )}
      onPointerEnter={(e) => {
        if (!silent) sound.play("hover");
        onPointerEnter?.(e);
      }}
      onClick={(e) => {
        if (!silent) sound.play("select");
        onClick?.(e);
      }}
      {...props}
    />
  );
}
