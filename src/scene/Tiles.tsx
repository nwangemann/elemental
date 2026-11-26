import { useLayoutEffect, useRef } from 'react';
import { Color, Object3D, type InstancedMesh } from 'three';
import { CONFIG } from '../core/config.ts';
import { ELEMENTS } from '../core/elements/index.ts';
import { LAYOUT, TILES } from '../core/layout.ts';
import { CATEGORY_COLORS } from '../core/palette.ts';

/** All 118 tiles in one instanced mesh: one draw call, coloured by family. */
export function Tiles() {
  const mesh = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const dummy = new Object3D();
    const color = new Color();
    for (const tile of TILES) {
      const i = tile.number - 1;
      dummy.position.set(tile.x, CONFIG.tiles.height / 2, tile.z);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, color.set(CATEGORY_COLORS[ELEMENTS[i]!.category]));
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, []);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, TILES.length]}>
      <boxGeometry args={[LAYOUT.tileSize, CONFIG.tiles.height, LAYOUT.tileSize]} />
      <meshStandardMaterial roughness={CONFIG.tiles.roughness} metalness={CONFIG.tiles.metalness} />
    </instancedMesh>
  );
}
