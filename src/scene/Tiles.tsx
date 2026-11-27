import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  BoxGeometry,
  type BufferAttribute,
  type InterleavedBufferAttribute,
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
import { eraGrey, type EraEase } from '../core/discovery.ts';
import { ELEMENTS } from '../core/elements/index.ts';
import { NO_FILTERS, type Filters } from '../core/explorer.ts';
import {
  colourTargets,
  filterDim,
  shownDim,
  stepDim,
  tintAt,
  type TintEase,
} from '../core/lens.ts';
import type { Rgb } from '../core/palette.ts';
import { LAYOUT, TILES } from '../core/layout.ts';
import type { PhaseEase } from '../core/temperature.ts';
import { THEMES, surfaceAt } from '../core/themes.ts';
import { useAppStore } from '../state/store.ts';
import {
  createTileMaterial,
  DIM_ATTRIBUTE,
  GLOW_COLOR_ATTRIBUTE,
  PHASE_ATTRIBUTE,
  SURFACE_ATTRIBUTE,
  updateTileMaterial,
} from './tileMaterial.ts';

const THEME_OF_TILE = ELEMENTS.map((e) => THEMES[e.category]);
/** Each tile's family colour in linear light: what the tile underfoot blends back to. */
const THEME_COLOURS = colourTargets(ELEMENTS, null);
const TINT: Rgb = { r: 0, g: 0, b: 0 };

/** Writes tile i's instance colour: its colour-lens tint, back toward its theme as it wakes. */
function writeColour(out: Float32Array, tint: TintEase, activation: Activation, i: number): void {
  tintAt(tint, THEME_COLOURS, i, easeLevel(activation.levels[i]!), TINT);
  out[i * 3] = TINT.r;
  out[i * 3 + 1] = TINT.g;
  out[i * 3 + 2] = TINT.b;
}

const prefersReducedMotion = (): boolean =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Each tile's filter dim: where it is now, and where the explorer's filters want it. */
interface Dim {
  levels: Float32Array;
  targets: Float32Array;
  moving: boolean;
}

/** Dim state that starts at its targets: tiles already filtered out on mount appear dimmed. */
function createDim(filters: Filters): Dim {
  const targets = filterDim(ELEMENTS, filters);
  return { levels: targets.slice(), targets, moving: true };
}

const EMPTY_DIM = createDim(NO_FILTERS);

/**
 * Writes every tile's shown dim into the `aDim` buffer: the strongest of the filters' dim, the
 * temperature lens's unknown dim (`CONFIG.tiles.unknownDim` of it) and the discovery lens's grey
 * (`CONFIG.tiles.eraDim` of it), lifted as the tile wakes.
 */
function writeDim(
  out: Float32Array,
  dim: Dim,
  phase: PhaseEase,
  era: EraEase,
  activation: Activation,
): void {
  const { unknownDim, eraDim } = CONFIG.tiles;
  for (let i = 0; i < out.length; i++) {
    const level = Math.max(
      dim.levels[i]!,
      phase.unknown[i]! * unknownDim,
      eraGrey(era.levels[i]!) * eraDim,
    );
    out[i] = shownDim(level, easeLevel(activation.levels[i]!));
  }
}

/** Copies the temperature lens's shown phase into the `aPhase` buffer. */
function writePhase(
  attribute: BufferAttribute | InterleavedBufferAttribute,
  phase: PhaseEase,
): void {
  (attribute.array as Float32Array).set(phase.levels);
  attribute.needsUpdate = true;
}

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
  const dim = new InstancedBufferAttribute(new Float32Array(TILES.length), 1);
  geometry.setAttribute(DIM_ATTRIBUTE, dim.setUsage(DynamicDrawUsage));
  const phase = new InstancedBufferAttribute(new Float32Array(TILES.length), 1);
  geometry.setAttribute(PHASE_ATTRIBUTE, phase.setUsage(DynamicDrawUsage));
  return geometry;
}

/**
 * All 118 tiles in one instanced mesh: one draw call. Each tile takes its family's theme
 * (`core/themes.ts`): the base colour, and a surface (roughness, metalness, glow) that blends from
 * a shared resting look into the family's awake look as the tile activates. An active tile also
 * rises by stretching upward from the ground, so no gap opens under it. Only dirty tiles are
 * rewritten. Metals reflect a procedural studio environment (three's `RoomEnvironment`), set on
 * this material only, so nothing is downloaded and the rest of the scene is lit as before.
 * Tiles the explorer's filters exclude fade to a grey, darker look (`aDim`, `core/lens.ts`) over
 * `CONFIG.tiles.dimDuration` (at once with reduced motion); the tile underfoot keeps its colour.
 * Instance colours come from the colour lens's `tint` (`ColourLens`): all of them while it eases,
 * otherwise only tiles whose activation changed, since the tile underfoot blends back to its theme.
 * The temperature lens's `phase` (`TemperatureLens`) fills `aPhase`, which fades gas tiles by a
 * screen door and ripples liquid ones (`CONFIG.tiles.ripple`, off with reduced motion), and dims
 * tiles whose state is unknown; both attributes are rewritten only while it moves. The discovery
 * lens's `era` (`DiscoveryLens`) greys tiles not yet discovered through the same dim; their sink
 * comes through `tileTop`.
 */
export function Tiles({
  activation,
  tint,
  phase,
  era,
}: {
  activation: Activation;
  tint: TintEase;
  phase: PhaseEase;
  era: EraEase;
}) {
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const gl = useThree((s) => s.gl);

  const material = useMemo(() => createTileMaterial(createStudioEnvironment(gl)), [gl]);
  const geometry = useMemo(() => createTileGeometry(), []);
  const dimRef = useRef<Dim>(EMPTY_DIM);

  // Targets come from the store's filters now and whenever the player changes one; no re-render.
  useEffect(() => {
    dimRef.current = createDim(useAppStore.getState().lens.filters);
    return useAppStore.subscribe((s, prev) => {
      if (s.lens.filters === prev.lens.filters) return;
      filterDim(ELEMENTS, s.lens.filters, dimRef.current.targets);
      dimRef.current.moving = true;
    });
  }, []);

  useEffect(
    () => () => {
      geometry.dispose();
      material.envMap?.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(({ clock }, dt) => {
    const m = mesh.current;
    if (!m) return;
    const dim = dimRef.current;
    const { glowScale, pulseSpeed, envIntensity, dimStrength, dimDuration, gasFade } = CONFIG.tiles;
    const reduced = prefersReducedMotion();
    updateTileMaterial(
      m.material as MeshStandardMaterial,
      clock.elapsedTime,
      glowScale,
      pulseSpeed,
      envIntensity,
      dimStrength,
      gasFade,
      reduced ? 0 : CONFIG.tiles.ripple,
      CONFIG.tiles.rippleSpeed,
    );
    const dimChanged = dim.moving;
    if (dim.moving) dim.moving = stepDim(dim.levels, dim.targets, dt, reduced ? 0 : dimDuration);
    if (dimChanged || phase.moved || era.moved || activation.anyDirty) {
      const shown = m.geometry.getAttribute(DIM_ATTRIBUTE) as InstancedBufferAttribute;
      writeDim(shown.array as Float32Array, dim, phase, era, activation);
      shown.needsUpdate = true;
    }
    if (phase.moved) writePhase(m.geometry.getAttribute(PHASE_ATTRIBUTE), phase);
    const colours = m.instanceColor;
    if (colours && (tint.moved || activation.anyDirty)) {
      const out = colours.array as Float32Array;
      for (let i = 0; i < TILES.length; i++)
        if (tint.moved || activation.dirty[i]) writeColour(out, tint, activation, i);
      colours.needsUpdate = true;
    }
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
      m.setColorAt(i, color); // creates `instanceColor`; the tint writes the real colour below
      writeColour(m.instanceColor!.array as Float32Array, tint, activation, i);
    }
    const shown = m.geometry.getAttribute(DIM_ATTRIBUTE) as InstancedBufferAttribute;
    writeDim(shown.array as Float32Array, dimRef.current, phase, era, activation);
    shown.needsUpdate = true;
    writePhase(m.geometry.getAttribute(PHASE_ATTRIBUTE), phase);
    m.instanceMatrix.needsUpdate = true;
    surface.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [activation, dummy, tint, phase, era]);

  // The height lens moves tiles after the bounds are computed; the table is always in view anyway.
  return (
    <instancedMesh ref={mesh} args={[geometry, material, TILES.length]} frustumCulled={false} />
  );
}
