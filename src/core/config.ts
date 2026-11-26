/**
 * Visual and feel parameters in one typed place. World units match `LAYOUT` (a tile is 1 wide).
 *
 * `CONFIG_DEFAULTS` holds the shipped values. `CONFIG` is a mutable copy that the app reads; the
 * dev-only tuning panel (`?tune`) writes to it through `setConfig`, which notifies subscribers.
 * Per-frame code reads `CONFIG` each frame and needs no subscription; code that builds objects
 * once (geometry, label batches) subscribes and rebuilds on change.
 */
export const CONFIG_DEFAULTS = {
  tiles: {
    /** Height of a resting tile above the ground. */
    height: 0.18,
    roughness: 0.55,
    metalness: 0.05,
  },
  labels: {
    /** Cap height of the element symbol, in world units. */
    symbolSize: 0.42,
    /** Size of the atomic number in the tile's top-left corner. */
    numberSize: 0.16,
    /** Inset of the atomic number from the tile edge. */
    numberInset: 0.09,
    /** Lift above the tile top, to avoid z-fighting. */
    lift: 0.002,
  },
  character: {
    /** Body height (capsule, end to end) and radius, world units. */
    height: 0.62,
    radius: 0.2,
    /** Speed at which the walk cycle is fully blended in, units/s. */
    walkSpeed: 2.2,
    /** Distance per full walk cycle (two steps). */
    strideLength: 0.9,
    blendRate: 8,
    breathRate: 0.35,
    breathAmount: 0.025,
    bobHeight: 0.035,
    stepSquash: 0.04,
    footLift: 0.06,
    armSwing: 0.7,
    /** Controller (see `core/controller.ts`): top speed in units/s and the Shift fraction. */
    moveSpeed: 2.6,
    slowFactor: 0.4,
    /** Velocity response while keys are held and after release, 1/s. */
    accelRate: 7,
    decelRate: 9,
    /** Turn toward travel direction, 1/s. */
    turnRate: 12,
    /** Lean into turns: amount per (rad/s × units/s), cap in radians, response in 1/s. */
    leanAmount: 0.025,
    maxLean: 0.25,
    leanRate: 10,
  },
  camera: {
    fov: 40,
    /** Overview position, where the establishing shot starts. */
    position: [0, 17, 15] as [number, number, number],
    /** Point the overview camera looks at. */
    target: [0, 0, 0] as [number, number, number],
    /** Follow camera (see `core/camera.ts`): spring frequency 1/s and look-ahead in seconds. */
    followRate: 5,
    lookAhead: 0.3,
    focusHeight: 0.4,
    /** View angle above the horizon, degrees, and distance to the focus point with its limits. */
    pitch: 48,
    distance: 8,
    minDistance: 3,
    maxDistance: 24,
    /** Log-distance per key press or 100 px of wheel, and how fast zoom eases, 1/s. */
    zoomStep: 0.18,
    zoomRate: 10,
    /** Establishing shot: seconds on the overview, then seconds to glide down. */
    introDelay: 0.5,
    introDuration: 2,
  },
};

export type Config = typeof CONFIG_DEFAULTS;
export type ConfigGroup = keyof Config;
export type ConfigValue = number | [number, number, number];

/** Slider bounds for the tuning panel. Every number in `CONFIG_DEFAULTS` has one. */
export type Range = { min: number; max: number; step: number };

export const CONFIG_RANGES: { [G in ConfigGroup]: { [K in keyof Config[G]]: Range } } = {
  tiles: {
    height: { min: 0.02, max: 1, step: 0.01 },
    roughness: { min: 0, max: 1, step: 0.01 },
    metalness: { min: 0, max: 1, step: 0.01 },
  },
  labels: {
    symbolSize: { min: 0.1, max: 0.8, step: 0.01 },
    numberSize: { min: 0.05, max: 0.4, step: 0.01 },
    numberInset: { min: 0, max: 0.3, step: 0.01 },
    lift: { min: 0, max: 0.02, step: 0.001 },
  },
  character: {
    height: { min: 0.3, max: 1.2, step: 0.01 },
    radius: { min: 0.1, max: 0.4, step: 0.01 },
    walkSpeed: { min: 0.5, max: 6, step: 0.1 },
    strideLength: { min: 0.3, max: 2, step: 0.05 },
    blendRate: { min: 1, max: 30, step: 0.5 },
    breathRate: { min: 0, max: 1.5, step: 0.05 },
    breathAmount: { min: 0, max: 0.1, step: 0.005 },
    bobHeight: { min: 0, max: 0.15, step: 0.005 },
    stepSquash: { min: 0, max: 0.2, step: 0.005 },
    footLift: { min: 0, max: 0.2, step: 0.005 },
    armSwing: { min: 0, max: 1.5, step: 0.05 },
    moveSpeed: { min: 0.5, max: 8, step: 0.1 },
    slowFactor: { min: 0.1, max: 1, step: 0.05 },
    accelRate: { min: 1, max: 30, step: 0.5 },
    decelRate: { min: 1, max: 30, step: 0.5 },
    turnRate: { min: 1, max: 40, step: 0.5 },
    leanAmount: { min: 0, max: 0.1, step: 0.005 },
    maxLean: { min: 0, max: 0.6, step: 0.01 },
    leanRate: { min: 1, max: 30, step: 0.5 },
  },
  camera: {
    fov: { min: 15, max: 90, step: 1 },
    position: { min: -40, max: 40, step: 0.5 },
    target: { min: -20, max: 20, step: 0.5 },
    followRate: { min: 0.5, max: 20, step: 0.5 },
    lookAhead: { min: 0, max: 1.5, step: 0.05 },
    focusHeight: { min: 0, max: 2, step: 0.05 },
    pitch: { min: 10, max: 89, step: 1 },
    distance: { min: 2, max: 40, step: 0.5 },
    minDistance: { min: 1, max: 20, step: 0.5 },
    maxDistance: { min: 5, max: 60, step: 0.5 },
    zoomStep: { min: 0.02, max: 0.6, step: 0.01 },
    zoomRate: { min: 1, max: 30, step: 0.5 },
    introDelay: { min: 0, max: 3, step: 0.1 },
    introDuration: { min: 0, max: 6, step: 0.1 },
  },
};

export function cloneDefaults(): Config {
  return structuredClone(CONFIG_DEFAULTS);
}

export const CONFIG: Config = cloneDefaults();

const listeners = new Set<() => void>();
let version = 0;

/** Sets one value and notifies subscribers. Arrays are copied so callers can reuse theirs. */
export function setConfig<G extends ConfigGroup, K extends keyof Config[G]>(
  group: G,
  key: K,
  value: Config[G][K],
): void {
  const next = Array.isArray(value) ? ([...value] as Config[G][K]) : value;
  if (CONFIG[group][key] === next) return;
  CONFIG[group][key] = next;
  version++;
  for (const listener of listeners) listener();
}

/** Restores every value to `CONFIG_DEFAULTS` and notifies subscribers once. */
export function resetConfig(): void {
  const fresh = cloneDefaults();
  for (const group of Object.keys(fresh) as ConfigGroup[])
    Object.assign(CONFIG[group], fresh[group]);
  version++;
  for (const listener of listeners) listener();
}

/** Subscribes to config changes; returns the unsubscribe function. */
export function subscribeConfig(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Increases on every change, so a version can serve as a dependency or snapshot. */
export function configVersion(): number {
  return version;
}
