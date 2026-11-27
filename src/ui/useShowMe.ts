import { useCallback, useEffect, useRef, useState } from 'react';
import type { Compound } from '../core/compounds/index.ts';
import { ELEMENTS } from '../core/elements/index.ts';
import { TILES } from '../core/layout.ts';
import { tourMove, tourStops } from '../core/tour.ts';
import { useAppStore } from '../state/store.ts';

const NUMBERS = new Map(ELEMENTS.map((e) => [e.symbol, { number: e.number }]));
const reducedMotion = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A stop the figure has not reached in this long is flown to instead (a walk that got stuck). */
const STUCK_MS = 8_000;
/** Pause on arriving before the first pick-up, and between atoms, so each orb reads. */
const ARRIVE_MS = 300;
const PICK_MS = 180;

/**
 * Show me (ADR 20): clears the carry, then takes the figure to each of a compound's elements
 * (`core/tour.ts`: a walk when near, a flight when far or with reduced motion), waits until it
 * stands on the tile, and picks up the atoms there one by one. A carryable compound then forms
 * as if walked; `onDone` runs at the end either way (the tray opens the card for one too big to
 * carry). A key press or a pointer press outside the Combine tray stops the tour, as does
 * `stop()`; what was picked up stays carried. Timers and store subscriptions, never frame code.
 */
export function useShowMe(onDone: (compound: Compound) => void) {
  const [touring, setTouring] = useState<Compound | null>(null);
  const cancel = useRef<(() => void) | null>(null);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  const stop = useCallback(() => {
    cancel.current?.();
    cancel.current = null;
    setTouring(null);
  }, []);
  useEffect(() => stop, [stop]);

  const start = useCallback(
    (compound: Compound) => {
      cancel.current?.();
      let cancelled = false;
      const timers = new Set<ReturnType<typeof setTimeout>>();
      let unsubscribe = () => {};
      const later = (ms: number, fn: () => void) => {
        const t = setTimeout(() => {
          timers.delete(t);
          fn();
        }, ms);
        timers.add(t);
      };
      const wait = (ms: number) => new Promise<void>((resolve) => later(ms, resolve));
      const arrive = (number: number) =>
        new Promise<void>((resolve) => {
          if (useAppStore.getState().activeTile?.number === number) {
            resolve();
            return;
          }
          unsubscribe = useAppStore.subscribe((s) => {
            if (s.activeTile?.number !== number) return;
            unsubscribe();
            resolve();
          });
          later(STUCK_MS, () => useAppStore.getState().flyTo(number));
        });
      const interrupt = (e: Event) => {
        if (e.target instanceof Element && e.target.closest('.combine-tray')) return;
        stop();
      };
      cancel.current = () => {
        cancelled = true;
        unsubscribe();
        for (const t of timers) clearTimeout(t);
        window.removeEventListener('keydown', interrupt, true);
        window.removeEventListener('pointerdown', interrupt, true);
      };
      window.addEventListener('keydown', interrupt, true);
      window.addEventListener('pointerdown', interrupt, true);
      setTouring(compound);

      const run = async () => {
        const store = useAppStore.getState();
        store.setCarry([]);
        for (const s of tourStops(compound, NUMBERS)) {
          const here = useAppStore.getState().activeTile;
          const from = here ? TILES[here.number - 1] : undefined;
          const to = TILES[s.number - 1];
          if (!to) continue;
          const move = tourMove(from ?? null, to, reducedMotion());
          if (move === 'walk') store.walkTo(s.number);
          else if (move === 'fly') store.flyTo(s.number);
          await arrive(s.number);
          for (let i = 0; i < s.pick; i++) {
            await wait(i === 0 ? ARRIVE_MS : PICK_MS);
            if (cancelled) return;
            useAppStore.getState().pickUpAtom(s.symbol);
          }
        }
        if (cancelled) return;
        stop();
        done.current(compound);
      };
      void run();
    },
    [stop],
  );

  return { touring, start, stop };
}
