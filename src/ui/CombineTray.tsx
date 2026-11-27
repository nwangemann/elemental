import { useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import { canAdd, carriedCounts, dropOne, pickUp, withCounts, type Carry } from '../core/carry.ts';
import { fillIn, nearest } from '../core/combine.ts';
import { COMPOUNDS } from '../core/compounds/index.ts';
import { ELEMENTS } from '../core/elements/index.ts';
import { nearMissLine, ratioLine, traySummary } from '../core/trayText.ts';
import { useAppStore } from '../state/store.ts';

const NAMES = new Map(ELEMENTS.map((e) => [e.symbol, e.name.toLowerCase()]));
const STARTERS = COMPOUNDS.filter((c) => c.starter);

/**
 * Combine mode's tray (ADR 20), lazily loaded the first time Combine opens and shown while it
 * is open: the carried elements with − / + steppers and Clear, or the starters when nothing is
 * carried, and a live region that says what is carried and where it leads. Below it, the
 * ratio when the carried elements are right but the amounts are not (Fill in sets them), and
 * the nearest three compounds with the atoms each needs. Close (or Esc
 * inside the tray) hides it and keeps what is carried.
 */
export default function CombineTray() {
  const open = useAppStore((s) => s.combine.open);
  const carry = useAppStore((s) => s.combine.carry);
  const refused = useAppStore((s) => s.combine.refused);
  const tray = useRef<HTMLElement>(null);

  const counts = useMemo(() => carriedCounts(carry), [carry]);
  const summary = useMemo(() => traySummary(counts, COMPOUNDS, refused), [counts, refused]);
  const near = useMemo(() => nearest(counts, COMPOUNDS), [counts]);
  const wrong = useMemo(() => fillIn(counts, COMPOUNDS), [counts]);

  const close = () => {
    const inTray = tray.current?.contains(document.activeElement) ?? false;
    useAppStore.getState().setCombineOpen(false);
    if (inTray) document.getElementById('scene')?.focus();
  };

  const setCarry = useAppStore((s) => s.setCarry);
  const closeButton = useRef<HTMLButtonElement>(null);

  // Clear, or − on an element's last atom, removes the focused button: keep focus in the tray.
  const edit = (next: Carry) => {
    const inTray = tray.current?.contains(document.activeElement) ?? false;
    flushSync(() => setCarry(next));
    if (inTray && !tray.current?.contains(document.activeElement)) closeButton.current?.focus();
  };

  return (
    <section
      ref={tray}
      className="combine-tray"
      aria-labelledby="combine-title"
      hidden={!open}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        close();
      }}
    >
      <div className="combine-head">
        <h2 id="combine-title">Combine</h2>
        {carry.length > 0 && (
          <button type="button" className="combine-clear" onClick={() => edit([])}>
            Clear
          </button>
        )}
        <button
          ref={closeButton}
          type="button"
          className="combine-close"
          onClick={close}
          aria-label="Close Combine"
        >
          ×
        </button>
      </div>
      {carry.length > 0 ? (
        <ul className="combine-carry" aria-label="Carried">
          {[...counts].map(([symbol, n]) => {
            const name = NAMES.get(symbol) ?? symbol;
            const full = canAdd(counts, symbol) !== 'ok';
            return (
              <li key={symbol}>
                <button
                  type="button"
                  aria-label={`One fewer ${name}`}
                  onClick={() => edit(dropOne(carry, symbol))}
                >
                  −
                </button>
                <span className="combine-count">
                  <b>{symbol}</b> {n}
                </span>
                <button
                  type="button"
                  aria-label={`One more ${name}`}
                  aria-disabled={full}
                  onClick={() => {
                    if (full) useAppStore.getState().pickUpAtom(symbol);
                    else edit(pickUp(carry, symbol));
                  }}
                >
                  +
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="combine-starters" aria-label="Starters">
          {STARTERS.map((c) => (
            <li key={c.id}>
              <span>
                {c.name} <span className="combine-formula">{c.formula}</span>
              </span>
              {/* Show me (a tour to each element) arrives with forming. */}
              <button type="button" disabled>
                Show me
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="combine-summary" role="status">
        {summary}
      </p>
      {wrong && (
        <p className="combine-ratio">
          {ratioLine(wrong, NAMES)}{' '}
          <button
            type="button"
            aria-label={`Fill in ${wrong.compound.name.toLowerCase()}`}
            onClick={() => edit(withCounts(carry, wrong.fill))}
          >
            Fill in
          </button>
        </p>
      )}
      {near.length > 0 && (
        <ul className="combine-nearest" aria-label="Nearest compounds">
          {near.map((n) => (
            <li key={n.compound.id}>{nearMissLine(n)}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
