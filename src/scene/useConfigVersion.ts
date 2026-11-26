import { useSyncExternalStore } from 'react';
import { configVersion, subscribeConfig } from '../core/config.ts';

/**
 * Re-renders when `CONFIG` changes and returns its version, for use as a React `key` on
 * components that build objects once from it. Per-frame code reads `CONFIG` directly instead.
 */
export function useConfigVersion(): number {
  return useSyncExternalStore(subscribeConfig, configVersion);
}
