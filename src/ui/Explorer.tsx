import {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { CATEGORY_LABELS } from '../core/elementFacts.ts';
import { ELEMENTS, elementByNumber } from '../core/elements/index.ts';
import {
  BLOCKS,
  CATEGORIES,
  DEFAULT_OPTIONS,
  NO_FILTERS,
  SORT_KEYS,
  SORT_LABELS,
  STATES,
  deepLink,
  explore,
  parseDeepLink,
  sortValueLabel,
  type ExploreOptions,
  type Filters,
  type SortKey,
} from '../core/explorer.ts';
import { lensFromHash } from '../core/lens.ts';
import { temperatureFromHash } from '../core/temperature.ts';
import { accentTokens } from '../core/themes.ts';
import { useAppStore } from '../state/store.ts';
import { isTextEntry } from '../scene/useKeyboardInput.ts';

const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const SHORTCUT = IS_MAC ? '⌘K' : 'Ctrl K';
const PERIODS = [1, 2, 3, 4, 5, 6, 7] as const;
const GROUPS = Array.from({ length: 18 }, (_, i) => i + 1);

/** A filter select's value, with the "Any" option as null. */
function valueOf(e: ChangeEvent<HTMLSelectElement>): string | null {
  return e.target.value || null;
}

/** Replaces the hash (no history entry) when it differs. */
function replaceHash(hash: string): void {
  if (window.location.hash === hash) return;
  const { pathname, search } = window.location;
  window.history.replaceState(window.history.state, '', pathname + search + hash);
}

/**
 * Keeps the address bar on the element under the character and the height lens
 * (`#/Au?lens=density`, replaced, not pushed, so walking does not fill the history), and flies to
 * an element and sets the lens when the hash is edited by hand. The first spawn and lens from a
 * deep link are the scene's own (scene/Scene.tsx, scene/HeightLens.tsx).
 */
function useDeepLinks(): void {
  useEffect(() => {
    // The scene reads the height and colour lenses from the link as it loads; the temperature
    // has no scene yet, so it is read here, before the first hash rewrite could drop it.
    useAppStore.getState().setLensTemperature(temperatureFromHash(window.location.hash));
    const unsubscribe = useAppStore.subscribe((s, prev) => {
      if (
        s.activeTile === prev.activeTile &&
        s.lens.height === prev.lens.height &&
        s.lens.colour === prev.lens.colour &&
        s.lens.temperature === prev.lens.temperature
      )
        return;
      // Off the table, the link keeps the element it already names (or the last one stood on).
      const e =
        (s.activeTile && elementByNumber(s.activeTile.number)) ??
        parseDeepLink(window.location.hash, ELEMENTS) ??
        (s.lastTile === null ? undefined : elementByNumber(s.lastTile));
      if (e) replaceHash(deepLink(e, s.lens.height, s.lens.colour, s.lens.temperature));
    });
    const onHash = () => {
      const e = parseDeepLink(window.location.hash, ELEMENTS);
      if (!e) return;
      const store = useAppStore.getState();
      store.setLensHeight(lensFromHash(window.location.hash));
      store.setLensColour(lensFromHash(window.location.hash, 'colour'));
      store.setLensTemperature(temperatureFromHash(window.location.hash));
      // A hand-typed `#/gold` or `#/79` reads back as the canonical `#/Au`.
      const { lens } = useAppStore.getState();
      replaceHash(deepLink(e, lens.height, lens.colour, lens.temperature));
      if (e.number !== store.activeTile?.number) store.flyTo(e.number);
    };
    window.addEventListener('hashchange', onHash);
    return () => {
      unsubscribe();
      window.removeEventListener('hashchange', onHash);
    };
  }, []);
}

/**
 * The explorer: a command palette (⌘K, Ctrl K or `/`) that searches elements by name, symbol or
 * number, sorts and filters them, and flies the character to the one chosen. Lazy-loaded with
 * the element data, like the panel. The search box is a WAI-ARIA combobox over a listbox; the
 * arrow keys move through results and Enter picks one. Key presses stay inside the dialog, so
 * they never walk the character.
 */
export function Explorer() {
  useDeepLinks();
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [options, setOptions] = useState<ExploreOptions>(DEFAULT_OPTIONS);
  const [active, setActive] = useState(0);
  const deferred = useDeferredValue(options);
  const results = useMemo(() => explore(ELEMENTS, deferred), [deferred]);
  const base = useId();
  const optionId = (n: number) => `${base}-el-${String(n)}`;
  const current = results[Math.min(active, results.length - 1)];

  const open = useCallback(() => {
    const d = dialog.current;
    if (!d) return;
    if (!d.open) d.showModal();
    search.current?.focus();
    search.current?.select();
  }, []);
  const close = () => dialog.current?.close();

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const chord = k === 'k' && (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey;
      const slash = e.key === '/' && !isTextEntry(e.target) && !e.metaKey && !e.ctrlKey;
      if (!chord && !slash) return;
      e.preventDefault();
      open();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Keep the highlighted result in view as the arrows move it.
  useEffect(() => {
    if (!current) return;
    document.getElementById(optionId(current.number))?.scrollIntoView({ block: 'nearest' });
  });

  const update = (patch: Partial<ExploreOptions>) => {
    setOptions((o) => ({ ...o, ...patch }));
    setActive(0);
  };
  const filter = (patch: Partial<Filters>) => update({ filters: { ...options.filters, ...patch } });
  const choose = (n: number) => {
    close();
    useAppStore.getState().flyTo(n);
  };

  const onSearchKey = (e: KeyboardEvent) => {
    const last = results.length - 1;
    const step =
      e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowUp'
          ? -1
          : e.key === 'PageDown'
            ? 8
            : e.key === 'PageUp'
              ? -8
              : 0;
    if (step !== 0) {
      e.preventDefault();
      setActive((a) => Math.max(0, Math.min(last, Math.min(a, last) + step)));
    } else if (e.key === 'Enter' && current) {
      e.preventDefault();
      choose(current.number);
    }
  };

  const filtered = Object.values(options.filters).some((v) => v !== null);

  // The filters also dim the tiles they exclude on the table, open or closed (core/lens.ts).
  useEffect(() => {
    useAppStore.getState().setLensFilters(options.filters);
  }, [options.filters]);

  return (
    <>
      <button
        type="button"
        className="explore-open"
        onClick={open}
        aria-keyshortcuts="Meta+K Control+K /"
      >
        Explore <kbd>{SHORTCUT}</kbd>
        {filtered && <span className="explore-filtered">Filtered</span>}
      </button>
      <dialog
        ref={dialog}
        className="explorer"
        aria-labelledby={`${base}-title`}
        // Keys stay in the palette: arrows, letters and +/- must not walk or zoom the scene.
        onKeyDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          if (e.target === dialog.current) close();
        }}
        // When the palette was opened from the scene (nothing focused), closing leaves focus on
        // the hidden search box, which would swallow the walking keys. Let it go.
        onClose={() => {
          const focused = document.activeElement;
          if (focused instanceof HTMLElement && dialog.current?.contains(focused)) focused.blur();
        }}
      >
        <h2 id={`${base}-title`} className="visually-hidden">
          Explore the elements
        </h2>
        <input
          ref={search}
          className="explorer-search"
          type="search"
          role="combobox"
          aria-label="Search by name, symbol or number"
          aria-expanded="true"
          aria-controls={`${base}-list`}
          aria-autocomplete="list"
          aria-activedescendant={current ? optionId(current.number) : undefined}
          placeholder="Search by name, symbol or number"
          autoComplete="off"
          spellCheck={false}
          value={options.query}
          onChange={(e) => update({ query: e.target.value })}
          onKeyDown={onSearchKey}
        />
        <div className="explorer-controls">
          <label>
            Sort
            <select
              value={options.sort}
              onChange={(e) => update({ sort: e.target.value as SortKey })}
            >
              {SORT_KEYS.map((k) => (
                <option key={k} value={k}>
                  {SORT_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            aria-pressed={options.descending}
            onClick={() => update({ descending: !options.descending })}
          >
            {options.descending ? 'High to low' : 'Low to high'}
          </button>
          <label>
            Family
            <select
              value={options.filters.category ?? ''}
              onChange={(e) => filter({ category: valueOf(e) as Filters['category'] })}
            >
              <option value="">Any</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <label>
            State
            <select
              value={options.filters.state ?? ''}
              onChange={(e) => filter({ state: valueOf(e) as Filters['state'] })}
            >
              <option value="">Any</option>
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Block
            <select
              value={options.filters.block ?? ''}
              onChange={(e) => filter({ block: valueOf(e) as Filters['block'] })}
            >
              <option value="">Any</option>
              {BLOCKS.map((b) => (
                <option key={b} value={b}>
                  {b}-block
                </option>
              ))}
            </select>
          </label>
          <label>
            Period
            <select
              value={options.filters.period ?? ''}
              onChange={(e) => filter({ period: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">Any</option>
              {PERIODS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label>
            Group
            <select
              value={options.filters.group ?? ''}
              onChange={(e) => filter({ group: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">Any</option>
              {GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          {filtered && (
            <button type="button" onClick={() => update({ filters: NO_FILTERS })}>
              Clear filters
            </button>
          )}
        </div>
        <p className="explorer-count" role="status">
          {results.length === 0
            ? 'No elements match.'
            : `${String(results.length)} element${results.length === 1 ? '' : 's'}`}
        </p>
        <ul id={`${base}-list`} className="explorer-list" role="listbox" aria-label="Elements">
          {results.map((e) => {
            const { accent, accentInk } = accentTokens(e.category);
            const style = { '--accent': accent, '--accent-ink': accentInk } as CSSProperties;
            const value = sortValueLabel(e, options.sort);
            return (
              <li
                key={e.number}
                id={optionId(e.number)}
                role="option"
                aria-selected={e === current}
                data-element={e.number}
                style={style}
                // Keep focus in the search box; the click itself picks the element.
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => choose(e.number)}
              >
                <span className="explorer-symbol" aria-hidden="true">
                  {e.symbol}
                </span>
                <span className="explorer-name">{e.name}</span>
                <span className="explorer-value">
                  {value && <>{value} · </>}
                  <span className="visually-hidden">atomic number </span>
                  {e.number}
                </span>
              </li>
            );
          })}
        </ul>
      </dialog>
    </>
  );
}
