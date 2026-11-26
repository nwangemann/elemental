import fontUrl from '@fontsource/inter/files/inter-latin-700-normal.woff?url';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { Group } from 'three';
import { BatchedText, Text } from 'troika-three-text';
import { tileTop, type Activation } from '../core/activation.ts';
import { CONFIG } from '../core/config.ts';
import { ELEMENTS } from '../core/elements/index.ts';
import { LAYOUT, TILES } from '../core/layout.ts';
import { LABEL_COLOR } from '../core/palette.ts';

const FLAT = -Math.PI / 2;

function label(text: string, size: number): Text {
  const t = new Text();
  t.text = text;
  // A bundled font, as .woff because troika cannot parse woff2. Troika only fetches fallback
  // fonts for glyphs this one lacks, so the Latin-only labels never touch the network.
  t.font = fontUrl;
  t.fontSize = size;
  t.color = LABEL_COLOR;
  t.rotation.x = FLAT;
  return t;
}

/**
 * Symbol and atomic number on every tile as SDF text, batched into a single draw call.
 * Built imperatively so React's StrictMode remount never reuses a disposed batch. Labels ride
 * their tile as it rises: `BatchedText` reads each member's matrix every frame, so moving a
 * member needs no re-sync.
 */
export function Labels({ activation }: { activation: Activation }) {
  const group = useRef<Group>(null);
  /** Symbol and number per tile, index = atomic number − 1. */
  const byTile = useRef<[Text, Text][]>([]);

  useFrame(() => {
    if (!activation.anyDirty) return;
    const pairs = byTile.current;
    for (let i = 0; i < pairs.length; i++) {
      if (!activation.dirty[i]) continue;
      const y = tileTop(activation, i) + CONFIG.labels.lift;
      pairs[i]![0].position.y = y;
      pairs[i]![1].position.y = y;
    }
  });

  useEffect(() => {
    const g = group.current;
    if (!g) return;
    const batch = new BatchedText();
    batch.color = LABEL_COLOR;
    const members: Text[] = [];
    const pairs: [Text, Text][] = [];
    const corner = LAYOUT.tileSize / 2 - CONFIG.labels.numberInset;

    for (const tile of TILES) {
      const element = ELEMENTS[tile.number - 1]!;
      const y = tileTop(activation, tile.number - 1) + CONFIG.labels.lift;
      const symbol = label(element.symbol, CONFIG.labels.symbolSize);
      symbol.anchorX = 'center';
      symbol.anchorY = 'middle';
      symbol.position.set(tile.x, y, tile.z + 0.06);

      const number = label(String(tile.number), CONFIG.labels.numberSize);
      number.anchorX = 'left';
      number.anchorY = 'top';
      number.position.set(tile.x - corner, y, tile.z - corner);

      batch.addText(symbol);
      batch.addText(number);
      members.push(symbol, number);
      pairs.push([symbol, number]);
    }
    batch.sync();
    g.add(batch);
    byTile.current = pairs;

    return () => {
      byTile.current = [];
      g.remove(batch);
      for (const t of members) t.dispose();
      batch.dispose();
    };
  }, [activation]);

  return <group ref={group} />;
}
