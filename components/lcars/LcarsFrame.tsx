import type { ReactNode } from "react";
import { LcarsBar } from "./LcarsBar";

/**
 * Layout A: map + filter rail in a ~34% left column, detail in the dominant right column.
 * Below `md` everything stacks and the frame scrolls.
 */
export function LcarsFrame({
  rail,
  map,
  detail,
  footer,
}: {
  rail: ReactNode;
  map: ReactNode;
  detail: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid h-dvh w-full grid-cols-1 gap-2 overflow-y-auto bg-lcars-void p-2 md:grid-cols-[minmax(0,34fr)_minmax(0,66fr)] md:overflow-hidden">
      <div className="flex min-h-0 flex-col gap-2 md:h-full">
        <LcarsBar cap="right" className="self-start">
          Starfield · filters
        </LcarsBar>
        <div className="max-h-[30dvh] min-h-0 shrink-0 overflow-y-auto md:max-h-[42%]">{rail}</div>
        <div className="relative h-[40dvh] min-h-0 overflow-hidden rounded-bl-[36px] border border-lcars-deep bg-[#05070f] md:h-auto md:flex-1">
          {map}
        </div>
        <LcarsBar variant="deep" cap="right" className="self-start text-xs">
          Star map
        </LcarsBar>
      </div>

      <div className="flex min-h-0 flex-col gap-2 md:h-full">
        <div className="flex gap-2">
          <div className="w-16 shrink-0 rounded-tl-[36px] bg-lcars-deep" aria-hidden />
          <LcarsBar cap="none" className="flex-1">
            World detail
          </LcarsBar>
        </div>
        <div className="min-h-0 flex-1 md:overflow-y-auto">{detail}</div>
        <div className="flex flex-wrap items-center justify-end gap-2">{footer}</div>
      </div>
    </div>
  );
}
