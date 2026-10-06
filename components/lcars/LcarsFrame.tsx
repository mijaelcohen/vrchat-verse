import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LcarsBar } from "./LcarsBar";

// Left rail of the detail column: the elbows, the strip between them and the footer's
// corner all share this width, so they read as one continuous border.
const railWidth = "w-[calc(var(--lcars-radius-content)*1.5)] md:w-(--lcars-rail-w)";

// Right-hand strip and corner block framing the filter panel and the star map.
const edgeWidth = "w-8 md:w-12";

/**
 * Layout A: map + filter rail in a ~34% left column, detail in the dominant right column.
 * Below `md` everything stacks and the frame scrolls.
 */
export function LcarsFrame({
  rail,
  map,
  detail,
  legend,
  footer,
}: {
  rail: ReactNode;
  map: ReactNode;
  detail: ReactNode;
  /** Galaxy colour key, shown inside the left rail of the detail column (md and up). */
  legend: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid h-dvh w-full grid-cols-1 gap-2 overflow-y-auto bg-lcars-void p-2 md:grid-cols-[minmax(0,34fr)_minmax(0,66fr)] md:overflow-hidden">
      <div className="flex flex-col gap-2 md:h-full md:min-h-0">
        <LcarsBar cap="right" className="self-start">
          Search a VRChat World
        </LcarsBar>
        <div className="flex max-h-[30dvh] min-h-0 shrink-0 flex-col gap-2 md:max-h-[42%]">
          <div className="flex min-h-0 flex-1">
            <div className="min-w-0 flex-1 overflow-y-auto">{rail}</div>
            <div className={cn(edgeWidth, "shrink-0 bg-lcars-amber")} aria-hidden />
          </div>
          <div className="flex gap-2" aria-hidden>
            <div className="h-6 flex-1 bg-lcars-amber" />
            <div className={cn(edgeWidth, "h-6 shrink-0 rounded-br-(--lcars-radius-content) bg-lcars-amber")} />
          </div>
        </div>
        <div className="flex h-[40dvh] min-h-0 flex-col gap-2 md:h-auto md:flex-1">
          <div className="flex gap-2" aria-hidden>
            <div className="h-3 flex-1 bg-lcars-amber" />
            <div className={cn(edgeWidth, "h-3 shrink-0 rounded-tr-(--lcars-radius-content) bg-lcars-amber")} />
          </div>
          <div className="flex min-h-0 flex-1">
            <div className="relative min-w-0 flex-1 overflow-hidden bg-[#05070f]">{map}</div>
            <div className={cn(edgeWidth, "shrink-0 bg-lcars-amber")} aria-hidden />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 md:h-full md:min-h-0">
        <div className="flex gap-2">
          <div className={cn(railWidth, "flex shrink-0 items-end justify-end rounded-tl-(--lcars-radius-content) bg-lcars-deep")}>
            <h2
              id="galaxies-title"
              className="hidden pr-4 pb-[0.4rem] text-lcars-sub font-bold uppercase leading-[1.175] text-lcars-ice md:block"
            >
              Galaxies
            </h2>
          </div>
          <LcarsBar cap="none" className="flex-1">
            World detail
          </LcarsBar>
        </div>
        <div className="flex min-h-0 flex-1">
          <aside
            aria-labelledby="galaxies-title"
            className={cn(railWidth, "shrink-0 overflow-y-auto bg-lcars-deep")}
          >
            <div className="hidden p-2 md:block">{legend}</div>
          </aside>
          <div className="min-w-0 flex-1 md:overflow-y-auto">{detail}</div>
        </div>
        <div className="flex gap-2">
          <div className={cn(railWidth, "shrink-0 rounded-bl-(--lcars-radius-content) bg-lcars-deep")} aria-hidden />
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 md:flex-nowrap">
            {/* -mr-2 cancels the row gap so the bar runs straight into the first footer item. */}
            <div className="-mr-2 min-w-0 flex-1 self-stretch bg-lcars-deep" aria-hidden />
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
}
