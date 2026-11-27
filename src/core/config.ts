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
    /** How far the tile under the character rises, and how long entering or leaving takes, s. */
    rise: 0.1,
    activateDuration: 0.25,
    /** How far a resting tile leans toward its family's awake surface (0 = all alike, 1 = awake). */
    restMix: 0.25,
    /** Strength of the reflected studio environment on tiles (what makes metals read as metal). */
    envIntensity: 0.7,
    /** Overall multiplier on awake glow, and the pulse rate of restless families, rad/s. */
    glowScale: 1,
    pulseSpeed: 2.5,
    /** Highlight ring on the ground around the active tile: gap from the tile edge and width. */
    ringInset: 0.015,
    ringWidth: 0.05,
    /** Tap-to-walk marker on the target (see `core/tapMarker.ts`): pulse length s, held opacity. */
    markerPulse: 0.45,
    markerOpacity: 0.45,
    /** Tiles the explorer's filters exclude: how far they darken and grey (0–1), and fade time s. */
    dimStrength: 0.7,
    dimDuration: 0.25,
    /** Height lens (`core/lens.ts`): extra height of the top tile and of the lowest known one, and the ease, s. */
    lensHeight: 1.2,
    lensFloor: 0.04,
    lensDuration: 0.6,
    /** Colour lens (`core/lens.ts`): how long the table takes to ease between colourings, s. */
    tintDuration: 0.4,
    /**
     * Temperature lens (`core/temperature.ts`): time per change of state, s; how high a gas tile
     * floats; how much of it the screen-door fade drops (0–1); how dim an unknown tile is, as a
     * share of the filters' dim.
     */
    phaseDuration: 0.4,
    gasLift: 0.3,
    gasFade: 0.55,
    unknownDim: 0.6,
    /**
     * Discovery lens (`core/discovery.ts`): how far a tile not yet discovered sinks (kept well
     * under the character's `climbLimit`, so it can still be walked onto), how grey it goes as a
     * share of the filters' dim, the ease, s, and the settle of a tile rising into place, as a
     * share of the depth.
     */
    eraDepth: 0.1,
    eraDim: 0.8,
    eraDuration: 0.4,
    eraSettle: 0.3,
    /** Liquid tiles' top-face ripple: how far it tilts the surface (slope) and its speed, rad/s. */
    ripple: 0.12,
    rippleSpeed: 4,
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
    /** Click/tap-to-walk (see `core/steering.ts`): stop distance and slow-down distance, units. */
    arriveRadius: 0.06,
    slowRadius: 0.6,
    /** On-screen joystick: travel to full speed in px, and the dead zone as a fraction of it. */
    stickRadius: 48,
    stickDeadZone: 0.12,
    /** Ledges (see `core/ledge.ts`): standing-height smoothing 1/s, fall acceleration units/s². */
    standRate: 25,
    gravity: 14,
    /** Hop from the ground onto a tile: arc apex above the straight line, units, and length, s. */
    hopHeight: 0.14,
    hopDuration: 0.26,
    /**
     * Climbing a landscape (see `core/climb.ts`, ADR 0014): steps up to `hopStep` get the base
     * hop and taller ones a bigger one; tile-to-tile steps up to `stepGlide` are smoothed; a step
     * up taller than `climbLimit` is a cliff that blocks walking. Units.
     */
    hopStep: 0.18,
    stepGlide: 0.12,
    climbLimit: 0.45,
    /** Body squash on landing (fraction of height) and its recovery, 1/s. */
    landSquash: 0.12,
    squashRecover: 9,
    /** Outer limit (see `core/controller.ts`): soft band width, units, and push-back, units/s². */
    edgeBand: 0.6,
    edgePush: 6,
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
    /** How far past the table's footprint the focus point may go, units, so the table stays in frame. */
    focusMargin: 0.5,
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
    /** How fast the view eases up when the panel sheet opens on narrow screens, 1/s. */
    liftRate: 6,
  },
  pacing: {
    /** Frames per second once the scene is still (`core/pacer.ts`); 0 stops until woken. */
    idleFps: 20,
    /** Seconds of stillness before the idle rate starts. */
    settle: 1.5,
  },
  combine: {
    /** Carried atoms' orbs (`core/orbs.ts`): radius, and where the stacks float. */
    orbRadius: 0.05,
    orbDistance: 0.36,
    orbCurve: 0.9,
    orbLift: 0.62,
    orbSpacing: 0.11,
    orbGap: 0.05,
    orbRows: 4,
    /** How fast the orbs catch up with the figure, 1/s; lower trails further behind. */
    orbFollow: 6,
    /** Share of the figure's walk bob the orbs repeat (none with reduced motion). */
    orbBob: 1.6,
    /** Dim of the faintest suggested tile while carrying (0 bright … 1 as a filtered-out tile). */
    suggestDim: 0.6,
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
    rise: { min: 0, max: 0.5, step: 0.01 },
    activateDuration: { min: 0, max: 1, step: 0.01 },
    restMix: { min: 0, max: 1, step: 0.01 },
    envIntensity: { min: 0, max: 2, step: 0.01 },
    glowScale: { min: 0, max: 3, step: 0.01 },
    pulseSpeed: { min: 0, max: 10, step: 0.1 },
    ringInset: { min: 0, max: 0.1, step: 0.005 },
    ringWidth: { min: 0.01, max: 0.15, step: 0.005 },
    markerPulse: { min: 0.05, max: 1.5, step: 0.01 },
    markerOpacity: { min: 0, max: 1, step: 0.01 },
    dimStrength: { min: 0, max: 1, step: 0.01 },
    dimDuration: { min: 0, max: 1, step: 0.01 },
    lensHeight: { min: 0, max: 3, step: 0.05 },
    lensFloor: { min: 0, max: 0.5, step: 0.01 },
    lensDuration: { min: 0, max: 2, step: 0.05 },
    tintDuration: { min: 0, max: 2, step: 0.05 },
    phaseDuration: { min: 0, max: 2, step: 0.01 },
    gasLift: { min: 0, max: 1, step: 0.01 },
    gasFade: { min: 0, max: 1, step: 0.01 },
    unknownDim: { min: 0, max: 1, step: 0.01 },
    eraDepth: { min: 0, max: 0.17, step: 0.01 },
    eraDim: { min: 0, max: 1, step: 0.01 },
    eraDuration: { min: 0, max: 2, step: 0.01 },
    eraSettle: { min: 0, max: 1, step: 0.01 },
    ripple: { min: 0, max: 0.5, step: 0.01 },
    rippleSpeed: { min: 0, max: 12, step: 0.1 },
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
    arriveRadius: { min: 0.01, max: 0.5, step: 0.01 },
    slowRadius: { min: 0.05, max: 3, step: 0.05 },
    stickRadius: { min: 20, max: 120, step: 1 },
    stickDeadZone: { min: 0, max: 0.5, step: 0.01 },
    standRate: { min: 1, max: 60, step: 1 },
    gravity: { min: 1, max: 40, step: 0.5 },
    hopHeight: { min: 0, max: 0.6, step: 0.01 },
    hopDuration: { min: 0.05, max: 1, step: 0.01 },
    hopStep: { min: 0.02, max: 1, step: 0.01 },
    stepGlide: { min: 0, max: 0.5, step: 0.01 },
    climbLimit: { min: 0.1, max: 2, step: 0.01 },
    landSquash: { min: 0, max: 0.4, step: 0.01 },
    squashRecover: { min: 1, max: 30, step: 0.5 },
    edgeBand: { min: 0, max: 1.5, step: 0.05 },
    edgePush: { min: 0, max: 30, step: 0.5 },
  },
  camera: {
    fov: { min: 15, max: 90, step: 1 },
    position: { min: -40, max: 40, step: 0.5 },
    target: { min: -20, max: 20, step: 0.5 },
    followRate: { min: 0.5, max: 20, step: 0.5 },
    lookAhead: { min: 0, max: 1.5, step: 0.05 },
    focusHeight: { min: 0, max: 2, step: 0.05 },
    focusMargin: { min: 0, max: 3, step: 0.05 },
    pitch: { min: 10, max: 89, step: 1 },
    distance: { min: 2, max: 40, step: 0.5 },
    minDistance: { min: 1, max: 20, step: 0.5 },
    maxDistance: { min: 5, max: 60, step: 0.5 },
    zoomStep: { min: 0.02, max: 0.6, step: 0.01 },
    zoomRate: { min: 1, max: 30, step: 0.5 },
    introDelay: { min: 0, max: 3, step: 0.1 },
    introDuration: { min: 0, max: 6, step: 0.1 },
    liftRate: { min: 1, max: 30, step: 0.5 },
  },
  pacing: {
    idleFps: { min: 0, max: 60, step: 1 },
    settle: { min: 0.1, max: 5, step: 0.1 },
  },
  combine: {
    orbRadius: { min: 0.02, max: 0.15, step: 0.005 },
    orbDistance: { min: 0, max: 1.5, step: 0.01 },
    orbCurve: { min: 0, max: 4, step: 0.05 },
    orbLift: { min: 0, max: 1.5, step: 0.01 },
    orbSpacing: { min: 0.04, max: 0.3, step: 0.005 },
    orbGap: { min: 0, max: 0.3, step: 0.005 },
    orbRows: { min: 1, max: 8, step: 1 },
    orbFollow: { min: 1, max: 30, step: 0.5 },
    orbBob: { min: 0, max: 4, step: 0.1 },
    suggestDim: { min: 0, max: 1, step: 0.01 },
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
