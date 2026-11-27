import { MeshStandardMaterial, type IUniform, type Texture } from 'three';

/** Per-instance attribute names the tile shader reads. */
export const SURFACE_ATTRIBUTE = 'aSurface';
export const GLOW_COLOR_ATTRIBUTE = 'aGlowColor';
export const DIM_ATTRIBUTE = 'aDim';
export const PHASE_ATTRIBUTE = 'aPhase';

export interface TileUniforms {
  uTime: IUniform<number>;
  uGlowScale: IUniform<number>;
  uPulseSpeed: IUniform<number>;
  uDimStrength: IUniform<number>;
  uGasFade: IUniform<number>;
}

/**
 * The tiles' one material: a standard PBR material whose roughness, metalness and glow come per
 * instance instead of per material, so every family's surface fits in a single draw call.
 *
 * `aSurface` (vec4) is `[roughness, metalness, glow, pulse]`, written by `surfaceAt` from the
 * tile's activation; `aGlowColor` (vec3, linear) is the family's glow colour. The glow breathes
 * by `pulse` at `uPulseSpeed`. The shader is patched at the three chunks that set these values
 * (`roughnessmap_fragment`, `metalnessmap_fragment`, `emissivemap_fragment`), so lighting, fog
 * and tone mapping stay three's own. The environment map adds reflections only
 * (`lights_fragment_maps` drops its diffuse irradiance), so it makes metals read as metal without
 * paling every family colour. `aDim` (float, 0–1) greys and darkens a tile by `uDimStrength`
 * and fades its glow, for tiles the explorer's filters exclude (`core/lens.ts`) and tiles whose
 * state the temperature lens cannot tell. `aPhase` (float, 0 solid → 1 liquid → 2 gas) makes gas
 * tiles see-through by a screen door: a 4×4 ordered-dither pattern in screen space drops up to
 * `uGasFade` of their pixels, so they stay in the one opaque draw call with no sorting.
 */
export function createTileMaterial(envMap: Texture | null): MeshStandardMaterial {
  const uniforms: TileUniforms = {
    uTime: { value: 0 },
    uGlowScale: { value: 1 },
    uPulseSpeed: { value: 0 },
    uDimStrength: { value: 0 },
    uGasFade: { value: 0 },
  };
  const material = new MeshStandardMaterial({ envMap });
  material.userData.uniforms = uniforms;
  material.customProgramCacheKey = () => 'elemental-tiles';
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute vec4 ${SURFACE_ATTRIBUTE};
attribute vec3 ${GLOW_COLOR_ATTRIBUTE};
attribute float ${DIM_ATTRIBUTE};
attribute float ${PHASE_ATTRIBUTE};
varying vec4 vSurface;
varying vec3 vGlowColor;
varying float vDim;
varying float vPhase;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vSurface = ${SURFACE_ATTRIBUTE};
vGlowColor = ${GLOW_COLOR_ATTRIBUTE};
vDim = ${DIM_ATTRIBUTE};
vPhase = ${PHASE_ATTRIBUTE};`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uTime;
uniform float uGlowScale;
uniform float uPulseSpeed;
uniform float uDimStrength;
uniform float uGasFade;
varying vec4 vSurface;
varying vec3 vGlowColor;
varying float vDim;
varying float vPhase;
// 4x4 ordered-dither thresholds, centred in (0, 1).
const float BAYER[16] = float[16](
  0.5, 8.5, 2.5, 10.5, 12.5, 4.5, 14.5, 6.5, 3.5, 11.5, 1.5, 9.5, 15.5, 7.5, 13.5, 5.5);`,
      )
      // Gas tiles turn see-through by a screen door: drop the pixels under the dither threshold.
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
float gas = smoothstep(0.0, 1.0, clamp(vPhase - 1.0, 0.0, 1.0));
ivec2 cell = ivec2(gl_FragCoord.xy) & 3;
if (gas * uGasFade * 16.0 > BAYER[cell.y * 4 + cell.x]) discard;`,
      )
      // Dimmed tiles (filtered out by the explorer) go grey and dark; metals' reflections follow,
      // since their specular colour is this diffuse colour.
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
float dimmed = vDim * uDimStrength;
float grey = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(grey), dimmed) * (1.0 - 0.75 * dimmed);`,
      )
      // Reflections only: the environment's diffuse light would wash out the family colours.
      .replace(
        '#include <lights_fragment_maps>',
        `#include <lights_fragment_maps>
iblIrradiance = vec3(0.0);`,
      )
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vSurface.x;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vSurface.y;')
      .replace(
        '#include <emissivemap_fragment>',
        `float breath = 1.0 - vSurface.w * 0.5 * (1.0 + sin(uTime * uPulseSpeed));
totalEmissiveRadiance = vGlowColor * vSurface.z * uGlowScale * breath * (1.0 - dimmed);`,
      );
  };
  return material;
}

/** Per-frame values for the tile material: time for the pulse, and the live tuning values. */
export function updateTileMaterial(
  material: MeshStandardMaterial,
  time: number,
  glowScale: number,
  pulseSpeed: number,
  envIntensity: number,
  dimStrength: number,
  gasFade: number,
): void {
  const uniforms = material.userData.uniforms as TileUniforms;
  uniforms.uDimStrength.value = dimStrength;
  uniforms.uGasFade.value = gasFade;
  uniforms.uTime.value = time;
  uniforms.uGlowScale.value = glowScale;
  uniforms.uPulseSpeed.value = pulseSpeed;
  material.envMapIntensity = envIntensity;
}
