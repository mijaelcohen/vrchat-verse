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
        barStyles({ variant: resolved, cap }),
        "cursor-pointer transition-[filter] hover:brightness-125 active:brightness-90",
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
