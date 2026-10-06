import { LcarsBar } from "./LcarsBar";

export function LcarsStatusPill({
  dataAsOf,
  worldCount,
}: {
  dataAsOf: string | null;
  worldCount: number;
}) {
  return (
    <LcarsBar variant="deep" size="lg" cap="left" className="w-auto text-balance">
      {worldCount.toLocaleString()} worlds · data as of{" "}
      {dataAsOf ? new Date(dataAsOf).toLocaleString() : "never (no successful sync yet)"}
    </LcarsBar>
  );
}
