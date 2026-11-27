import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { canAdd, carriedCounts, dropOne, pickUp, withCounts, type Carry } from '../core/carry.ts';
import { exactMatches, fillIn, nearest } from '../core/combine.ts';
import { addRecent, parseRecent } from '../core/compoundCard.ts';
import { COMPOUNDS, type Compound } from '../core/compounds/index.ts';
import { ELEMENTS } from '../core/elements/index.ts';
import { pickFormed } from '../core/forming.ts';
import { nameInSentence, nearMissLine, ratioLine, traySummary } from '../core/trayText.ts';
import { useAppStore } from '../state/store.ts';
import { CompoundCard } from './CompoundCard.tsx';
import { useShowMe } from './useShowMe.ts';

const NAMES = new Map(ELEMENTS.map((e) => [e.symbol, e.name.toLowerCase()]));
const STARTERS = COMPOUNDS.filter((c) => c.starter);
const BY_ID = new Map(COMPOUNDS.map((c) => [c.id, c]));
const RECENT_KEY = 'elemental:recent';

// Storage can throw (private mode, blocked cookies, full quota): Recently made then lasts only
// for the visit.
function loadRecent(): string[] {
  try {
    return parseRecent(localStorage.getItem(RECENT_KEY), new Set(BY_ID.keys()));
  } catch {
    return [];
  }
}
function saveRecent(recent: readonly string[]) {
  try {
    if (recent.length) localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    else localStorage.removeItem(RECENT_KEY);
  } catch {
    // Keep the list in memory only.
  }
}

/** The card shown in the tray: `formed` cards close when the carry stops matching. */
interface CardState {
  compound: Compound;
  formed: boolean;
  focus: boolean;
}

/**
 * Combine mode's tray (ADR 20), lazily loaded the first time Combine opens and shown while it
 * is open: the carried elements with − / + steppers and Clear, or the starters when nothing is
 * carried, and a live region that says what is carried and where it leads. Below it, the
 * ratio when the carried elements are right but the amounts are not (Fill in sets them), and
 * the nearest three compounds with the atoms each needs. When the carry is several
 * compounds at once (isomers), toggle buttons choose the one the model shows. Close (or Esc
 * inside the tray) hides it and keeps what is carried.
 *
 * When the carry forms a compound (or a lone atom such as argon) its card opens in place of the
 * suggestions and joins Recently made (the last eight, kept in localStorage), which an empty
 * tray lists to reopen. Starters' Show me runs a tour that gathers the compound (`useShowMe`).
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
  const pick = useAppStore((s) => s.combine.pick);
  const setFormPick = useAppStore((s) => s.setFormPick);
  // One formula, several molecules (ethanol and dimethyl ether): offer each.
  const isomers = useMemo(
    () => exactMatches(counts, COMPOUNDS).filter((c) => c.kind !== 'atom'),
    [counts],
  );
  const shown = pickFormed(isomers, pick);
  // A lone atom forms no model but still has a card ("Argon stays on its own").
  const formed = shown ?? exactMatches(counts, COMPOUNDS)[0];

  const [recent, setRecent] = useState(loadRecent);
  useEffect(() => saveRecent(recent), [recent]);
  const [card, setCard] = useState<CardState | null>(null);
  // A card asked for (Recently made, Leads to) takes focus and stays until closed.
  const openCard = (compound: Compound) => setCard({ compound, formed: false, focus: true });

  const showMe = useShowMe((c) => {
    setCard({ compound: c, formed: c.carryable, focus: false });
    if (c.carryable) setRecent((r) => addRecent(r, c.id));
  });

  // A new compound formed: open its card and remember it. The carry no longer forming closes a
  // card that opened that way (state adjusted during render, not in an effect).
  // During Show me, what forms on the way (hydrogen gas before water) is not recorded; the tour's
  // compound is, when it ends.
  const [seen, setSeen] = useState<Compound | undefined>(undefined);
  if (formed !== seen) {
    setSeen(formed);
    if (formed && !showMe.touring) {
      setCard({ compound: formed, formed: true, focus: false });
      setRecent((r) => addRecent(r, formed.id));
    } else if (card?.formed) setCard(null);
  }

  const close = () => {
    showMe.stop();
    const inTray = tray.current?.contains(document.activeElement) ?? false;
    useAppStore.getState().setCombineOpen(false);
    if (inTray) document.getElementById('scene')?.focus();
  };

  const setCarry = useAppStore((s) => s.setCarry);
  const closeButton = useRef<HTMLButtonElement>(null);
  const stopButton = useRef<HTMLButtonElement>(null);

  // Show me's button leaves with the starters once the first atom is picked up, and Stop leaves
  // when the tour ends: keep keyboard focus in the tray on the button that replaces them.
  const touring = showMe.touring !== null;
  const wasTouring = useRef(touring);
  useEffect(() => {
    if (wasTouring.current === touring) return;
    wasTouring.current = touring;
    const at = document.activeElement;
    if (at && at !== document.body && !tray.current?.contains(at)) return;
    (touring ? stopButton : closeButton).current?.focus();
  }, [touring]);

  // Clear, or − on an element's last atom, removes the focused button: keep focus in the tray.
  const edit = (next: Carry) => {
    showMe.stop();
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
        if (card) {
          setCard(null);
          closeButton.current?.focus();
        } else close();
      }}
    >
      <div className="combine-head">
        <h2 id="combine-title">Combine</h2>
        {showMe.touring && (
          <button ref={stopButton} type="button" onClick={showMe.stop}>
            Stop
          </button>
        )}
        {carry.length > 0 && !showMe.touring && (
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
              <button
                type="button"
                aria-label={`Show me ${nameInSentence(c)}`}
                onClick={() => showMe.start(c)}
              >
                Show me
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="combine-summary" role="status">
        {summary}
      </p>
      {isomers.length > 1 && (
        <div className="combine-isomers" role="group" aria-label="Show which compound">
          {isomers.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={c === shown}
              onClick={() => setFormPick(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
      {card ? (
        <CompoundCard
          key={card.compound.id}
          compound={card.compound}
          focus={card.focus}
          onOpen={(c) => openCard(c)}
          onClose={() => {
            setCard(null);
            closeButton.current?.focus();
          }}
        />
      ) : (
        <>
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
          {carry.length === 0 && recent.length > 0 && (
            <div className="combine-recent">
              <div className="combine-recent-head">
                <h3 id="combine-recent-title">Recently made</h3>
                <button
                  type="button"
                  onClick={() => setRecent([])}
                  aria-label="Clear recently made"
                >
                  Clear
                </button>
              </div>
              <ul aria-labelledby="combine-recent-title">
                {recent.map((id) => {
                  const c = BY_ID.get(id);
                  return c ? (
                    <li key={id}>
                      <button type="button" onClick={() => openCard(c)}>
                        {c.name}
                      </button>
                    </li>
                  ) : null;
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
