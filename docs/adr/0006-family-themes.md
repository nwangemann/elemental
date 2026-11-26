# 6. Family themes as data, drawn per instance in one material

- Status: accepted
- Date: 2026-11-26

## Context

Each element family should wake into its own surface when stepped on (brushed metal, chalky mineral, neon glow, radioactive pulse), and the DOM panel should take its accent from the same source. Designing 118 elements one by one is out of scope; families cover every element, and hero overrides for single elements come later. The tiles are one `InstancedMesh` (ADR 2), and a three material has one roughness, metalness and emissive value.

## Decision

- **Themes are data in `core/themes.ts`**, one entry per family: base colour, awake surface (roughness, metalness, glow, glow colour, pulse) and accent tokens. The panel's `accentTokens` reads from it, so tile and interface come from one entry. Hero overrides will use the same shape.
- **One material, per-instance surface.** The tile material is a `MeshStandardMaterial` patched at the chunks that set roughness, metalness and emissive, reading them from instance attributes. A pure `surfaceAt` blends each tile from a shared resting surface to its family's awake surface by activation level; only dirty tiles are rewritten.
- **Reflections from a procedural environment, without its diffuse light.** Metals need something to reflect, so the tile material gets three's `RoomEnvironment` prefiltered with `PMREMGenerator` (built at mount, nothing downloaded). Its diffuse irradiance is dropped in the shader, because it paled every family colour.

Alternatives: one instanced mesh per family (ten draw calls instead of one, and index bookkeeping between meshes); `MeshPhysicalMaterial` features such as iridescence and transmission, which are per material and so would also need a mesh per family; an HDR environment from a CDN, which is a runtime download and an asset to license.

## Consequences

- Still one draw call for all tiles (11 in the scene). Frame work walking across tiles rose from 0.9 to 2.4 ms median (3.1 ms p95) in the preview pane, mostly the environment lookups; well inside the 16.7 ms budget.
- Per-material effects (real iridescence for lanthanides, refraction for crystals) need a dedicated mesh. The planned "showcase" mesh for the active tile is where they go.
- The shader patch depends on three's chunk names; a three upgrade must check that the tiles still change surface when woken.
- Superheavy synthetic elements keep their family's theme; the table's colours stay a faithful family key. Their instability is better shown as an effect layered on top.
