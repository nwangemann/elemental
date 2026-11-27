import { create } from 'zustand';
import { canAdd, carriedCounts, dropLast, type Carry, type CarryCheck } from '../core/carry.ts';
import type { Filters } from '../core/explorer.ts';
import type { Lens, LensKey } from '../core/lens.ts';

/** The tile the character stands on, as the interface needs it. */
export interface ActiveTile {
  number: number;
  name: string;
  symbol: string;
}

/** A pick-up the carry limit refused, for the tray to explain. */
export interface CarryRefusal {
  symbol: string;
  reason: Exclude<CarryCheck, 'ok'>;
}

/**
 * Combine mode (ADR 20): whether it is open, the atoms carried, oldest first, and the last
 * pick-up the carry limit refused (cleared by the next change to the carry), and which
 * isomer the formed model shows when one formula is several compounds (null: the most
 * everyday; kept across carries, and ignored while it is not one of the matches).
 */
export interface CombineState {
  open: boolean;
  carry: Carry;
  refused: CarryRefusal | null;
  pick: string | null;
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
  /** Sets the property the tiles' heights show (null = flat); the scene eases them there. */
  setLensHeight: (height: LensKey | null) => void;
  /** Sets the property the tiles' colours show (null = family colours); the scene eases them. */
  setLensColour: (colour: LensKey | null) => void;
  /** Sets the temperature lens in kelvin (null = off); the scene shows each element's state there. */
  setLensTemperature: (temperature: number | null) => void;
  /** Sets the discovery lens's year (null = off, `ANTIQUITY` for the stop); later elements sink. */
  setLensYear: (year: number | null) => void;
  /** Combine mode. Opening it the first time loads its chunk; closing keeps what is carried. */
  combine: CombineState;
  setCombineOpen: (open: boolean) => void;
  /** Picks up one atom of `symbol` (C or the panel's Add), opening Combine; the carry limit may refuse it. */
  pickUpAtom: (symbol: string) => void;
  /** Drops the last atom picked up (Backspace). */
  dropLastAtom: () => void;
  /** Sets the whole carry (the tray's steppers, Clear and Fill in). */
  setCarry: (carry: Carry) => void;
  /** Chooses which isomer the formed model shows (the tray's buttons when several match). */
  setFormPick: (pick: string | null) => void;
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
    temperature: null,
    year: null,
    filters: { category: null, state: null, block: null, period: null, group: null },
  },
  setLensFilters: (filters) => set((s) => ({ lens: { ...s.lens, filters } })),
  setLensHeight: (height) =>
    set((s) => (s.lens.height === height ? s : { lens: { ...s.lens, height } })),
  setLensColour: (colour) =>
    set((s) => (s.lens.colour === colour ? s : { lens: { ...s.lens, colour } })),
  setLensTemperature: (temperature) =>
    set((s) => (s.lens.temperature === temperature ? s : { lens: { ...s.lens, temperature } })),
  setLensYear: (year) => set((s) => (s.lens.year === year ? s : { lens: { ...s.lens, year } })),
  combine: { open: false, carry: [], refused: null, pick: null },
  setCombineOpen: (open) =>
    set((s) => (s.combine.open === open ? s : { combine: { ...s.combine, open } })),
  pickUpAtom: (symbol) =>
    set((s) => {
      const reason = canAdd(carriedCounts(s.combine.carry), symbol);
      return {
        combine:
          reason === 'ok'
            ? { ...s.combine, open: true, carry: [...s.combine.carry, symbol], refused: null }
            : { ...s.combine, open: true, refused: { symbol, reason } },
      };
    }),
  dropLastAtom: () =>
    set((s) =>
      s.combine.carry.length === 0
        ? s
        : { combine: { ...s.combine, carry: dropLast(s.combine.carry), refused: null } },
    ),
  setCarry: (carry) => set((s) => ({ combine: { ...s.combine, carry, refused: null } })),
  setFormPick: (pick) =>
    set((s) => (s.combine.pick === pick ? s : { combine: { ...s.combine, pick } })),
}));
