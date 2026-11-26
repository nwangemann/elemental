import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, Object3D, type InstancedMesh } from 'three';
import { tileTop, type Activation } from '../core/activation.ts';
import { CONFIG } from '../core/config.ts';
import { ELEMENTS } from '../core/elements/index.ts';
import { LAYOUT, TILES } from '../core/layout.ts';
import { CATEGORY_COLORS } from '../core/palette.ts';

function writeTile(m: InstancedMesh, dummy: Object3D, activation: Activation, i: number): void {
  const tile = TILES[i]!;
  const top = tileTop(activation, i);
  dummy.position.set(tile.x, top / 2, tile.z);
  dummy.scale.set(1, top / CONFIG.tiles.height, 1);
  dummy.updateMatrix();
  m.setMatrixAt(i, dummy.matrix);
}

/**
 * All 118 tiles in one instanced mesh: one draw call, coloured by family. An active tile rises
 * by stretching upward from the ground, so no gap opens under it.
 */
export function Tiles({ activation }: { activation: Activation }) {
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  useFrame(() => {
    const m = mesh.current;
    if (!m || !activation.anyDirty) return;
    for (let i = 0; i < TILES.length; i++)
      if (activation.dirty[i]) writeTile(m, dummy, activation, i);
    m.instanceMatrix.needsUpdate = true;
  });

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const color = new Color();
    for (let i = 0; i < TILES.length; i++) {
      writeTile(m, dummy, activation, i);
      m.setColorAt(i, color.set(CATEGORY_COLORS[ELEMENTS[i]!.category]));
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [activation, dummy]);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, TILES.length]}>
      <boxGeometry args={[LAYOUT.tileSize, CONFIG.tiles.height, LAYOUT.tileSize]} />
      <meshStandardMaterial roughness={CONFIG.tiles.roughness} metalness={CONFIG.tiles.metalness} />
    </instancedMesh>
  );
}
