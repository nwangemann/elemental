import { Canvas } from '@react-three/fiber';
import { useMemo } from 'react';
import { createActivation } from '../core/activation.ts';
import { CONFIG } from '../core/config.ts';
import { createController } from '../core/controller.ts';
import { ELEMENTS } from '../core/elements/index.ts';
import { parseDeepLink } from '../core/explorer.ts';
import { TABLE_SIZE, TILES } from '../core/layout.ts';
import { createStick, createWalkTarget } from '../core/steering.ts';
import { CameraRig } from './CameraRig.tsx';
import { Character } from './Character.tsx';
import { FlightHandler } from './FlightHandler.tsx';
import { Joystick } from './Joystick.tsx';
import { GROUND_COLOR, SKY_COLOR } from '../core/palette.ts';
import { Labels } from './Labels.tsx';
import { PerfProbe, type PerfReport } from './PerfProbe.tsx';
import { TapToWalk } from './TapToWalk.tsx';
import { TileActivator } from './TileActivator.tsx';
import { TileRings } from './TileRings.tsx';
import { TileStepper } from './TileStepper.tsx';
import { Tiles } from './Tiles.tsx';
import { useConfigVersion } from './useConfigVersion.ts';
import { useKeyboardInput } from './useKeyboardInput.ts';

/** The character starts on the deep-linked element (`#/Au`), or on hydrogen. */
function spawnTile() {
  const linked = parseDeepLink(window.location.hash, ELEMENTS);
  return TILES[(linked?.number ?? 1) - 1]!;
}
const GROUND_SIZE = Math.max(TABLE_SIZE.width, TABLE_SIZE.depth) * 4;

export function Scene({ onPerf }: { onPerf?: (report: Readonly<PerfReport>) => void }) {
  // Tiles and labels are built once from CONFIG; remount them when the tuning panel changes it.
  const version = useConfigVersion();
  const input = useKeyboardInput();
  const controller = useMemo(() => {
    const spawn = spawnTile();
    return createController(spawn.x, spawn.z);
  }, []);
  const activation = useMemo(() => createActivation(), []);
  const stick = useMemo(() => createStick(), []);
  const target = useMemo(() => createWalkTarget(), []);
  return (
    <>
      <Canvas
        className="scene"
        dpr={[1, 2]}
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
        <mesh rotation-x={-Math.PI / 2}>
          <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
          <meshStandardMaterial color={GROUND_COLOR} roughness={1} />
        </mesh>
        <CameraRig controller={controller} />
        <TapToWalk target={target} />
        <TileStepper controller={controller} target={target} />
        <FlightHandler controller={controller} target={target} />
        <TileActivator activation={activation} controller={controller} />
        <Tiles key={`tiles-${version}`} activation={activation} />
        <TileRings key={`rings-${version}`} activation={activation} />
        <Labels key={`labels-${version}`} activation={activation} />
        <Character
          key={`character-${version}`}
          controller={controller}
          input={input}
          stick={stick}
          target={target}
          activation={activation}
        />
        {onPerf && <PerfProbe onReport={onPerf} />}
      </Canvas>
      <Joystick stick={stick} />
    </>
  );
}
