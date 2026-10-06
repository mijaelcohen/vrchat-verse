import { cn } from "@/lib/utils";

export interface LegendEntry {
  color: string;
  label: string;
  count: number;
}

// Relative luminance of the dark ink colour (#062a2e) used for text on bright bars.
const INK_LUMINANCE = 0.019;

/** Picks whichever of ink or white text has more contrast on the given #rrggbb background. */
function usesLightText(hex: string): boolean {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) return false;
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(match[1].slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const contrastWithInk = (luminance + 0.05) / (INK_LUMINANCE + 0.05);
  const contrastWithWhite = 1.05 / (luminance + 0.05);
  return contrastWithWhite > contrastWithInk;
}

// Each entry is a full-width bar filled with its galaxy colour, flat on the left and
// rounded on the right like the other side-rail buttons. Raw tag names are shown without
// underscores, and the world count moves to the tooltip.
export function LcarsLegend({ entries }: { entries: LegendEntry[] }) {
  return (
    <ul className="flex flex-col gap-1 text-lcars-sub font-bold uppercase leading-[1.175]">
      {entries.map((entry, i) => (
        <li
          key={`${i}-${entry.label}`}
          title={`${entry.label}: ${entry.count} worlds`}
          className={cn(
            "flex w-full items-center rounded-r-full py-1 pr-4 pl-3 text-left [overflow-wrap:anywhere]",
            usesLightText(entry.color) ? "text-white" : "text-lcars-ink",
          )}
          style={{ backgroundColor: entry.color }}
        >
          {entry.label.replaceAll("_", " ")}
        </li>
      ))}
    </ul>
  );
}
