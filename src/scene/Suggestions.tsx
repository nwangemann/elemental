import { useEffect } from 'react';
import { carriedCounts } from '../core/carry.ts';
import { suggestionDim, suggestionWeights } from '../core/combine.ts';
import { contextMembers } from '../core/compounds/contexts.ts';
import { COMPOUNDS } from '../core/compounds/index.ts';
import { CONFIG } from '../core/config.ts';
import { ELEMENTS } from '../core/elements/index.ts';
import type { DimLayer } from '../core/lens.ts';
import { useAppStore, type CombineState } from '../state/store.ts';

const SYMBOLS = ELEMENTS.map((e) => e.symbol);

/**
 * Writes the table guidance for one combine state: the suggestion dim while carrying, else the
 * picked context's elements lit and the rest dimmed, else nothing (and nothing while closed).
 */
function writeSuggestions(layer: DimLayer, combine: CombineState, weights: Float32Array): void {
  const carrying = combine.open && combine.carry.length > 0;
  const context = combine.open && !carrying ? combine.context : null;
  if (carrying) {
    suggestionWeights(carriedCounts(combine.carry), COMPOUNDS, SYMBOLS, weights);
    suggestionDim(weights, CONFIG.combine.suggestDim, layer.targets);
  } else if (context) {
    const members = contextMembers(context);
    for (let i = 0; i < SYMBOLS.length; i++) layer.targets[i] = members.has(SYMBOLS[i]!) ? 0 : 1;
  }
  const active = carrying || context !== null;
  if (!active && !layer.active) return;
  layer.active = active;
  layer.changed = true;
}

/**
 * Combine mode's table guidance (ADR 20): while carrying, tiles whose element leads somewhere
 * in the compound set stay bright, more so the more everyday compounds they help complete,
 * and the rest dim as filtered tiles do. With nothing carried, a picked context lights its own
 * elements instead. Recomputed only when the carry, the context or `open` changes;
 * loaded with combine's chunk, so the scene chunk carries no compound data. Renders nothing.
 */
export default function Suggestions({ layer }: { layer: DimLayer }) {
  useEffect(() => {
    const weights = new Float32Array(SYMBOLS.length);
    writeSuggestions(layer, useAppStore.getState().combine, weights);
    return useAppStore.subscribe((s, prev) => {
      const a = s.combine;
      const b = prev.combine;
      if (a.open === b.open && a.carry === b.carry && a.context === b.context) return;
      writeSuggestions(layer, s.combine, weights);
    });
  }, [layer]);
  return null;
}
