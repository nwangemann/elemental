import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  Color,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  type Group,
  type InstancedMesh,
} from 'three';
import { CARRY_LIMIT, carriedCounts } from '../core/carry.ts';
import { CONFIG } from '../core/config.ts';
import type { ControllerState } from '../core/controller.ts';
import { createPose, poseOf, type GaitState } from '../core/gait.ts';
import type { LedgeState } from '../core/ledge.ts';
import { orbSlots, snapOrbFollow, stepOrbFollow, type OrbFollow } from '../core/orbs.ts';
import type { FormClock } from '../core/forming.ts';
import { useAppStore } from '../state/store.ts';
import { FormArcs, FormedModel } from './Formed.tsx';
import { orbColour, prefersReducedMotion } from './orbLook.ts';
import { useFormed } from './useFormed.ts';

const MAX_DT = 0.1;

/**
 * Combine mode's carried atoms (ADR 20): one instanced mesh of up to 24 small spheres in CPK
 * colours, stacked by element behind the figure (`core/orbs.ts`). The stacks are laid out
 * only when the carry changes; each frame the group eases after the figure's position and
 * heading (`stepOrbFollow`) and bobs with its walk (still with reduced motion). A tuning-panel
 * change remounts it, like the tiles. Hidden while Combine is closed
 * or nothing is carried. When the carry forms a compound the orbs hide and `FormedModel`
 * springs them together in the same frame (`FormArcs` draws the recipe on the table). Loaded
 * with combine's chunk on first open, so it costs a visitor who never opens Combine nothing:
 * one draw call while orbs show, three or four while a compound is formed.
 */
export default function Orbs({
  controller,
  ledge,
  gait,
  follow,
  clock,
}: {
  controller: ControllerState;
  ledge: LedgeState;
  gait: GaitState;
  /** Parent-owned, so `FramePacer` sees when the orbs are still catching up. */
  follow: OrbFollow;
  /** Parent-owned too: the pacer keeps frames coming while forming animates. */
  clock: FormClock;
}) {
  const open = useAppStore((s) => s.combine.open);
  const carry = useAppStore((s) => s.combine.carry);
  const group = useRef<Group>(null);
  const mesh = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => new SphereGeometry(1, 16, 12), []);
  const material = useMemo(() => new MeshStandardMaterial({ roughness: 0.35 }), []);
  const pose = useMemo(() => createPose(), []);
  const shown = open && carry.length > 0;
  const formed = useFormed();
  const shownFormed = shown ? formed : undefined;

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const c = CONFIG.combine;
    const counts = carriedCounts(carry);
    const slots = new Float32Array(CARRY_LIMIT.atoms * 3);
    const n = orbSlots([...counts.values()], c, slots);
    const dummy = new Object3D();
    const colour = new Color();
    let k = 0;
    for (const [symbol, count] of counts) {
      colour.set(orbColour(symbol));
      for (let j = 0; j < count; j++) m.setColorAt(k++, colour);
    }
    for (let i = 0; i < n; i++) {
      dummy.position.set(slots[i * 3]!, slots[i * 3 + 1]!, slots[i * 3 + 2]!);
      dummy.scale.setScalar(c.orbRadius);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.count = n;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [carry]);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    g.visible = shown;
    if (mesh.current) mesh.current.visible = !shownFormed;
    if (!shown) {
      snapOrbFollow(follow, controller.x, ledge.y, controller.z, controller.heading);
      return;
    }
    const c = CONFIG.combine;
    const dt = Math.min(delta, MAX_DT);
    stepOrbFollow(follow, controller.x, ledge.y, controller.z, controller.heading, c.orbFollow, dt);
    const bob = prefersReducedMotion() ? 0 : poseOf(gait, CONFIG.character, pose).bob * c.orbBob;
    g.position.set(follow.x, follow.y + bob, follow.z);
    g.rotation.y = follow.heading;
  });

  return (
    <>
      <group ref={group} visible={false}>
        <instancedMesh
          ref={mesh}
          args={[geometry, material, CARRY_LIMIT.atoms]}
          frustumCulled={false}
        />
        <FormedModel compound={shownFormed} clock={clock} />
      </group>
      <FormArcs compound={shownFormed} clock={clock} />
    </>
  );
}
