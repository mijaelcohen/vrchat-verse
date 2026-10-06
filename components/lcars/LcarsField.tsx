import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Same pill as the buttons, sized like the site's accordion bar (2.75rem tall,
// 1.5rem side padding). Text is left-aligned and vertically centred here since
// it's typed into, rather than pinned to the corner like a button label.
const fieldStyles =
  "min-h-[2.75rem] w-full rounded-full border-0 bg-lcars-deep px-6 text-lcars-body uppercase text-lcars-ice placeholder:text-lcars-ice/60";

export function LcarsField({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldStyles, className)} {...props} />;
}

export function LcarsSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldStyles, "cursor-pointer", className)} {...props} />;
}
