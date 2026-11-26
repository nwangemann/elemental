import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { MeshBasicMaterial, Object3D, RingGeometry, type InstancedMesh } from 'three';
import { easeLevel, type Activation } from '../core/activation.ts';
import { CONFIG } from '../core/config.ts';
import { LAYOUT, TILES } from '../core/layout.ts';
import { RING_COLOR } from '../core/palette.ts';

/** Just above the ground, so the ring never z-fights it. */
const RING_Y = 0.004;
/** Scale of a ring at the start of its animation: tucked under the tile, so it grows out. */
const START_SCALE = 0.85;

function writeRing(m: InstancedMesh, dummy: Object3D, activation: Activation, i: number): void {
  const level = activation.levels[i]!;
  const tile = TILES[i]!;
  const s = level > 0 ? START_SCALE + (1 - START_SCALE) * easeLevel(level) : 0;
  dummy.position.set(tile.x, RING_Y, tile.z);
  dummy.scale.set(s, 1, s);
  dummy.updateMatrix();
  m.setMatrixAt(i, dummy.matrix);
}

/**
 * A square highlight ring on the ground around each active tile, one instanced mesh (one draw
 * call). A ring grows out from under its tile as the tile activates and shrinks back as it
 * deactivates; at rest it is scaled to zero.
 */
export function TileRings({ activation }: { activation: Activation }) {
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const { ringInset, ringWidth } = CONFIG.tiles;

  const geometry = useMemo(() => {
    // A four-segment ring starting at 45° is a square; its radius is the half-side × √2.
    const inner = (LAYOUT.tileSize / 2 + ringInset) * Math.SQRT2;
    const outer = (LAYOUT.tileSize / 2 + ringInset + ringWidth) * Math.SQRT2;
    return new RingGeometry(inner, outer, 4, 1, Math.PI / 4).rotateX(-Math.PI / 2);
  }, [ringInset, ringWidth]);
  const material = useMemo(
    () => new MeshBasicMaterial({ color: RING_COLOR, toneMapped: false }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    for (let i = 0; i < TILES.length; i++) writeRing(m, dummy, activation, i);
    m.instanceMatrix.needsUpdate = true;
  }, [activation, dummy]);

  useFrame(() => {
    const m = mesh.current;
    if (!m || !activation.anyDirty) return;
    for (let i = 0; i < TILES.length; i++)
      if (activation.dirty[i]) writeRing(m, dummy, activation, i);
    m.instanceMatrix.needsUpdate = true;
  });

  // Resting rings are scaled to zero, so a bounding sphere from the instances would cull them.
  return (
    <instancedMesh ref={mesh} args={[geometry, material, TILES.length]} frustumCulled={false} />
  );
}
