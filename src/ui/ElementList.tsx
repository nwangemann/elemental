import { useId, useRef } from 'react';
import { CATEGORY_LABELS } from '../core/elementFacts.ts';
import { ELEMENTS } from '../core/elements/index.ts';
import { useAppStore } from '../state/store.ts';

/**
 * The table as plain text: a native modal `<dialog>` holding an HTML table of all elements in
 * atomic-number order, for anyone who cannot or would rather not use the 3D scene. Each name is a
 * button that closes the list and flies the character to that element, so the panel opens on it.
 * Lazy-loaded in the chunk that already carries the element data (docs/adr/0005-element-panel-data.md).
 */
export function ElementList() {
  const dialog = useRef<HTMLDialogElement>(null);
  const current = useAppStore((s) => s.activeTile?.number ?? null);
  const base = useId();

  const go = (n: number) => {
    dialog.current?.close();
    useAppStore.getState().flyTo(n);
  };

  return (
    <>
      <button type="button" className="list-open" onClick={() => dialog.current?.showModal()}>
        List
      </button>
      <dialog
        ref={dialog}
        className="element-list"
        aria-labelledby={`${base}-title`}
        // Keys stay in the list: arrows and letters must not walk the character behind it.
        onKeyDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current.close();
        }}
      >
        <header className="keyhelp-head">
          <h2 id={`${base}-title`}>All {ELEMENTS.length} elements</h2>
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Close">
            ×
          </button>
        </header>
        <div className="element-list-scroll">
          <table>
            <caption className="visually-hidden">
              The periodic table in atomic-number order. Choose a name to walk there.
            </caption>
            <thead>
              <tr>
                <th scope="col">No.</th>
                <th scope="col">Symbol</th>
                <th scope="col">Name</th>
                <th scope="col">Family</th>
                <th scope="col">Period</th>
                <th scope="col">Group</th>
              </tr>
            </thead>
            <tbody>
              {ELEMENTS.map((e) => (
                <tr key={e.number} aria-current={e.number === current ? 'location' : undefined}>
                  <td>{e.number}</td>
                  <td>{e.symbol}</td>
                  <th scope="row">
                    <button type="button" onClick={() => go(e.number)}>
                      {e.name}
                    </button>
                  </th>
                  <td>{CATEGORY_LABELS[e.category]}</td>
                  <td>{e.period}</td>
                  <td>
                    {e.group ?? (
                      <>
                        <span aria-hidden="true">–</span>
                        <span className="visually-hidden">none</span>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </dialog>
    </>
  );
}
