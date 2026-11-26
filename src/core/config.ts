/**
 * Visual and feel parameters in one typed place. The tuning panel (`?tune`) edits these live;
 * the values here are the shipped defaults. World units match `LAYOUT` (a tile is 1 wide).
 */
export const CONFIG = {
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
    position: [0, 17, 15] as readonly [number, number, number],
  },
} as const;
