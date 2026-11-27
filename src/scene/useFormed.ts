import { useMemo } from 'react';
import { carriedCounts } from '../core/carry.ts';
import { exactMatches } from '../core/combine.ts';
import { COMPOUNDS, type Compound } from '../core/compounds/index.ts';
import { pickFormed } from '../core/forming.ts';
import { useAppStore } from '../state/store.ts';

/** The compound the carried atoms form now (the tray's isomer pick when several do), or none. */
export function useFormed(): Compound | undefined {
  const carry = useAppStore((s) => s.combine.carry);
  const pick = useAppStore((s) => s.combine.pick);
  return useMemo(
    () => pickFormed(exactMatches(carriedCounts(carry), COMPOUNDS), pick),
    [carry, pick],
  );
}
