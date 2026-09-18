import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const fieldStyles =
  "w-full rounded-full border-0 bg-lcars-deep px-4 py-1.5 text-sm uppercase text-lcars-ice placeholder:text-lcars-ice/60";

export function LcarsField({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldStyles, className)} {...props} />;
}

export function LcarsSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldStyles, "cursor-pointer", className)} {...props} />;
}
