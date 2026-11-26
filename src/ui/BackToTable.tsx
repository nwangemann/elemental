import { useEffect, useState } from 'react';
import { isReturnCode } from '../core/tileStep.ts';
import { isTextEntry } from '../scene/useKeyboardInput.ts';
import { useAppStore } from '../state/store.ts';

/** How long the character must be off the tiles before the button appears. */
const SHOW_AFTER_MS = 2000;

/**
 * R or Home (outside text fields) and a "Back to the table" button, shown after the character
 * has been on the ground for a moment. Both ask the scene to walk back to the last tile. Part of
 * the shell, so it costs the scene chunk nothing.
 */
export function BackToTable() {
  const offTable = useAppStore((s) => s.offTable);
  const requestReturn = useAppStore((s) => s.requestReturn);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!offTable) return;
    const id = window.setTimeout(() => setShown(true), SHOW_AFTER_MS);
    return () => {
      window.clearTimeout(id);
      setShown(false);
    };
  }, [offTable]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTextEntry(e.target)) return;
      if (!isReturnCode(e.code) || e.repeat) return;
      e.preventDefault();
      requestReturn();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestReturn]);

  if (!offTable || !shown) return null;
  return (
    <button type="button" className="back-to-table" onClick={requestReturn} aria-keyshortcuts="R">
      Back to the table <kbd>R</kbd>
    </button>
  );
}
