import { Canvas } from '@react-three/fiber';
import { Suspense, lazy, useMemo, useState } from 'react';
import { createActivation } from '../core/activation.ts';
import { BOUNDARY, outerBounds } from '../core/boundary.ts';
import { CONFIG } from '../core/config.ts';
import { createController } from '../core/controller.ts';
import { createGait } from '../core/gait.ts';
import { ELEMENTS } from '../core/elements/index.ts';
import { parseDeepLink } from '../core/explorer.ts';
import { createLedge } from '../core/ledge.ts';
import { createPacer } from '../core/pacer.ts';
import { TILES } from '../core/layout.ts';
import { createDimLayer } from '../core/lens.ts';
import { createStick, createWalkTarget } from '../core/steering.ts';
import { createTapMarker } from '../core/tapMarker.ts';
import { CameraRig } from './CameraRig.tsx';
import { ColourLens } from './ColourLens.tsx';
import { createSceneTint } from './sceneTint.ts';
import { createScenePhase } from './scenePhase.ts';
import { createSceneEra } from './sceneEra.ts';
import { DiscoveryLens } from './DiscoveryLens.tsx';
import { TemperatureLens } from './TemperatureLens.tsx';
import { Character } from './Character.tsx';
import { FlightHandler } from './FlightHandler.tsx';
import { FramePacer } from './FramePacer.tsx';
import { HeightLens } from './HeightLens.tsx';
import { Joystick } from './Joystick.tsx';
import { GROUND_COLOR, SKY_COLOR } from '../core/palette.ts';
import { Labels } from './Labels.tsx';
import { PerfProbe, type PerfReport } from './PerfProbe.tsx';
import { TapMarkerMesh } from './TapMarker.tsx';
import { TapToWalk } from './TapToWalk.tsx';
import { QualityGovernor } from './QualityGovernor.tsx';
import { ReturnHandler } from './ReturnHandler.tsx';
import { TileActivator } from './TileActivator.tsx';
import { TileRings } from './TileRings.tsx';
import { TileStepper } from './TileStepper.tsx';
import { Tiles } from './Tiles.tsx';
import { useConfigVersion } from './useConfigVersion.ts';
import { useKeyboardInput } from './useKeyboardInput.ts';
import { createFormClock } from '../core/forming.ts';
import { createOrbFollow } from '../core/orbs.ts';
import { useAppStore } from '../state/store.ts';

// Combine mode's carried orbs load with combine's chunk the first time Combine opens (ADR 20).
const Orbs = lazy(() => import('./Orbs.tsx'));
// The table's suggestion dim needs the compound set, so it comes with combine's chunk too.
const Suggestions = lazy(() => import('./Suggestions.tsx'));

/** The character starts on the deep-linked element (`#/Au`), or on hydrogen. */
function spawnTile() {
  const linked = parseDeepLink(window.location.hash, ELEMENTS);
  return TILES[(linked?.number ?? 1) - 1]!;
}
/**
 * The ground is a low plinth covering the walkable area (the table plus `BOUNDARY.margin`), so
 * the outer limit shows as its edge, with the sky beyond. One mesh, as the old plane was.
 */
const GROUND_EDGE = outerBounds(BOUNDARY.margin, 0);
const GROUND_W = GROUND_EDGE.maxX - GROUND_EDGE.minX;
const GROUND_D = GROUND_EDGE.maxZ - GROUND_EDGE.minZ;
const GROUND_THICKNESS = 0.4;

export function Scene({ onPerf }: { onPerf?: (report: Readonly<PerfReport>) => void }) {
  // Tiles and labels are built once from CONFIG; remount them when the tuning panel changes it.
  const version = useConfigVersion();
  const input = useKeyboardInput();
  const spawn = useMemo(() => spawnTile(), []);
  const controller = useMemo(() => createController(spawn.x, spawn.z), [spawn]);
  const ledge = useMemo(() => createLedge(CONFIG.tiles.height, spawn.number), [spawn]);
  const activation = useMemo(() => createActivation(), []);
  const stick = useMemo(() => createStick(), []);
  const target = useMemo(() => createWalkTarget(), []);
  const marker = useMemo(() => createTapMarker(), []);
  const pacer = useMemo(() => createPacer(), []);
  const tint = useMemo(() => createSceneTint(), []);
  const phase = useMemo(() => createScenePhase(), []);
  const era = useMemo(() => createSceneEra(), []);
  const gait = useMemo(() => createGait(), []);
  const suggest = useMemo(() => createDimLayer(TILES.length), []);
  const orbs = useMemo(
    () => createOrbFollow(controller.x, ledge.y, controller.z, controller.heading),
    [controller, ledge],
  );
  const formClock = useMemo(() => createFormClock(), []);
  // Stays true once Combine has opened, so closing it hides the orbs without unloading them.
  const combineOpen = useAppStore((s) => s.combine.open);
  const [combineOpened, setCombineOpened] = useState(combineOpen);
  if (combineOpen && !combineOpened) setCombineOpened(true);
  return (
    <>
      <Canvas
        className="scene"
        dpr={[1, 2]}
        // Frames on request: `FramePacer` asks for every display frame while anything moves and
        // a slow idle rate once the scene is still (ADR 0016).
        frameloop="demand"
        camera={{ fov: CONFIG.camera.fov, position: [...CONFIG.camera.position] }}
        // The scene is one focusable stop: screen readers pass keys through (application role),
        // the label says how to play, and the live tile status describes where the character is.
        id="scene"
        tabIndex={0}
        role="application"
        aria-roledescription="walkable periodic table"
        aria-label="Periodic table. Walk with W A S D or the arrow keys, step tile to tile with I J K L, press Enter to read the element. Press question mark for all keys."
        aria-describedby="tile-status"
      >
        <color attach="background" args={[SKY_COLOR]} />
        <fog attach="fog" args={[SKY_COLOR, 30, 70]} />
        <hemisphereLight args={['#dfe8ff', '#202630', 1.2]} />
        <directionalLight position={[6, 14, 8]} intensity={1.6} />
        <mesh position-y={-GROUND_THICKNESS / 2}>
          <boxGeometry args={[GROUND_W, GROUND_THICKNESS, GROUND_D]} />
          <meshStandardMaterial color={GROUND_COLOR} roughness={1} />
        </mesh>
        <CameraRig controller={controller} ledge={ledge} />
        <TapToWalk target={target} marker={marker} activation={activation} />
        <TileStepper controller={controller} target={target} />
        <FlightHandler controller={controller} target={target} />
        <ReturnHandler controller={controller} target={target} />
        <TileActivator activation={activation} controller={controller} ledge={ledge} />
        <HeightLens key={`lens-${version}`} activation={activation} />
        <ColourLens tint={tint} />
        <TemperatureLens activation={activation} phase={phase} />
        <DiscoveryLens activation={activation} era={era} />
        <Tiles
          key={`tiles-${version}`}
          activation={activation}
          tint={tint}
          phase={phase}
          era={era}
          suggest={suggest}
        />
        <TileRings key={`rings-${version}`} activation={activation} />
        <Labels key={`labels-${version}`} activation={activation} />
        <Character
          key={`character-${version}`}
          controller={controller}
          input={input}
          stick={stick}
          target={target}
          activation={activation}
          ledge={ledge}
          gait={gait}
          clock={formClock}
        />
        {combineOpened && (
          <Suspense fallback={null}>
            <Orbs
              key={`orbs-${version}`}
              controller={controller}
              ledge={ledge}
              gait={gait}
              follow={orbs}
              clock={formClock}
            />
            <Suggestions layer={suggest} />
          </Suspense>
        )}
        <TapMarkerMesh marker={marker} target={target} activation={activation} />
        <QualityGovernor pacer={pacer} />
        {onPerf && <PerfProbe onReport={onPerf} />}
        {/* Last, so it sees this frame's motion and the governor reads `paced` for this frame. */}
        <FramePacer
          pacer={pacer}
          controller={controller}
          input={input}
          stick={stick}
          target={target}
          ledge={ledge}
          activation={activation}
          tint={tint}
          phase={phase}
          era={era}
          orbs={orbs}
          form={formClock}
        />
      </Canvas>
      <Joystick stick={stick} />
    </>
  );
}
