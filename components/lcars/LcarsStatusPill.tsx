import { LcarsBar } from "./LcarsBar";

export function LcarsStatusPill({
  dataAsOf,
  worldCount,
}: {
  dataAsOf: string | null;
  worldCount: number;
}) {
  return (
    <LcarsBar variant="deep" cap="left" className="text-xs">
      {worldCount.toLocaleString()} worlds · data as of{" "}
      {dataAsOf ? new Date(dataAsOf).toLocaleString() : "never (no successful sync yet)"}
    </LcarsBar>
  );
}
