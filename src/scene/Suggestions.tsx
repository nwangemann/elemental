import { useEffect } from 'react';
import { carriedCounts } from '../core/carry.ts';
import { suggestionDim, suggestionWeights } from '../core/combine.ts';
import { COMPOUNDS } from '../core/compounds/index.ts';
import { CONFIG } from '../core/config.ts';
import { ELEMENTS } from '../core/elements/index.ts';
import type { DimLayer } from '../core/lens.ts';
import { useAppStore, type CombineState } from '../state/store.ts';

const SYMBOLS = ELEMENTS.map((e) => e.symbol);

/** Writes the suggestion dim for one combine state; inactive while closed or carrying nothing. */
function writeSuggestions(layer: DimLayer, combine: CombineState, weights: Float32Array): void {
  const active = combine.open && combine.carry.length > 0;
  if (active) {
    suggestionWeights(carriedCounts(combine.carry), COMPOUNDS, SYMBOLS, weights);
    suggestionDim(weights, CONFIG.combine.suggestDim, layer.targets);
  }
  if (!active && !layer.active) return;
  layer.active = active;
  layer.changed = true;
}

/**
 * Combine mode's table guidance (ADR 20): while carrying, tiles whose element leads somewhere
 * in the compound set stay bright, more so the more everyday compounds they help complete,
 * and the rest dim as filtered tiles do. Recomputed only when the carry or `open` changes;
 * loaded with combine's chunk, so the scene chunk carries no compound data. Renders nothing.
 */
export default function Suggestions({ layer }: { layer: DimLayer }) {
  useEffect(() => {
    const weights = new Float32Array(SYMBOLS.length);
    writeSuggestions(layer, useAppStore.getState().combine, weights);
    return useAppStore.subscribe((s, prev) => {
      if (s.combine.open === prev.combine.open && s.combine.carry === prev.combine.carry) return;
      writeSuggestions(layer, s.combine, weights);
    });
  }, [layer]);
  return null;
}
