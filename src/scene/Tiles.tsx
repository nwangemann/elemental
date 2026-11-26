import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  BoxGeometry,
  Color,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  Object3D,
  PMREMGenerator,
  type InstancedMesh,
  type MeshStandardMaterial,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { easeLevel, tileTop, type Activation } from '../core/activation.ts';
import { CONFIG } from '../core/config.ts';
import { ELEMENTS } from '../core/elements/index.ts';
import { LAYOUT, TILES } from '../core/layout.ts';
import { THEMES, surfaceAt } from '../core/themes.ts';
import {
  createTileMaterial,
  GLOW_COLOR_ATTRIBUTE,
  SURFACE_ATTRIBUTE,
  updateTileMaterial,
} from './tileMaterial.ts';

const THEME_OF_TILE = ELEMENTS.map((e) => THEMES[e.category]);

function writeTile(
  m: InstancedMesh,
  dummy: Object3D,
  surface: Float32Array,
  activation: Activation,
  i: number,
): void {
  const tile = TILES[i]!;
  const top = tileTop(activation, i);
  dummy.position.set(tile.x, top / 2, tile.z);
  dummy.scale.set(1, top / CONFIG.tiles.height, 1);
  dummy.updateMatrix();
  m.setMatrixAt(i, dummy.matrix);
  const { roughness, metalness, restMix } = CONFIG.tiles;
  surfaceAt(
    THEME_OF_TILE[i]!.awake,
    { roughness, metalness },
    restMix,
    easeLevel(activation.levels[i]!),
    surface,
    i * 4,
  );
}

/** A procedural studio environment (three's `RoomEnvironment`), prefiltered for reflections. */
function createStudioEnvironment(gl: WebGLRenderer): Texture {
  const pmrem = new PMREMGenerator(gl);
  const room = new RoomEnvironment();
  const texture = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  pmrem.dispose();
  return texture;
}

/** The tile box plus its per-instance surface (dynamic) and glow colour (fixed) attributes. */
function createTileGeometry(): BoxGeometry {
  const geometry = new BoxGeometry(LAYOUT.tileSize, CONFIG.tiles.height, LAYOUT.tileSize);
  const surface = new InstancedBufferAttribute(new Float32Array(TILES.length * 4), 4);
  const glow = new Float32Array(TILES.length * 3);
  const color = new Color();
  for (let i = 0; i < TILES.length; i++)
    color.set(THEME_OF_TILE[i]!.awake.glowColor).toArray(glow, i * 3);
  geometry.setAttribute(SURFACE_ATTRIBUTE, surface.setUsage(DynamicDrawUsage));
  geometry.setAttribute(GLOW_COLOR_ATTRIBUTE, new InstancedBufferAttribute(glow, 3));
  return geometry;
}

/**
 * All 118 tiles in one instanced mesh: one draw call. Each tile takes its family's theme
 * (`core/themes.ts`): the base colour, and a surface (roughness, metalness, glow) that blends from
 * a shared resting look into the family's awake look as the tile activates. An active tile also
 * rises by stretching upward from the ground, so no gap opens under it. Only dirty tiles are
 * rewritten. Metals reflect a procedural studio environment (three's `RoomEnvironment`), set on
 * this material only, so nothing is downloaded and the rest of the scene is lit as before.
 */
export function Tiles({ activation }: { activation: Activation }) {
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const gl = useThree((s) => s.gl);

  const material = useMemo(() => createTileMaterial(createStudioEnvironment(gl)), [gl]);
  const geometry = useMemo(() => createTileGeometry(), []);

  useEffect(
    () => () => {
      geometry.dispose();
      material.envMap?.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const { glowScale, pulseSpeed, envIntensity } = CONFIG.tiles;
    updateTileMaterial(
      m.material as MeshStandardMaterial,
      clock.elapsedTime,
      glowScale,
      pulseSpeed,
      envIntensity,
    );
    if (!activation.anyDirty) return;
    const surface = m.geometry.getAttribute(SURFACE_ATTRIBUTE) as InstancedBufferAttribute;
    for (let i = 0; i < TILES.length; i++)
      if (activation.dirty[i]) writeTile(m, dummy, surface.array as Float32Array, activation, i);
    m.instanceMatrix.needsUpdate = true;
    surface.needsUpdate = true;
  });

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const surface = m.geometry.getAttribute(SURFACE_ATTRIBUTE) as InstancedBufferAttribute;
    const color = new Color();
    for (let i = 0; i < TILES.length; i++) {
      writeTile(m, dummy, surface.array as Float32Array, activation, i);
      m.setColorAt(i, color.set(THEME_OF_TILE[i]!.color));
    }
    m.instanceMatrix.needsUpdate = true;
    surface.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [activation, dummy]);

  return <instancedMesh ref={mesh} args={[geometry, material, TILES.length]} />;
}
