import { create } from 'zustand';
import type { Filters } from '../core/explorer.ts';
import type { Lens } from '../core/lens.ts';

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
  /**
   * True when the player closed the panel (Esc) while standing on a tile. Entering another tile
   * opens it again; Enter or Space reopens it on the same tile.
   */
  panelClosed: boolean;
  setPanelClosed: (closed: boolean) => void;
  /** Atomic number of the last tile the character stood on, kept while it is off the table. */
  lastTile: number | null;
  /** True while the character is on the ground beside the table (ADR 0009), not on a tile. */
  offTable: boolean;
  setOffTable: (off: boolean) => void;
  /** The latest request to walk back to `lastTile` (R, Home or the button); the scene carries it out. */
  returnSeq: number;
  requestReturn: () => void;
  /**
   * How the table is read (`core/lens.ts`): the property each lens shows, and the explorer's
   * filters, which dim the tiles they exclude. Changes only when the player changes them.
   */
  lens: Lens;
  setLensFilters: (filters: Filters) => void;
}

/**
 * App-wide state shared by the scene and the DOM interface. The scene writes it only when
 * something changes (entering or leaving a tile), never every frame. Components read it with
 * `useAppStore(selector)`; non-React code can `useAppStore.subscribe` for enter/leave events.
 */
export const useAppStore = create<AppState>()((set) => ({
  activeTile: null,
  setActiveTile: (activeTile) =>
    set((s) => ({
      activeTile,
      lastTile: activeTile?.number ?? s.lastTile,
      panelClosed: activeTile?.number === s.activeTile?.number ? s.panelClosed : false,
    })),
  flight: null,
  flyTo: (number) => set((s) => ({ flight: { number, seq: (s.flight?.seq ?? 0) + 1 } })),
  panelClosed: false,
  setPanelClosed: (panelClosed) => set({ panelClosed }),
  lastTile: null,
  offTable: false,
  setOffTable: (offTable) => set({ offTable }),
  returnSeq: 0,
  requestReturn: () => set((s) => ({ returnSeq: s.returnSeq + 1 })),
  // Written out rather than `NO_LENS`, so the shell does not pull in the lens and explorer code.
  lens: {
    height: null,
    colour: null,
    filters: { category: null, state: null, block: null, period: null, group: null },
  },
  setLensFilters: (filters) => set((s) => ({ lens: { ...s.lens, filters } })),
}));
