export interface LegendEntry {
  color: string;
  label: string;
  count: number;
}

export function LcarsLegend({ entries }: { entries: LegendEntry[] }) {
  return (
    <ul className="flex flex-col gap-1 text-xs uppercase">
      {entries.map((entry, i) => (
        <li key={`${i}-${entry.label}`} className="flex items-stretch gap-1.5">
          <span className="w-4 shrink-0 rounded-l-full" style={{ backgroundColor: entry.color }} aria-hidden />
          <span className="truncate text-lcars-ice">{entry.label}</span>
          <span className="ml-auto shrink-0 font-mono text-lcars-teal">{entry.count}</span>
        </li>
      ))}
    </ul>
  );
}
