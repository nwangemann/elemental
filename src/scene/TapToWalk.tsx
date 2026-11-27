import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import { CONFIG } from '../core/config.ts';
import { isTap, setWalkTarget, type WalkTarget } from '../core/steering.ts';
import { placeTapMarker, type TapMarker } from '../core/tapMarker.ts';

/**
 * Click or tap the table to walk there. A press on the canvas that stays short and still (it
 * never strays past the tap threshold, even if it comes back) is a tap; a drag (on phones, the
 * floating joystick), a long press or a second finger (a pinch) is not. The tap is projected onto
 * the plane of the tile tops and becomes the walk target; `core/steering.ts` snaps it to the tile
 * under it and the character's frame steers toward it, and the tap marker shows where it landed.
 * Work happens per tap, not per frame.
 */
export function TapToWalk({ target, marker }: { target: WalkTarget; marker: TapMarker }) {
  const canvas = useThree((s) => s.gl.domElement);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    const raycaster = new Raycaster();
    const ndc = new Vector2();
    const plane = new Plane(new Vector3(0, 1, 0), 0);
    const hit = new Vector3();
    const active = new Set<number>();
    // `drift` is the farthest the press has strayed, so a drag that comes back is not a tap.
    let press: { id: number; x: number; y: number; t: number; drift: number } | null = null;

    const onDown = (e: PointerEvent) => {
      active.add(e.pointerId);
      // A second pointer turns the gesture into a pinch; a non-primary button is not a walk.
      press =
        active.size === 1 && e.button === 0
          ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, drift: 0 }
          : null;
    };
    const onMove = (e: PointerEvent) => {
      if (press?.id === e.pointerId)
        press.drift = Math.max(press.drift, Math.hypot(e.clientX - press.x, e.clientY - press.y));
    };
    const onUp = (e: PointerEvent) => {
      active.delete(e.pointerId);
      const p = press;
      if (!p || p.id !== e.pointerId) return;
      press = null;
      const drift = Math.max(p.drift, Math.hypot(e.clientX - p.x, e.clientY - p.y));
      if (!isTap(e.timeStamp - p.t, drift)) return;
      const rect = canvas.getBoundingClientRect();
      ndc.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      plane.constant = -CONFIG.tiles.height;
      if (!raycaster.ray.intersectPlane(plane, hit)) return;
      const number = setWalkTarget(target, hit.x, hit.z);
      placeTapMarker(marker, target, number === null ? -1 : number - 1);
    };
    const onCancel = (e: PointerEvent) => {
      active.delete(e.pointerId);
      if (press?.id === e.pointerId) press = null;
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onCancel);
    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onCancel);
    };
  }, [canvas, camera, target, marker]);

  return null;
}
