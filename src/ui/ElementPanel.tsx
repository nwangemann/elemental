import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import {
  CATEGORY_LABELS,
  overviewFacts,
  placement,
  propertyFacts,
  type Fact,
} from '../core/elementFacts.ts';
import { comparison, rankFacts } from '../core/elementRanks.ts';
import { ELEMENTS, elementByNumber, type Element } from '../core/elements/index.ts';
import { accentTokens } from '../core/themes.ts';
import { useAppStore } from '../state/store.ts';

const TABS = [
  { id: 'overview', label: 'Overview', facts: overviewFacts },
  { id: 'properties', label: 'Properties', facts: propertyFacts },
] as const;

/** True when a key press is aimed at the table rather than a control: nothing, or the scene, has focus. */
function onTable(target: EventTarget | null): boolean {
  return target === document.body || (target instanceof HTMLElement && target.id === 'scene');
}

/**
 * Enter or Space on the table opens the panel and moves focus into it; Esc closes it and puts
 * focus back on the table. Enter and Space on a focused control keep their usual meaning.
 */
function usePanelKeys(panel: RefObject<HTMLElement | null>, focusNext: { current: boolean }) {
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // A modal dialog (explorer, key map, list) owns the keys, even when focus fell to the body.
      if (document.querySelector('dialog:modal')) return;
      const { activeTile, panelClosed, setPanelClosed } = useAppStore.getState();
      if ((e.key === 'Enter' || e.key === ' ') && onTable(e.target)) {
        if (!activeTile) return;
        e.preventDefault();
        if (panelClosed) {
          focusNext.current = true;
          setPanelClosed(false);
        } else panel.current?.focus();
      } else if (e.key === 'Escape') {
        const inPanel = panel.current?.contains(e.target as Node) ?? false;
        if (!inPanel && (panelClosed || !activeTile || !onTable(e.target))) return;
        e.preventDefault();
        if (inPanel) document.getElementById('scene')?.focus();
        setPanelClosed(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel, focusNext]);
}

/**
 * The element panel: slides in while the character stands on a tile and shows that element's
 * overview and properties, coloured with the family's accent. Esc closes it on the current tile
 * and Enter or Space opens it again (`usePanelKeys`). Loaded as its own chunk with the element
 * data, so the shell stays small (docs/adr/0005-element-panel-data.md).
 */
export function ElementPanel() {
  const number = useAppStore((s) => s.activeTile?.number ?? null);
  const closed = useAppStore((s) => s.panelClosed);
  const panel = useRef<HTMLElement>(null);
  const focusNext = useRef(false);
  usePanelKeys(panel, focusNext);
  // Keep showing the last element while the panel slides out.
  const [shown, setShown] = useState<Element | null>(null);
  // The element shown before this one, for the "compared with" line.
  const [previous, setPrevious] = useState<Element | null>(null);
  const current = number === null ? null : (elementByNumber(number) ?? null);
  if (current && current !== shown) {
    setPrevious(shown);
    setShown(current);
  }

  const open = current !== null && !closed;
  // Reopened from the keyboard: focus once `inert` is gone.
  useEffect(() => {
    if (open && focusNext.current) panel.current?.focus();
    focusNext.current = false;
  }, [open]);

  const element = current ?? shown;
  if (!element) return null;

  const { accent, accentInk } = accentTokens(element.category);
  const style = { '--accent': accent, '--accent-ink': accentInk } as CSSProperties;

  return (
    <aside
      ref={panel}
      tabIndex={-1}
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
      <Highlights element={element} previous={previous} />
      <Tabs element={element} />
      <p className="panel-source">Data: PubChem (NIH) and Wikidata.</p>
    </aside>
  );
}

/** Where the element stands among the rest, and how it compares with the tile before. */
function Highlights({ element, previous }: { element: Element; previous: Element | null }) {
  const ranks = rankFacts(element, ELEMENTS);
  const compared = previous && comparison(element, previous);
  if (ranks.length === 0 && !compared) return null;
  return (
    <ul className="panel-highlights" aria-label="Highlights">
      {ranks.map((r) => (
        <li key={r}>{r}</li>
      ))}
      {compared && (
        <li className="panel-compared">
          {compared.label}: {compared.value}
          {compared.note && <span className="fact-note"> ({compared.note})</span>}
        </li>
      )}
    </ul>
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
