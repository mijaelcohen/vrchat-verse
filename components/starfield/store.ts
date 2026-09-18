import { create } from "zustand";

export interface Filters {
  tags: string[];
  platform: "any" | "standalonewindows" | "android";
  search: string;
}

export const defaultFilters: Filters = {
  tags: [],
  platform: "any",
  search: "",
};

interface StarfieldState {
  selectedWorldId: string | null;
  hoveredWorldId: string | null;
  filters: Filters;
  setSelectedWorldId: (id: string | null) => void;
  setHoveredWorldId: (id: string | null) => void;
  setFilters: (filters: Partial<Filters>) => void;
  resetFilters: () => void;
}

export const useStarfieldStore = create<StarfieldState>((set) => ({
  selectedWorldId: null,
  hoveredWorldId: null,
  filters: defaultFilters,
  setSelectedWorldId: (id) => set({ selectedWorldId: id }),
  setHoveredWorldId: (id) => set({ hoveredWorldId: id }),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  resetFilters: () => set({ filters: defaultFilters }),
}));

export function worldMatchesFilters(
  world: { tags: string[]; platforms: string[]; name: string },
  filters: Filters,
): boolean {
  if (filters.tags.length > 0 && !filters.tags.every((tag) => world.tags.includes(tag))) {
    return false;
  }
  if (filters.platform !== "any" && !world.platforms.includes(filters.platform)) return false;
  if (filters.search.trim() && !world.name.toLowerCase().includes(filters.search.trim().toLowerCase())) {
    return false;
  }
  return true;
}
