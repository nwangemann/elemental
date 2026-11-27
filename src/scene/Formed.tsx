import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  LineBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  SphereGeometry,
  Vector3,
  type InstancedMesh,
  type LineSegments,
} from 'three';
import { CARRY_LIMIT, carriedCounts } from '../core/carry.ts';
import type { Compound } from '../core/compounds/index.ts';
import { CONFIG } from '../core/config.ts';
import { ELEMENTS } from '../core/elements/index.ts';
import {
  arcPhase,
  arcPoints,
  assignAtoms,
  fitScale,
  formAtoms,
  formDuration,
  formSticks,
  growDelays,
  crystalBonds,
  stepFormClock,
  stickCount,
  type FormClock,
  type FormShape,
} from '../core/forming.ts';
import { TILES } from '../core/layout.ts';
import { orbSlots } from '../core/orbs.ts';
// Named imports, so the build ships only these tables of the shapes file.
import { crystals, molecules } from '../data/compound-shapes.json';
import { useAppStore } from '../state/store.ts';
import { orbColour, prefersReducedMotion } from './orbLook.ts';

const MAX_DT = 0.1;
const MOLECULES: Readonly<Record<string, FormShape>> = molecules;
// Crystals ship bond rules, not bonds (smaller); their bonds are found once, here.
const CRYSTALS: Readonly<Record<string, FormShape>> = Object.fromEntries(
  Object.entries(crystals).map(([id, c]) => [id, { ...c, bonds: crystalBonds(c) }]),
);
const SHAPES = [...Object.values(MOLECULES), ...Object.values(CRYSTALS)];
const MAX_ATOMS = Math.max(...SHAPES.map((s) => s.elements.length));
const MAX_STICKS = Math.max(...SHAPES.map(stickCount));
/** At most five elements, so four arcs. */
const ARC_SEGMENTS = 24;
const MAX_ARC_FLOATS = (CARRY_LIMIT.elements - 1) * ARC_SEGMENTS * 6;
const NUMBER = new Map(ELEMENTS.map((e) => [e.symbol, e.number]));
const STICK_COLOUR = '#d8dee8';
const ARC_COLOUR = '#ffe7a0';
const UP = new Vector3(0, 1, 0);

const shapeOf = (c: Compound): FormShape | undefined =>
  (c.kind === 'molecule' ? MOLECULES : CRYSTALS)[c.id];

/** Everything one formed compound needs, built when it forms or the carry changes. */
interface Plan {
  id: string;
  shape: FormShape;
  assign: Int16Array;
  delays: Float32Array;
  scale: number;
  duration: number;
  slots: Float32Array;
}

function planFor(compound: Compound, carry: readonly string[]): Plan | null {
  const shape = shapeOf(compound);
  if (!shape) return null;
  const c = CONFIG.combine;
  const counts = carriedCounts(carry);
  const orbElements: string[] = [];
  for (const [symbol, n] of counts) for (let j = 0; j < n; j++) orbElements.push(symbol);
  const slots = new Float32Array(CARRY_LIMIT.atoms * 3);
  orbSlots([...counts.values()], c, slots);
  const assign = assignAtoms(orbElements, shape);
  const delays = growDelays(shape, assign, c);
  return {
    id: compound.id,
    shape,
    assign,
    delays,
    scale: fitScale(shape, c),
    duration: formDuration(delays, c),
    slots,
  };
}

/**
 * Combine mode's formed compound (ADR 20), drawn in the orbs' frame so it rides with the
 * figure: when the carry matches, the carried orbs spring from their slots into the
 * compound's ball-and-stick shape over the figure's head (uncarried lattice atoms grow in
 * from the centre, outward), and it then turns slowly. Two instanced meshes, atoms and
 * sticks. Reduced motion: the model fades in where it ends and does not turn. Ticks `clock`,
 * which `FormArcs` and the frame pacer read.
 */
export function FormedModel({
  compound,
  clock,
}: {
  compound: Compound | undefined;
  clock: FormClock;
}) {
  const carry = useAppStore((s) => s.combine.carry);
  const atoms = useRef<InstancedMesh>(null);
  const sticks = useRef<InstancedMesh>(null);
  const sphere = useMemo(() => new SphereGeometry(1, 16, 12), []);
  const cylinder = useMemo(() => new CylinderGeometry(1, 1, 1, 8, 1, true), []);
  const atomMaterial = useMemo(() => new MeshStandardMaterial({ roughness: 0.35 }), []);
  const stickMaterial = useMemo(
    () => new MeshStandardMaterial({ color: STICK_COLOUR, roughness: 0.5 }),
    [],
  );
  const plan = useMemo(() => (compound ? planFor(compound, carry) : null), [compound, carry]);
  const scratch = useMemo(
    () => ({
      pos: new Float32Array(MAX_ATOMS * 3),
      radius: new Float32Array(MAX_ATOMS),
      progress: new Float32Array(MAX_ATOMS),
      ends: new Float32Array(MAX_STICKS * 6),
      thick: new Float32Array(MAX_STICKS),
      dummy: new Object3D(),
      a: new Vector3(),
      b: new Vector3(),
      q: new Quaternion(),
    }),
    [],
  );

  useEffect(
    () => () => {
      sphere.dispose();
      cylinder.dispose();
      atomMaterial.dispose();
      stickMaterial.dispose();
    },
    [sphere, cylinder, atomMaterial, stickMaterial],
  );

  useEffect(() => {
    const m = atoms.current;
    if (!m || !plan) return;
    const colour = new Color();
    plan.shape.elements.forEach((symbol, i) => m.setColorAt(i, colour.set(orbColour(symbol))));
    m.count = plan.shape.elements.length;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [plan]);

  useFrame((_, delta) => {
    const m = atoms.current;
    const s = sticks.current;
    if (!m || !s) return;
    const c = CONFIG.combine;
    const t = stepFormClock(
      clock,
      plan?.id ?? null,
      Math.min(delta, MAX_DT),
      Math.max(plan?.duration ?? 0, c.arcLife),
    );
    m.visible = s.visible = plan !== null;
    if (!plan) return;
    const reduced = prefersReducedMotion();
    const { shape } = plan;
    const { pos, radius, progress, ends, thick, dummy, a, b, q } = scratch;
    formAtoms(
      shape,
      plan.assign,
      plan.delays,
      plan.slots,
      c.orbRadius,
      plan.scale,
      c,
      t,
      reduced ? 0 : t * c.formSpin,
      reduced,
      pos,
      radius,
      progress,
    );
    const n = shape.elements.length;
    dummy.quaternion.identity();
    for (let i = 0; i < n; i++) {
      dummy.position.set(pos[i * 3]!, pos[i * 3 + 1]!, pos[i * 3 + 2]!);
      dummy.scale.setScalar(Math.max(radius[i]!, 1e-4));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;

    const bondR = c.formBond * plan.scale;
    const k = formSticks(shape, pos, progress, bondR * 2.6, ends, thick);
    for (let i = 0; i < k; i++) {
      a.set(ends[i * 6]!, ends[i * 6 + 1]!, ends[i * 6 + 2]!);
      b.set(ends[i * 6 + 3]!, ends[i * 6 + 4]!, ends[i * 6 + 5]!);
      dummy.position.addVectors(a, b).multiplyScalar(0.5);
      b.sub(a);
      const len = b.length();
      q.setFromUnitVectors(UP, len > 1e-6 ? b.divideScalar(len) : UP);
      dummy.quaternion.copy(q);
      const r = Math.max(bondR * thick[i]!, 1e-4);
      dummy.scale.set(r, len, r);
      dummy.updateMatrix();
      s.setMatrixAt(i, dummy.matrix);
    }
    s.count = k;
    s.instanceMatrix.needsUpdate = true;

    // Reduced motion fades the model in; otherwise it is opaque throughout.
    const fade = reduced ? Math.min(1, t / Math.max(c.formTime, 1e-3)) : 1;
    for (const material of [m.material, s.material] as MeshStandardMaterial[]) {
      material.transparent = fade < 1;
      material.opacity = fade;
    }
  });

  return (
    <>
      <instancedMesh
        ref={atoms}
        args={[sphere, atomMaterial, MAX_ATOMS]}
        frustumCulled={false}
        visible={false}
      />
      <instancedMesh
        ref={sticks}
        args={[cylinder, stickMaterial, MAX_STICKS]}
        frustumCulled={false}
        visible={false}
      />
    </>
  );
}

/**
 * The table's half of forming (ADR 20): thin arcs from tile to tile through the compound's
 * elements, in formula order, drawn along as it forms, then faded out. One line mesh in world
 * space, hidden once faded, for a single element (O₂) and while nothing is formed.
 */
export function FormArcs({
  compound,
  clock,
}: {
  compound: Compound | undefined;
  clock: FormClock;
}) {
  const lines = useRef<LineSegments>(null);
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(MAX_ARC_FLOATS), 3));
    return g;
  }, []);
  const material = useMemo(
    () => new LineBasicMaterial({ color: ARC_COLOUR, transparent: true, depthWrite: false }),
    [],
  );
  const vertices = useMemo(() => {
    if (!compound) return 0;
    const spots = compound.elements.flatMap((e) => {
      const tile = TILES[(NUMBER.get(e.symbol) ?? 0) - 1];
      return tile ? [tile] : [];
    });
    const attr = geometry.getAttribute('position') as BufferAttribute;
    const c = CONFIG.combine;
    const floats = arcPoints(
      spots,
      CONFIG.tiles.height,
      c.arcLift,
      ARC_SEGMENTS,
      attr.array as Float32Array,
    );
    attr.needsUpdate = true;
    geometry.computeBoundingSphere();
    return floats / 3;
  }, [compound, geometry]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(() => {
    const l = lines.current;
    if (!l) return;
    const c = CONFIG.combine;
    // Reduced motion shows the arcs whole, then fades them as usual.
    const draw = prefersReducedMotion() ? 0 : c.arcDraw;
    const [drawn, opacity] = arcPhase(clock.t, draw, c.arcLife, c.arcFade);
    l.visible = vertices > 0 && clock.id === compound?.id && opacity > 0;
    if (!l.visible) return;
    // Whole segments only: an odd count would join the end of one to the start of the next.
    l.geometry.setDrawRange(0, Math.floor((vertices * drawn) / 2) * 2);
    (l.material as LineBasicMaterial).opacity = opacity;
  });

  return (
    <lineSegments ref={lines} args={[geometry, material]} frustumCulled={false} visible={false} />
  );
}
