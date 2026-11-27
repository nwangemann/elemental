import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { Activation } from '../core/activation.ts';
import { CONFIG } from '../core/config.ts';
import { speedOf, type ControllerState } from '../core/controller.ts';
import type { InputState } from '../core/input.ts';
import { LEDGE_STAND, type LedgeState } from '../core/ledge.ts';
import { poseMoved, stepPacer, wakePacer, type Pacer } from '../core/pacer.ts';
import type { EraEase } from '../core/discovery.ts';
import type { TintEase } from '../core/lens.ts';
import type { PhaseEase } from '../core/temperature.ts';
import type { Stick, WalkTarget } from '../core/steering.ts';
import type { OrbFollow } from '../core/orbs.ts';
import { useAppStore } from '../state/store.ts';

const STILL = 1e-3;
const POSE_EPS = 1e-4;

/** Window events that mean someone is there and something may move. */
const WAKE_EVENTS = ['keydown', 'keyup', 'pointerdown', 'pointerup', 'wheel', 'resize', 'focus'];

/**
 * Drives the canvas in `frameloop="demand"` (`core/pacer.ts`): while the figure, camera, tiles
 * (their lift, activation, colour-lens tint, temperature-lens phase or discovery-lens sink) or input move it asks for the next display frame;
 * once all are still for `CONFIG.pacing.settle` it asks for one every `1 / idleFps` seconds. Input on the window and any app-store change wake
 * it at once. Mount it after every other frame subscriber at priority 0, so the quality governor
 * reads `pacer.paced` for the frame it is in. Renders nothing.
 */
export function FramePacer({
  pacer,
  controller,
  input,
  stick,
  target,
  ledge,
  activation,
  tint,
  phase,
  era,
  orbs,
}: {
  pacer: Pacer;
  controller: ControllerState;
  input: InputState;
  stick: Stick;
  target: WalkTarget;
  ledge: LedgeState;
  activation: Activation;
  tint: TintEase;
  phase: PhaseEase;
  era: EraEase;
  /** Set by the carried orbs while they catch up with the figure. */
  orbs: OrbFollow;
}) {
  const invalidate = useThree((s) => s.invalidate);
  const pose = useMemo(() => new Float64Array(7), []);
  const timer = useRef(0);

  useEffect(() => {
    const wake = () => {
      wakePacer(pacer);
      invalidate();
    };
    // A held drag (the joystick, a pinch) wakes on every move; a hovering pointer does not.
    const onMove = (e: PointerEvent) => {
      if (e.buttons) wake();
    };
    for (const type of WAKE_EVENTS) window.addEventListener(type, wake);
    window.addEventListener('pointermove', onMove);
    document.addEventListener('visibilitychange', wake);
    const unsubscribe = useAppStore.subscribe(wake);
    return () => {
      for (const type of WAKE_EVENTS) window.removeEventListener(type, wake);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', wake);
      unsubscribe();
      window.clearTimeout(timer.current);
    };
  }, [pacer, invalidate]);

  useFrame(({ camera }, delta) => {
    const cameraMoved = poseMoved(pose, camera.position, camera.quaternion, POSE_EPS);
    const busy =
      cameraMoved ||
      input.held.size > 0 ||
      stick.x !== 0 ||
      stick.z !== 0 ||
      target.active ||
      speedOf(controller) > STILL ||
      Math.abs(controller.lean) > STILL ||
      ledge.mode !== LEDGE_STAND ||
      ledge.squash > STILL ||
      activation.anyDirty ||
      tint.moved ||
      tint.t < 1 ||
      phase.moved ||
      phase.moving ||
      orbs.moving ||
      era.moved ||
      era.moving;
    const wait = stepPacer(pacer, delta, busy, CONFIG.pacing);
    window.clearTimeout(timer.current);
    if (wait === 0) invalidate();
    else if (Number.isFinite(wait)) timer.current = window.setTimeout(() => invalidate(), wait);
  });

  return null;
}
