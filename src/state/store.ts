import { create } from 'zustand';

/** The tile the character stands on, as the interface needs it. */
export interface ActiveTile {
  number: number;
  name: string;
}

/** A request to put the character on a tile at once. `seq` makes repeat requests distinct. */
export interface Flight {
  number: number;
  seq: number;
}

export interface AppState {
  /** The tile under the character, or null between tiles and off the table. */
  activeTile: ActiveTile | null;
  setActiveTile: (tile: ActiveTile | null) => void;
  /** The latest fly-to request from the explorer or a deep link; the scene carries it out. */
  flight: Flight | null;
  flyTo: (number: number) => void;
}

/**
 * App-wide state shared by the scene and the DOM interface. The scene writes it only when
 * something changes (entering or leaving a tile), never every frame. Components read it with
 * `useAppStore(selector)`; non-React code can `useAppStore.subscribe` for enter/leave events.
 */
export const useAppStore = create<AppState>()((set) => ({
  activeTile: null,
  setActiveTile: (activeTile) => set({ activeTile }),
  flight: null,
  flyTo: (number) => set((s) => ({ flight: { number, seq: (s.flight?.seq ?? 0) + 1 } })),
}));
