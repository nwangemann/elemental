import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  CapsuleGeometry,
  MeshStandardMaterial,
  SphereGeometry,
  type Group,
  type Mesh,
} from 'three';
import { tileTop, type Activation } from '../core/activation.ts';
import { GROUND, surfaceAt } from '../core/boundary.ts';
import { CONFIG } from '../core/config.ts';
import { speedOf, stepController, tableBounds, type ControllerState } from '../core/controller.ts';
import { createGait, createPose, poseOf, stepGait } from '../core/gait.ts';
import { createIntent, moveIntent, type InputState } from '../core/input.ts';
import { isAirborne, stepLedge, type LedgeState } from '../core/ledge.ts';
import { TABLE_SIZE } from '../core/layout.ts';
import { steer, type Stick, type WalkTarget } from '../core/steering.ts';
import { CHARACTER_COLOR, EYE_COLOR } from '../core/palette.ts';

/** Longest frame step fed to the controller and gait, so a background tab does not jump. */
const MAX_DT = 0.1;
/** Feet are flattened, slightly long spheres. */
const FOOT_SCALE: [number, number, number] = [1, 0.55, 1.35];
/** Frame priority: below the default 0, so the character moves before the camera follows it. */
export const CHARACTER_FRAME_PRIORITY = -1;

/**
 * The procedural bean: a capsule body with eyes, stub arms and two feet. Geometry comes from
 * `CONFIG.character` at mount. Every frame it reads the held keys, steps `core/controller.ts`
 * (position, heading, lean) and `core/gait.ts` (breathing, walk cycle) and writes the results to
 * refs. Keys win over the touch joystick, which wins over a clicked walk target
 * (`core/steering.ts`). Faces +z at heading 0. `controller`, `input`, `stick` and `target` are
 * owned by the parent, so a remount (the tuning panel changing sizes) keeps the character where
 * it is. Its height comes from `core/ledge.ts` over `surfaceAt`: it rides the tile under it as it
 * rises, drops to the ground off an edge and hops back up onto a tile, squashing a little on
 * landing. The walk cycle pauses while it is in the air. `ledge` is parent-owned too, because
 * `TileActivator` reads it to wake a tile only once the character is on top.
 */
export function Character({
  controller,
  input,
  stick,
  target,
  activation,
  ledge,
}: {
  controller: ControllerState;
  input: InputState;
  stick: Stick;
  target: WalkTarget;
  activation: Activation;
  ledge: LedgeState;
}) {
  const c = CONFIG.character;
  const root = useRef<Group>(null);
  const tilt = useRef<Group>(null);
  const body = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const leftFoot = useRef<Mesh>(null);
  const rightFoot = useRef<Mesh>(null);

  const gait = useMemo(() => createGait(), []);
  const pose = useMemo(() => createPose(), []);
  const intent = useMemo(() => createIntent(), []);
  const bounds = useMemo(
    () => tableBounds(TABLE_SIZE.width, TABLE_SIZE.depth, c.radius),
    [c.radius],
  );
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
    const dt = Math.min(delta, MAX_DT);
    const p = CONFIG.character;
    moveIntent(input, intent);
    steer(intent, stick, target, controller.x, controller.z, p);
    stepController(controller, intent, dt, p, bounds);
    const support = surfaceAt(controller.x, controller.z);
    const floor = support === GROUND ? 0 : tileTop(activation, support - 1);
    stepLedge(ledge, support, floor, dt, p);
    if (!isAirborne(ledge)) stepGait(gait, speedOf(controller), dt, p);
    poseOf(gait, p, pose);
    // Landing squash on top of the gait's own, keeping volume.
    const squashY = pose.scaleY * (1 - ledge.squash);
    const squashXZ = 1 / Math.sqrt(squashY);
    if (root.current) {
      root.current.position.set(controller.x, ledge.y, controller.z);
      root.current.rotation.y = controller.heading;
    }
    // Positive lean (turning toward +heading, the character's left) tips the top toward +x.
    if (tilt.current) tilt.current.rotation.z = -controller.lean;
    const b = body.current;
    if (b) {
      b.position.y = bodyY + pose.bob;
      b.scale.set(squashXZ, squashY, squashXZ);
    }
    if (leftArm.current) leftArm.current.rotation.x = pose.leftArm;
    if (rightArm.current) rightArm.current.rotation.x = pose.rightArm;
    if (leftFoot.current) {
      leftFoot.current.position.set(footX, footY + pose.leftFootLift, pose.leftFootForward);
    }
    if (rightFoot.current) {
      rightFoot.current.position.set(-footX, footY + pose.rightFootLift, pose.rightFootForward);
    }
  }, CHARACTER_FRAME_PRIORITY);

  return (
    <group
      ref={root}
      position={[controller.x, ledge.y, controller.z]}
      rotation-y={controller.heading}
    >
      <group ref={tilt}>
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
    </group>
  );
}
