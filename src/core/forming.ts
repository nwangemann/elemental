// Combine mode's forming (ADR 20): when the carried atoms match a compound, the orbs spring
// together over the figure into its ball-and-stick model, lattice chunk or ingot, which then
// turns slowly, and thin arcs link the compound's tiles on the table. Pure: positions are in
// the orbs' frame (the figure's, facing +z), written into reused arrays each frame.
import type { Compound } from './compounds/index.ts';

/** The parts of a baked shape forming reads (`compound-shapes.json`). */
export interface FormShape {
  elements: readonly string[];
  /** x, y, z per atom in ångström, centred. */
  xyz: readonly number[];
  /** [atom, atom, bond order]. */
  bonds: readonly (readonly number[])[];
}

const distance = (xyz: readonly number[], i: number, j: number) =>
  Math.hypot(
    xyz[i * 3]! - xyz[j * 3]!,
    xyz[i * 3 + 1]! - xyz[j * 3 + 1]!,
    xyz[i * 3 + 2]! - xyz[j * 3 + 2]!,
  );

/** The `pairs` key for two elements, in either order: "Cl Na". */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a} ${b}` : `${b} ${a}`;
}

/**
 * A crystal chunk's bonds: every two atoms whose element pair bonds and that are no further
 * apart than its limit, single and in atom order. Run once per crystal when the shapes load.
 */
export function crystalBonds(crystal: {
  readonly elements: readonly string[];
  readonly xyz: readonly number[];
  readonly pairs: Readonly<Record<string, number>>;
}): [number, number, number][] {
  const bonds: [number, number, number][] = [];
  const { elements } = crystal;
  for (let i = 0; i < elements.length; i++)
    for (let j = i + 1; j < elements.length; j++) {
      const limit = crystal.pairs[pairKey(elements[i]!, elements[j]!)];
      if (limit !== undefined && distance(crystal.xyz, i, j) <= limit) bonds.push([i, j, 1]);
    }
  return bonds;
}

export interface FormParams {
  /** Height of the model's centre above the figure's feet. */
  formLift: number;
  /** Radius the model is scaled to fit, world units … */
  formRadius: number;
  /** … but never more than this many world units per ångström (small molecules stay small). */
  formMaxScale: number;
  /** Atom radius in ångström; hydrogen's is smaller. */
  formAtom: number;
  formHydrogen: number;
  /** Bond radius in ångström. */
  formBond: number;
  /** Seconds for one atom's spring from its orb to its place. */
  formTime: number;
  /** Extra delay, seconds, for the lattice atoms nobody carried, growing outward. */
  formGrow: number;
  /** Turn rate of the formed model, rad/s (none with reduced motion). */
  formSpin: number;
}

/**
 * The compound shown when the carry matches: `pick` when it is one of `made` (the tray offers
 * each isomer), else the most everyday. A lone atom (argon) forms nothing: its orb stays.
 */
export function pickFormed(made: readonly Compound[], pick: string | null): Compound | undefined {
  const shown = made.filter((c) => c.kind !== 'atom');
  return shown.find((c) => c.id === pick) ?? shown[0];
}

/** Distance of a shape's atom from its centre, in ångström. */
function radiusOf(shape: FormShape, i: number): number {
  return Math.hypot(shape.xyz[i * 3]!, shape.xyz[i * 3 + 1]!, shape.xyz[i * 3 + 2]!);
}

/**
 * Which carried orb becomes each of the shape's atoms: `orbElements` gives each orb's element
 * in slot order. Orbs take the atoms of their element nearest the centre first, so a lattice
 * grows outward from what was carried. -1 for an atom no orb fills (it grows in).
 */
export function assignAtoms(orbElements: readonly string[], shape: FormShape): Int16Array {
  const out = new Int16Array(shape.elements.length).fill(-1);
  const queues = new Map<string, number[]>();
  orbElements.forEach((symbol, orb) => {
    const q = queues.get(symbol) ?? [];
    q.push(orb);
    queues.set(symbol, q);
  });
  const order = shape.elements
    .map((_, i) => i)
    .toSorted((a, b) => radiusOf(shape, a) - radiusOf(shape, b) || a - b);
  for (const i of order) {
    const orb = queues.get(shape.elements[i]!)?.shift();
    if (orb !== undefined) out[i] = orb;
  }
  return out;
}

/** World units per ångström that fit the shape, atoms included, inside `formRadius`. */
export function fitScale(shape: FormShape, p: FormParams): number {
  let r = 0;
  for (let i = 0; i < shape.elements.length; i++) r = Math.max(r, radiusOf(shape, i));
  return Math.min(p.formMaxScale, p.formRadius / (r + p.formAtom));
}

/** Atom radius in ångström. */
export const atomRadius = (symbol: string, p: FormParams): number =>
  symbol === 'H' ? p.formHydrogen : p.formAtom;

/**
 * A spring from 0 to 1 over x ∈ [0, 1]: a quick rise, a small overshoot (about 8 %) and a
 * settle, exactly 0 at the start and 1 from x = 1 on.
 */
export function springEase(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return 1 - Math.exp(-6 * x) * Math.cos(9 * x) * (1 - x);
}

/** Per-atom start delays, seconds: carried atoms go at once, the rest by distance outward. */
export function growDelays(shape: FormShape, assign: Int16Array, p: FormParams): Float32Array {
  const n = shape.elements.length;
  const out = new Float32Array(n);
  let far = 0;
  for (let i = 0; i < n; i++) far = Math.max(far, radiusOf(shape, i));
  for (let i = 0; i < n; i++)
    out[i] =
      assign[i]! >= 0 || far === 0 ? 0 : p.formGrow * (0.3 + 0.7 * (radiusOf(shape, i) / far));
  return out;
}

/** Seconds until every atom has settled (the forming animation's length). */
export function formDuration(delays: Float32Array, p: FormParams): number {
  let last = 0;
  for (const d of delays) last = Math.max(last, d);
  return last + p.formTime;
}

/**
 * Writes each atom's position (3 floats), radius in world units and progress 0…1+ (springs
 * overshoot) at `t` seconds after forming, turned `spin` radians about the vertical. Carried
 * atoms start at their orb slot (`orbSlots`, 3 floats per orb) with the orb's radius; atoms no
 * orb fills start at the centre with no size. With `reduced`, every atom is already in place.
 */
export function formAtoms(
  shape: FormShape,
  assign: Int16Array,
  delays: Float32Array,
  orbSlots: Float32Array,
  orbRadius: number,
  scale: number,
  p: FormParams,
  t: number,
  spin: number,
  reduced: boolean,
  pos: Float32Array,
  radius: Float32Array,
  progress: Float32Array,
): void {
  const cos = Math.cos(spin);
  const sin = Math.sin(spin);
  for (let i = 0; i < shape.elements.length; i++) {
    const sx = shape.xyz[i * 3]! * scale;
    const sy = shape.xyz[i * 3 + 1]! * scale;
    const sz = shape.xyz[i * 3 + 2]! * scale;
    const tx = cos * sx + sin * sz;
    const ty = p.formLift + sy;
    const tz = -sin * sx + cos * sz;
    const e = reduced ? 1 : springEase((t - delays[i]!) / p.formTime);
    const orb = assign[i]!;
    const fx = orb >= 0 ? orbSlots[orb * 3]! : 0;
    const fy = orb >= 0 ? orbSlots[orb * 3 + 1]! : p.formLift;
    const fz = orb >= 0 ? orbSlots[orb * 3 + 2]! : 0;
    pos[i * 3] = fx + (tx - fx) * e;
    pos[i * 3 + 1] = fy + (ty - fy) * e;
    pos[i * 3 + 2] = fz + (tz - fz) * e;
    const r = atomRadius(shape.elements[i]!, p) * scale;
    radius[i] = orb >= 0 ? orbRadius + (r - orbRadius) * e : r * Math.max(0, e);
    progress[i] = e;
  }
}

/** Cylinders a shape's bonds draw as: one per bond order (a double bond is two sticks). */
export function stickCount(shape: FormShape): number {
  return shape.bonds.reduce((n, b) => n + b[2]!, 0);
}

/**
 * Writes each stick's two ends (6 floats) and a thickness factor 0…1 (the less settled of its
 * two atoms, so sticks appear as the atoms arrive). Sticks of one multiple bond sit side by
 * side, `gap` apart, across the bond and the vertical (or x when the bond is vertical).
 * Returns how many sticks it wrote.
 */
export function formSticks(
  shape: FormShape,
  pos: Float32Array,
  progress: Float32Array,
  gap: number,
  ends: Float32Array,
  thickness: Float32Array,
): number {
  let k = 0;
  for (const [a, b, order] of shape.bonds) {
    const ax = pos[a! * 3]!;
    const ay = pos[a! * 3 + 1]!;
    const az = pos[a! * 3 + 2]!;
    const dx = pos[b! * 3]! - ax;
    const dy = pos[b! * 3 + 1]! - ay;
    const dz = pos[b! * 3 + 2]! - az;
    // Across the bond: d × up, or d × x for a vertical bond.
    let ox = -dz;
    let oy = 0;
    let oz = dx;
    if (Math.hypot(ox, oz) < 1e-6) {
      ox = 0;
      oy = dz;
      oz = -dy;
    }
    const len = Math.hypot(ox, oy, oz) || 1;
    ox *= gap / len;
    oy *= gap / len;
    oz *= gap / len;
    const f = Math.min(1, Math.max(0, Math.min(progress[a!]!, progress[b!]!)));
    for (let j = 0; j < order!; j++) {
      const off = j - (order! - 1) / 2;
      ends[k * 6] = ax + ox * off;
      ends[k * 6 + 1] = ay + oy * off;
      ends[k * 6 + 2] = az + oz * off;
      ends[k * 6 + 3] = ax + dx + ox * off;
      ends[k * 6 + 4] = ay + dy + oy * off;
      ends[k * 6 + 5] = az + dz + oz * off;
      thickness[k] = f;
      k++;
    }
  }
  return k;
}

/** A tile's centre on the table. */
export interface TileSpot {
  x: number;
  z: number;
}

/**
 * The table arcs: one parabola between each pair of neighbouring tiles in `spots`, from
 * `baseY` up to `lift` plus a little per unit of distance, as line-segment pairs (6 floats
 * each, `segments` per arc). Returns the floats written. One tile draws nothing.
 */
export function arcPoints(
  spots: readonly TileSpot[],
  baseY: number,
  lift: number,
  segments: number,
  out: Float32Array,
): number {
  let k = 0;
  const at = (a: TileSpot, b: TileSpot, h: number, s: number) => {
    out[k++] = a.x + (b.x - a.x) * s;
    out[k++] = baseY + 4 * h * s * (1 - s);
    out[k++] = a.z + (b.z - a.z) * s;
  };
  for (let i = 0; i + 1 < spots.length; i++) {
    const a = spots[i]!;
    const b = spots[i + 1]!;
    const h = lift + 0.15 * Math.hypot(b.x - a.x, b.z - a.z);
    for (let s = 0; s < segments; s++) {
      at(a, b, h, s / segments);
      at(a, b, h, (s + 1) / segments);
    }
  }
  return k;
}

/**
 * How much of the arcs shows `t` seconds after forming: drawn along over `draw` seconds,
 * held, then faded out over the last `fade` seconds of `life`. Returns [drawn share, opacity].
 */
export function arcPhase(t: number, draw: number, life: number, fade: number): [number, number] {
  const drawn = draw > 0 ? Math.min(1, Math.max(0, t / draw)) : 1;
  const opacity = t >= life ? 0 : Math.min(1, (life - t) / Math.max(fade, 1e-6));
  return [drawn, opacity];
}

/** Forming's clock, shared with the frame pacer: `moving` while anything still animates. */
export interface FormClock {
  /** The compound formed now, or null. */
  id: string | null;
  /** Seconds since it formed. */
  t: number;
  moving: boolean;
}

export const createFormClock = (): FormClock => ({ id: null, t: 0, moving: false });

/**
 * Advances the clock by `dt` while `id` stays formed and restarts it when another compound
 * (or none) forms. `busyFor` is how long the animation and arcs need frames. Returns `t`.
 */
export function stepFormClock(
  c: FormClock,
  id: string | null,
  dt: number,
  busyFor: number,
): number {
  if (id !== c.id) {
    c.id = id;
    c.t = 0;
  } else if (id !== null) c.t += dt;
  c.moving = id !== null && c.t < busyFor;
  return c.t;
}
