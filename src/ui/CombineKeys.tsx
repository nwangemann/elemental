import { useEffect } from 'react';
import { isTextEntry } from '../scene/useKeyboardInput.ts';
import { useAppStore } from '../state/store.ts';

/**
 * Combine mode's keys (ADR 20), outside text fields: C picks up one atom of the tile underfoot
 * and opens Combine (with no tile, it only opens it), and Backspace drops the last atom while
 * Combine is open. Part of the shell, so the first C works before combine's chunk has loaded.
 * Renders nothing.
 */
export function CombineKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTextEntry(e.target)) return;
      const s = useAppStore.getState();
      if (e.code === 'KeyC' && !e.shiftKey) {
        e.preventDefault();
        if (e.repeat) return;
        if (s.activeTile) s.pickUpAtom(s.activeTile.symbol);
        else s.setCombineOpen(true);
      } else if (e.code === 'Backspace' && s.combine.open) {
        e.preventDefault();
        s.dropLastAtom();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return null;
}
