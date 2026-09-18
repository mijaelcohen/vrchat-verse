export function DataAsOfBadge({
  dataAsOf,
  worldCount,
}: {
  dataAsOf: string | null;
  worldCount: number;
}) {
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-md bg-black/60 px-3 py-1.5 text-xs text-zinc-400 backdrop-blur">
      {worldCount.toLocaleString()} worlds · data as of{" "}
      {dataAsOf ? new Date(dataAsOf).toLocaleString() : "never (no successful sync yet)"}
    </div>
  );
}
