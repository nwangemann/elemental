import { useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import {
  CATEGORY_LABELS,
  overviewFacts,
  placement,
  propertyFacts,
  type Fact,
} from '../core/elementFacts.ts';
import { elementByNumber, type Element } from '../core/elements/index.ts';
import { accentTokens } from '../core/palette.ts';
import { useAppStore } from '../state/store.ts';

const TABS = [
  { id: 'overview', label: 'Overview', facts: overviewFacts },
  { id: 'properties', label: 'Properties', facts: propertyFacts },
] as const;

/**
 * The element panel: slides in while the character stands on a tile and shows that element's
 * overview and properties, coloured with the family's accent. Loaded as its own chunk with the
 * element data, so the shell stays small (docs/adr/0005-element-panel-data.md).
 */
export function ElementPanel() {
  const number = useAppStore((s) => s.activeTile?.number ?? null);
  // Keep showing the last element while the panel slides out.
  const [shown, setShown] = useState<Element | null>(null);
  const current = number === null ? null : (elementByNumber(number) ?? null);
  if (current && current !== shown) setShown(current);

  const element = current ?? shown;
  const open = current !== null;
  if (!element) return null;

  const { accent, accentInk } = accentTokens(element.category);
  const style = { '--accent': accent, '--accent-ink': accentInk } as CSSProperties;

  return (
    <aside
      className="panel"
      data-open={open}
      inert={!open}
      aria-labelledby="panel-name"
      data-element={element.number}
      style={style}
    >
      <header className="panel-head">
        <p className="panel-symbol" aria-hidden="true">
          {element.symbol}
        </p>
        <div>
          <p className="panel-number">
            <span className="visually-hidden">Atomic number </span>
            {element.number}
          </p>
          <h2 id="panel-name">{element.name}</h2>
          <p className="panel-meta">
            {CATEGORY_LABELS[element.category]} · {placement(element)}
          </p>
        </div>
      </header>
      <Tabs element={element} />
      <p className="panel-source">Data: PubChem (NIH) and Wikidata.</p>
    </aside>
  );
}

function Tabs({ element }: { element: Element }) {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const base = useId();

  // Arrow keys, Home and End move between tabs (WAI-ARIA tabs pattern). The event stops here,
  // so the arrows do not also walk the character.
  const onKeyDown = (e: KeyboardEvent) => {
    const last = TABS.length - 1;
    const next =
      e.key === 'ArrowRight'
        ? active === last
          ? 0
          : active + 1
        : e.key === 'ArrowLeft'
          ? active === 0
            ? last
            : active - 1
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    e.stopPropagation();
    setActive(next);
    tabs.current[next]?.focus();
  };

  const tab = TABS[active] ?? TABS[0];
  return (
    <>
      <div className="panel-tabs" role="tablist" aria-label="Element details">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${base}-${t.id}-tab`}
            aria-selected={i === active}
            aria-controls={`${base}-${t.id}`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={onKeyDown}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        className="panel-body"
        role="tabpanel"
        id={`${base}-${tab.id}`}
        aria-labelledby={`${base}-${tab.id}-tab`}
        tabIndex={0}
      >
        <FactList facts={tab.facts(element)} />
      </div>
    </>
  );
}

function FactList({ facts }: { facts: readonly Fact[] }) {
  return (
    <dl className="facts">
      {facts.map((f) => (
        <div key={f.label}>
          <dt>{f.label}</dt>
          <dd>
            {f.value}
            {f.note && <span className="fact-note"> ({f.note})</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
