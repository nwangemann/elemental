import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { CONFIG } from '../core/config.ts';
import {
  cameraPose,
  createCamera,
  createPose,
  skipIntro,
  stepCamera,
  zoomBy,
  zoomByFactor,
} from '../core/camera.ts';
import type { ControllerState } from '../core/controller.ts';
import { zoomStepsForKey } from '../core/input.ts';
import { isTextEntry } from './useKeyboardInput.ts';

/** Longest frame step fed to the camera, so a background tab does not jump. */
const MAX_DT = 0.1;
/** Wheel pixels per zoom step (one notch on most mice). */
const WHEEL_PX_PER_STEP = 100;
/** `deltaMode` 1 reports lines; treat one line as this many pixels. */
const LINE_PX = 16;

/**
 * The third-person camera: steps `core/camera.ts` after the character each frame (the character's
 * frame runs at a lower priority) and applies the pose. Zoom comes from the wheel, a two-finger
 * pinch on the canvas, and `+`/`-`. The establishing shot is skipped under reduced motion.
 */
export function CameraRig({ controller }: { controller: ControllerState }) {
  const canvas = useThree((s) => s.gl.domElement);
  const cam = useMemo(() => {
    const c = createCamera(controller.x, controller.z, CONFIG.camera);
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
      skipIntro(c, CONFIG.camera);
    return c;
  }, [controller]);
  const pose = useMemo(() => createPose(), []);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const px = e.deltaMode === 1 ? e.deltaY * LINE_PX : e.deltaY;
      zoomBy(cam, px / WHEEL_PX_PER_STEP, CONFIG.camera);
    };
    const onKey = (e: KeyboardEvent) => {
      if (isTextEntry(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const steps = zoomStepsForKey(e.key);
      if (steps === 0) return;
      e.preventDefault();
      zoomBy(cam, steps, CONFIG.camera);
    };
    // Pinch: track active touch pointers; the ratio of finger spreads scales the distance.
    const touches = new Map<number, { x: number; y: number }>();
    let spread = 0;
    const currentSpread = () => {
      const [a, b] = [...touches.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      spread = currentSpread();
    };
    const onMove = (e: PointerEvent) => {
      const t = touches.get(e.pointerId);
      if (!t) return;
      t.x = e.clientX;
      t.y = e.clientY;
      const next = currentSpread();
      if (spread > 0 && next > 0) zoomByFactor(cam, spread / next, CONFIG.camera);
      spread = next;
    };
    const onUp = (e: PointerEvent) => {
      touches.delete(e.pointerId);
      spread = currentSpread();
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    window.addEventListener('keydown', onKey);
    return () => {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      window.removeEventListener('keydown', onKey);
    };
  }, [canvas, cam]);

  useFrame(({ camera }, delta) => {
    const p = CONFIG.camera;
    stepCamera(
      cam,
      controller.x,
      controller.z,
      controller.vx,
      controller.vz,
      Math.min(delta, MAX_DT),
      p,
    );
    // The camera config's own position and target are the overview pose.
    cameraPose(cam, p, p, pose);
    camera.position.set(pose.position[0], pose.position[1], pose.position[2]);
    camera.lookAt(pose.target[0], pose.target[1], pose.target[2]);
    if ('fov' in camera && camera.fov !== p.fov) {
      camera.fov = p.fov;
      camera.updateProjectionMatrix();
    }
  });
  return null;
}
