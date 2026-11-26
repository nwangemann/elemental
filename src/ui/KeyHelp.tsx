import { useCallback, useEffect, useId, useRef } from 'react';
import { isTextEntry } from '../scene/useKeyboardInput.ts';

const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform);

/** Every key the app answers to, as the overlay lists it. */
const KEY_GROUPS: readonly { title: string; rows: readonly [keys: string[], action: string][] }[] =
  [
    {
      title: 'Walk',
      rows: [
        [['W', 'A', 'S', 'D'], 'Walk'],
        [['↑', '←', '↓', '→'], 'Walk'],
        [['Shift'], 'Hold to walk slowly'],
        [['I', 'J', 'K', 'L'], 'Step to the next tile up, left, down or right'],
        [['R', 'Home'], 'Walk back to the last tile from the ground'],
        [['+', '−'], 'Zoom in or out'],
      ],
    },
    {
      title: 'Elements',
      rows: [
        [['Enter'], 'Open the element panel and move focus into it'],
        [['Space'], 'Same as Enter'],
        [['Esc'], 'Close the panel and return to the table'],
        [[IS_MAC ? '⌘ K' : 'Ctrl K', '/'], 'Search, sort and filter the elements'],
        [['?'], 'Show or hide this list'],
      ],
    },
  ];

/**
 * The key map overlay: a native modal `<dialog>` listing every key, opened with `?` (outside text
 * fields) or the button under the explorer, closed with `?`, Esc or the close button. Part of the
 * shell, so it works before the scene has loaded. Keys stop at the dialog, like the explorer's.
 */
export function KeyHelp() {
  const dialog = useRef<HTMLDialogElement>(null);
  const base = useId();

  const toggle = useCallback(() => {
    const d = dialog.current;
    if (!d) return;
    if (d.open) d.close();
    else d.showModal();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '?' || e.metaKey || e.ctrlKey || e.altKey || isTextEntry(e.target)) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  return (
    <>
      <button type="button" className="keys-open" onClick={toggle} aria-keyshortcuts="?">
        Keys <kbd>?</kbd>
      </button>
      <dialog
        ref={dialog}
        className="keyhelp"
        aria-labelledby={`${base}-title`}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === '?') {
            e.preventDefault();
            dialog.current?.close();
          }
        }}
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current.close();
        }}
      >
        <header className="keyhelp-head">
          <h2 id={`${base}-title`}>Keys</h2>
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Close">
            ×
          </button>
        </header>
        {KEY_GROUPS.map((g) => (
          <section key={g.title} aria-labelledby={`${base}-${g.title}`}>
            <h3 id={`${base}-${g.title}`}>{g.title}</h3>
            <dl>
              {g.rows.map(([keys, action]) => (
                <div key={keys.join()}>
                  <dt>
                    {keys.map((k) => (
                      <kbd key={k}>{k}</kbd>
                    ))}
                  </dt>
                  <dd>{action}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        <p className="keyhelp-note">
          Focus the table (Tab) to use these with a screen reader; the tile you stand on is
          announced.
        </p>
      </dialog>
    </>
  );
}
