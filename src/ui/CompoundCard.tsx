import { useEffect, useId, useRef } from 'react';
import { BOND_LABELS, isomersOf, leadsTo, madeOf } from '../core/compoundCard.ts';
import { COMPOUNDS, type Compound } from '../core/compounds/index.ts';
import { ELEMENTS } from '../core/elements/index.ts';
import { artPoints, laddersFor, type Rung, type Unit } from '../core/ladder.ts';
import { useAppStore } from '../state/store.ts';

const NUMBERS = new Map(ELEMENTS.map((e) => [e.symbol, { number: e.number, name: e.name }]));

/**
 * A compound's card inside the Combine tray (ADR 20): name and formula, the bond chip, where you
 * meet it, why it holds together (and the note, for lattices, alloys and lone atoms) with links
 * to each element's Atom tab, its isomers, Made of chips that fly to each element's tile, Leads
 * to, whose items open another card when they name a compound in the set, and the scale ladder. `focus` moves focus to the heading when the card was asked for
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
  const showTab = useAppStore((s) => s.showTab);
  const parts = madeOf(compound, NUMBERS);
  const isomers = isomersOf(compound, COMPOUNDS);
  const ladders = laddersFor(compound.id);
  const open = (id: string) => {
    const c = COMPOUNDS.find((o) => o.id === id);
    if (c) onOpen(c);
  };

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
          <span className="compound-electrons">
            See the electrons:
            {parts.map((m) => (
              <button
                key={m.symbol}
                type="button"
                className="compound-link"
                aria-label={`${m.name}'s electron shells`}
                onClick={() => showTab(m.number, 'atom')}
              >
                {m.symbol}
              </button>
            ))}
          </span>
        </dd>
        {isomers.length > 0 && (
          <>
            <dt>Same atoms as</dt>
            <dd>
              {isomers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="compound-link"
                  onClick={() => onOpen(c)}
                >
                  {c.name}
                </button>
              ))}
            </dd>
          </>
        )}
        <dt>Made of</dt>
        <dd>
          <ul className="compound-chips">
            {parts.map((m) => (
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
        {ladders.length === 0 && (
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
        {ladders.length > 0 && (
          <>
            <dt>Scale it up</dt>
            {ladders.map((ladder) => (
              <dd key={ladder.map((r) => r.label).join()}>
                <ol className="ladder">
                  {ladder.map((r) => (
                    <li
                      key={r.label}
                      aria-current={r.compound === compound.id ? 'step' : undefined}
                    >
                      <RungArt rung={r} />
                      {r.compound && r.compound !== compound.id ? (
                        <button
                          type="button"
                          className="compound-link"
                          onClick={() => open(r.compound!)}
                        >
                          {r.label}
                        </button>
                      ) : (
                        <b>{r.label}</b>
                      )}
                      <span>{r.line}</span>
                    </li>
                  ))}
                </ol>
              </dd>
            ))}
          </>
        )}
      </dl>
    </article>
  );
}

/** One unit of a rung's picture, drawn once and placed by `<use>` (each unit an instance). */
const UNIT_SHAPES: Record<Unit, string> = {
  ring: 'M0-4 3.5-2v4L0 4-3.5 2v-4z',
  bead: 'M-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
  letter: 'M-3.5-2h7v4h-7z',
  cell: 'M-3.5-3.5h7v7h-7z',
  atom: 'M-3.5 0a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0',
};

/** How large a unit draws in each layout: one alone fills the picture, a packed block does not. */
const UNIT_SCALE: Record<Rung['layout'], number> = {
  one: 2.6,
  chain: 1.25,
  fold: 1,
  fibres: 1.1,
  helix: 0.9,
  block: 1,
  jumble: 0.95,
};

/**
 * A rung's picture: its units placed by `artPoints` in a 48 px square, joined along a chain, a
 * fold or the helix's pairs; in an alloy, the other element's atoms take the accent colour.
 */
function RungArt({ rung }: { rung: Rung }) {
  const unit = `${useId()}u`;
  const k = UNIT_SCALE[rung.layout];
  const pts = artPoints(rung).map(([x, y, other]) => [x * 48, y * 48, other] as const);
  const joined =
    rung.layout === 'chain' || rung.layout === 'fold'
      ? pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
      : null;
  return (
    <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true" className="rung-art">
      <defs>
        <path id={unit} d={UNIT_SHAPES[rung.unit]} />
      </defs>
      {joined && <polyline points={joined} />}
      {rung.layout === 'helix' &&
        pts.map(([x, y], i) =>
          i % 2 ? null : <line key={i} x1={x} y1={y} x2={pts[i + 1]![0]} y2={y} />,
        )}
      {pts.map(([x, y, other], i) => (
        <use
          key={i}
          href={`#${unit}`}
          transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${String(k)})`}
          className={other ? 'rung-other' : undefined}
        />
      ))}
    </svg>
  );
}
