import { Canvas } from '@react-three/fiber';
import { CONFIG } from '../core/config.ts';
import { TABLE_SIZE } from '../core/layout.ts';
import { CameraRig } from './CameraRig.tsx';
import { Character } from './Character.tsx';
import { GROUND_COLOR, SKY_COLOR } from '../core/palette.ts';
import { Labels } from './Labels.tsx';
import { PerfProbe, type PerfReport } from './PerfProbe.tsx';
import { Tiles } from './Tiles.tsx';
import { useConfigVersion } from './useConfigVersion.ts';

const GROUND_SIZE = Math.max(TABLE_SIZE.width, TABLE_SIZE.depth) * 4;

export function Scene({ onPerf }: { onPerf?: (report: Readonly<PerfReport>) => void }) {
  // Tiles and labels are built once from CONFIG; remount them when the tuning panel changes it.
  const version = useConfigVersion();
  return (
    <Canvas
      className="scene"
      dpr={[1, 2]}
      camera={{ fov: CONFIG.camera.fov, position: [...CONFIG.camera.position] }}
      aria-hidden
    >
      <color attach="background" args={[SKY_COLOR]} />
      <fog attach="fog" args={[SKY_COLOR, 30, 70]} />
      <hemisphereLight args={['#dfe8ff', '#202630', 1.2]} />
      <directionalLight position={[6, 14, 8]} intensity={1.6} />
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshStandardMaterial color={GROUND_COLOR} roughness={1} />
      </mesh>
      <CameraRig />
      <Tiles key={`tiles-${version}`} />
      <Labels key={`labels-${version}`} />
      <Character key={`character-${version}`} />
      {onPerf && <PerfProbe onReport={onPerf} />}
    </Canvas>
  );
}
