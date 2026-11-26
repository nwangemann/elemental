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
  camera: {
    fov: 40,
    /** Overview position (the establishing shot arrives with the camera step). */
    position: [0, 17, 15] as [number, number, number],
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
  camera: {
    fov: { min: 15, max: 90, step: 1 },
    position: { min: -40, max: 40, step: 0.5 },
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
