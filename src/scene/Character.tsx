import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  CapsuleGeometry,
  MeshStandardMaterial,
  SphereGeometry,
  type Group,
  type Mesh,
} from 'three';
import { CONFIG } from '../core/config.ts';
import { createGait, createPose, poseOf, stepGait } from '../core/gait.ts';
import { TILES } from '../core/layout.ts';
import { CHARACTER_COLOR, EYE_COLOR } from '../core/palette.ts';

/** Where the character stands until the controller moves it: on hydrogen. */
const SPAWN = TILES[0]!;
/** Longest frame step fed to the gait, so a background tab does not jump the cycle. */
const MAX_DT = 0.1;
/** Feet are flattened, slightly long spheres. */
const FOOT_SCALE: [number, number, number] = [1, 0.55, 1.35];

/**
 * The procedural bean: a capsule body with eyes, stub arms and two feet. Geometry comes from
 * `CONFIG.character` at mount; breathing and the walk cycle are applied every frame from
 * `core/gait.ts` by mutating refs. Faces +z.
 */
export function Character() {
  const c = CONFIG.character;
  const body = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const leftFoot = useRef<Mesh>(null);
  const rightFoot = useRef<Mesh>(null);

  const gait = useMemo(() => createGait(), []);
  const pose = useMemo(() => createPose(), []);
  const skin = useMemo(
    () => new MeshStandardMaterial({ color: CHARACTER_COLOR, roughness: 0.6 }),
    [],
  );
  const ink = useMemo(() => new MeshStandardMaterial({ color: EYE_COLOR, roughness: 0.3 }), []);

  const footRadius = c.radius * 0.38;
  const footGeometry = useMemo(() => new SphereGeometry(footRadius, 14, 10), [footRadius]);
  const footY = footRadius * 0.55;
  const bodyY = footRadius * 1.1 + c.height / 2;
  const armRadius = c.radius * 0.22;
  const armLength = c.height * 0.32;
  const armGeometry = useMemo(
    () => new CapsuleGeometry(armRadius, armLength - armRadius * 2, 4, 10),
    [armRadius, armLength],
  );
  const shoulderX = c.radius + armRadius * 0.15;
  const shoulderY = c.height * 0.08;
  const eyeY = c.height * 0.2;
  const eyeX = c.radius * 0.36;
  const eyeZ = c.radius * 0.92;
  const footX = c.radius * 0.5;

  useEffect(
    () => () => {
      for (const d of [skin, ink, armGeometry, footGeometry]) d.dispose();
    },
    [skin, ink, armGeometry, footGeometry],
  );

  useFrame((_, delta) => {
    stepGait(gait, CONFIG.character.previewSpeed, Math.min(delta, MAX_DT), CONFIG.character);
    poseOf(gait, CONFIG.character, pose);
    const b = body.current;
    if (b) {
      b.position.y = bodyY + pose.bob;
      b.scale.set(pose.scaleXZ, pose.scaleY, pose.scaleXZ);
    }
    if (leftArm.current) leftArm.current.rotation.x = pose.leftArm;
    if (rightArm.current) rightArm.current.rotation.x = pose.rightArm;
    if (leftFoot.current) {
      leftFoot.current.position.set(footX, footY + pose.leftFootLift, pose.leftFootForward);
    }
    if (rightFoot.current) {
      rightFoot.current.position.set(-footX, footY + pose.rightFootLift, pose.rightFootForward);
    }
  });

  return (
    <group position={[SPAWN.x, CONFIG.tiles.height, SPAWN.z]}>
      <group ref={body} position-y={bodyY}>
        <mesh material={skin}>
          <capsuleGeometry args={[c.radius, c.height - c.radius * 2, 8, 20]} />
        </mesh>
        {[eyeX, -eyeX].map((x) => (
          <mesh key={x} material={ink} position={[x, eyeY, eyeZ]} scale={[1, 1.4, 0.6]}>
            <sphereGeometry args={[c.radius * 0.11, 12, 8]} />
          </mesh>
        ))}
        <group ref={leftArm} position={[shoulderX, shoulderY, 0]}>
          <mesh material={skin} position-y={-armLength / 2} geometry={armGeometry} />
        </group>
        <group ref={rightArm} position={[-shoulderX, shoulderY, 0]}>
          <mesh material={skin} position-y={-armLength / 2} geometry={armGeometry} />
        </group>
      </group>
      <mesh ref={leftFoot} material={skin} geometry={footGeometry} scale={FOOT_SCALE} />
      <mesh ref={rightFoot} material={skin} geometry={footGeometry} scale={FOOT_SCALE} />
    </group>
  );
}
