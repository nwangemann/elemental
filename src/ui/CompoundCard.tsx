import { useEffect, useRef } from 'react';
import { BOND_LABELS, leadsTo, madeOf } from '../core/compoundCard.ts';
import { COMPOUNDS, type Compound } from '../core/compounds/index.ts';
import { ELEMENTS } from '../core/elements/index.ts';
import { useAppStore } from '../state/store.ts';

const NUMBERS = new Map(ELEMENTS.map((e) => [e.symbol, { number: e.number, name: e.name }]));

/**
 * A compound's card inside the Combine tray (ADR 20): name and formula, the bond chip, where you
 * meet it, why it holds together (and the note, for lattices, alloys and lone atoms), Made of
 * chips that fly to each element's tile, and Leads to, whose items open another card when they
 * name a compound in the set. `focus` moves focus to the heading when the card was asked for
 * (Recently made, Leads to), not when it opened because a compound formed under a walking player.
 * The tray keys it by compound, so each card mounts afresh.
 */
export function CompoundCard({
  compound,
  focus,
  onOpen,
  onClose,
}: {
  compound: Compound;
  focus: boolean;
  onOpen: (compound: Compound) => void;
  onClose: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focus) heading.current?.focus();
  }, [focus]);
  const flyTo = useAppStore((s) => s.flyTo);

  return (
    <article className="compound-card" aria-labelledby="compound-card-title">
      <div className="compound-card-head">
        <h3 id="compound-card-title" ref={heading} tabIndex={-1}>
          {compound.name} <span className="combine-formula">{compound.formula}</span>
        </h3>
        <button type="button" onClick={onClose} aria-label={`Close the ${compound.name} card`}>
          ×
        </button>
      </div>
      <p className={`bond-chip bond-${compound.bond}`}>{BOND_LABELS[compound.bond]}</p>
      {!compound.carryable && (
        <p>
          Too big to carry ({compound.atoms} atoms), so it doesn't form here: the walk showed its
          recipe.
        </p>
      )}
      <dl>
        <dt>Where you meet it</dt>
        <dd>{compound.where}</dd>
        <dt>Why it holds together</dt>
        <dd>
          {compound.why}
          {compound.note && <> {compound.note}</>}
        </dd>
        <dt>Made of</dt>
        <dd>
          <ul className="compound-chips">
            {madeOf(compound, NUMBERS).map((m) => (
              <li key={m.symbol}>
                <button
                  type="button"
                  aria-label={`${m.name}${m.count ? `, ${String(m.count)}` : ''}: go to its tile`}
                  onClick={() => flyTo(m.number)}
                >
                  <b>{m.symbol}</b>
                  {m.count && m.count > 1 ? ` ${String(m.count)}` : ''}
                </button>
              </li>
            ))}
          </ul>
        </dd>
        {compound.leadsTo.length > 0 && (
          <>
            <dt>Leads to</dt>
            <dd>
              {leadsTo(compound, COMPOUNDS).map((l, i) => (
                <span key={l.text}>
                  {i > 0 && ', '}
                  {l.compound ? (
                    <button
                      type="button"
                      className="compound-link"
                      onClick={() => onOpen(l.compound!)}
                    >
                      {l.text}
                    </button>
                  ) : (
                    l.text
                  )}
                </span>
              ))}
            </dd>
          </>
        )}
      </dl>
    </article>
  );
}
