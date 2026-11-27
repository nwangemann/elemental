import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import {
  BufferAttribute,
  Color,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  ShaderMaterial,
  TextureLoader,
  UniformsLib,
  UniformsUtils,
  type Texture,
} from 'three';
import atlasUrl from '../assets/label-atlas.png';
import atlasMetrics from '../assets/label-atlas.json';
import { tileTop, type Activation } from '../core/activation.ts';
import { CONFIG } from '../core/config.ts';
import { ELEMENTS } from '../core/elements/index.ts';
import {
  labelInstances,
  type AtlasMetrics,
  type LabelInstances,
  type LabelSpec,
} from '../core/labelLayout.ts';
import { LAYOUT, TILES } from '../core/layout.ts';
import { LABEL_COLOR } from '../core/palette.ts';

// JSON imports widen tuples to arrays; `npm run atlas` writes this file to `AtlasMetrics`.
const METRICS = atlasMetrics as unknown as AtlasMetrics;

const VERTEX = /* glsl */ `
attribute vec4 aRect;
attribute vec4 aUv;
attribute float aTop;
varying vec2 vUv;
#include <fog_pars_vertex>
void main() {
  vUv = mix(aUv.xy, aUv.zw, position.xy);
  vec3 world = vec3(mix(aRect.x, aRect.z, position.x), aTop, mix(aRect.y, aRect.w, position.y));
  vec4 mvPosition = modelViewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAGMENT = /* glsl */ `
uniform sampler2D uAtlas;
uniform vec3 uColor;
varying vec2 vUv;
#include <fog_pars_fragment>
void main() {
  float field = texture2D(uAtlas, vUv).r;
  // Half a screen pixel of field either side of the edge: crisp when near, soft when far.
  float w = max(fwidth(field) * 0.5, 1e-4);
  float alpha = smoothstep(0.5 - w, 0.5 + w, field);
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(uColor, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

/** One shared atlas texture: loaded once, kept for the app's life (remounts reuse it). */
let atlas: Texture | undefined;
function atlasTexture(): Texture {
  if (atlas) return atlas;
  atlas = new TextureLoader().load(atlasUrl);
  atlas.flipY = false;
  atlas.minFilter = LinearMipmapLinearFilter;
  atlas.magFilter = LinearFilter;
  return atlas;
}

/** Symbol centred on each tile, atomic number in its top-left corner. */
function tileLabels(): LabelSpec[] {
  const corner = LAYOUT.tileSize / 2 - CONFIG.labels.numberInset;
  return TILES.flatMap((tile) => {
    const i = tile.number - 1;
    return [
      {
        tile: i,
        text: ELEMENTS[i]!.symbol,
        size: CONFIG.labels.symbolSize,
        anchorX: 'center',
        anchorY: 'middle',
        x: tile.x,
        z: tile.z + 0.06,
      },
      {
        tile: i,
        text: String(tile.number),
        size: CONFIG.labels.numberSize,
        anchorX: 'left',
        anchorY: 'top',
        x: tile.x - corner,
        z: tile.z - corner,
      },
    ] satisfies LabelSpec[];
  });
}

/** Writes each glyph's height (its tile's top plus the lift); only dirty tiles unless `all`. */
function writeTops(
  top: Float32Array,
  glyphs: LabelInstances,
  activation: Activation,
  all: boolean,
): void {
  for (let g = 0; g < glyphs.count; g++) {
    const i = glyphs.tile[g]!;
    if (all || activation.dirty[i]) top[g] = tileTop(activation, i) + CONFIG.labels.lift;
  }
}

function createLabelMesh(glyphs: LabelInstances, activation: Activation): Mesh {
  const geometry = new InstancedBufferGeometry();
  // A unit quad in (x, y) = (across, down the text); the shader maps it onto each glyph's rect.
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array([0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0]), 3),
  );
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.setAttribute('aRect', new InstancedBufferAttribute(glyphs.rect, 4));
  geometry.setAttribute('aUv', new InstancedBufferAttribute(glyphs.uv, 4));
  const top = new Float32Array(glyphs.count);
  writeTops(top, glyphs, activation, true);
  geometry.setAttribute('aTop', new InstancedBufferAttribute(top, 1).setUsage(DynamicDrawUsage));
  geometry.instanceCount = glyphs.count;

  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      { uColor: { value: new Color(LABEL_COLOR) }, uAtlas: { value: null } },
    ]),
    transparent: true,
    depthWrite: false,
    fog: true,
  });
  // UniformsUtils.merge clones values; the texture must be the shared one.
  material.uniforms.uAtlas!.value = atlasTexture();

  const mesh = new Mesh(geometry, material);
  // Glyph positions live in instance attributes, so three's bounds cannot see them; the labels
  // cover the table and are drawn whenever it is. They are never a tap target either.
  mesh.frustumCulled = false;
  mesh.raycast = () => {};
  return mesh;
}

/**
 * Symbol and atomic number on every tile, drawn from a baked signed-distance-field atlas
 * (`npm run atlas`, ADR 0013) as one instanced quad per glyph: one draw call, nothing fetched but
 * the atlas image, no workers. Each glyph knows its tile and rides it: its height is a per-instance
 * attribute rewritten for dirty tiles.
 */
export function Labels({ activation }: { activation: Activation }) {
  const glyphs = useMemo(() => labelInstances(METRICS, tileLabels()), []);
  const mesh = useMemo(() => createLabelMesh(glyphs, activation), [glyphs, activation]);

  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as ShaderMaterial).dispose();
    },
    [mesh],
  );

  useFrame(() => {
    if (!activation.anyDirty) return;
    const top = mesh.geometry.getAttribute('aTop') as InstancedBufferAttribute;
    writeTops(top.array as Float32Array, glyphs, activation, false);
    top.needsUpdate = true;
  });

  return <primitive object={mesh} />;
}
