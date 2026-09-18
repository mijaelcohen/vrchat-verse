import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function LcarsReadout({
  items,
  className,
}: {
  items: { label: string; value: ReactNode }[];
  className?: string;
}) {
  return (
    <dl className={cn("flex flex-col text-sm uppercase", className)}>
      {items.map(({ label, value }) => (
        <div key={label} className="flex items-baseline justify-between gap-4 border-b border-lcars-line py-1.5">
          <dt className="text-lcars-teal">{label}</dt>
          <dd className="font-mono text-lcars-ice tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
