import { useEffect, useMemo } from 'react';
import { applyKey, clearInput, createInput, type InputState } from '../core/input.ts';

/** True when the key event belongs to a text field, so movement keys must not be taken. */
function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

/**
 * Tracks held movement keys on the window into one `InputState` for the lifetime of the
 * component. Per-frame code reads it; nothing here sets React state.
 */
export function useKeyboardInput(): InputState {
  const input = useMemo(() => createInput(), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const down = e.type === 'keydown';
      // Key-ups always pass, so a key released after focusing a field doesn't stick.
      if (down && (isTextEntry(e.target) || e.metaKey || e.ctrlKey || e.altKey)) return;
      if (applyKey(input, e.code, down) && down) e.preventDefault();
    };
    const release = () => clearInput(input);
    const onVisibility = () => {
      if (document.hidden) release();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('blur', release);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [input]);
  return input;
}
