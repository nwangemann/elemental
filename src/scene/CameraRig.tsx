import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { outerBounds } from '../core/boundary.ts';
import { CONFIG } from '../core/config.ts';
import {
  cameraPose,
  createCamera,
  createPose,
  sheetLift,
  skipIntro,
  snapFocus,
  stepCamera,
  stepLift,
  zoomBy,
  zoomByFactor,
} from '../core/camera.ts';
import type { ControllerState } from '../core/controller.ts';
import { zoomStepsForKey } from '../core/input.ts';
import { TILES } from '../core/layout.ts';
import { useAppStore } from '../state/store.ts';
import { isTextEntry } from './useKeyboardInput.ts';

/** Longest frame step fed to the camera, so a background tab does not jump. */
const MAX_DT = 0.1;
/** Wheel pixels per zoom step (one notch on most mice). */
const WHEEL_PX_PER_STEP = 100;
/** `deltaMode` 1 reports lines; treat one line as this many pixels. */
const LINE_PX = 16;

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Matches the CSS breakpoint where the element panel becomes a bottom sheet (`index.css`). */
const SHEET_QUERY = '(width < 40rem)';

/**
 * Pixels of the canvas the open panel sheet covers, or 0 when the panel is closed or is a side
 * panel. Read from layout (`offsetHeight` and the CSS `bottom` inset), which ignores the slide
 * transform, so it gives the settled height and the camera eases toward it.
 */
function measureSheet(canvas: HTMLCanvasElement): number {
  const { activeTile, panelClosed } = useAppStore.getState();
  if (!activeTile || panelClosed || !window.matchMedia?.(SHEET_QUERY).matches) return 0;
  const panel = document.querySelector<HTMLElement>('.panel');
  if (!panel) return 0;
  const inset = parseFloat(getComputedStyle(panel).bottom) || 0;
  const sheetTop = window.innerHeight - inset - panel.offsetHeight;
  return Math.max(0, canvas.getBoundingClientRect().bottom - sheetTop);
}

/**
 * The third-person camera: steps `core/camera.ts` after the character each frame (the character's
 * frame runs at a lower priority) and applies the pose. Zoom comes from the wheel, a two-finger
 * pinch on the canvas, and `+`/`-`. The focus stays within `focusMargin` of the table's footprint.
 * On narrow screens, while the panel sheet is open, the image shifts up (a projection view offset,
 * so tap picking still matches) to centre the character in the part of the scene left visible.
 * Under reduced motion the establishing shot is skipped, a fly-to cuts to its tile instead of
 * gliding, and the sheet shift is a cut too.
 */
export function CameraRig({ controller }: { controller: ControllerState }) {
  const canvas = useThree((s) => s.gl.domElement);
  const cam = useMemo(() => {
    const c = createCamera(controller.x, controller.z, CONFIG.camera);
    if (prefersReducedMotion()) skipIntro(c, CONFIG.camera);
    return c;
  }, [controller]);
  const pose = useMemo(() => createPose(), []);
  const focusMargin = CONFIG.camera.focusMargin;
  const focus = useMemo(() => outerBounds(focusMargin, 0), [focusMargin]);
  // Sheet framing: `target` is set from layout on panel and size changes; `current` eases to it.
  const liftRef = useRef({ target: 0, current: 0, applied: 0, height: 0 });
  const reduced = useMemo(() => prefersReducedMotion(), []);

  useEffect(() => {
    let frame = 0;
    let observed: HTMLElement | null = null;
    const observer = new ResizeObserver(() => remeasure());
    // Deferred a frame so React has rendered the panel's open state and content first.
    const remeasure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const panel = document.querySelector<HTMLElement>('.panel');
        if (panel && panel !== observed) {
          observer.disconnect();
          observer.observe(panel);
          observed = panel;
        }
        liftRef.current.target = sheetLift(canvas.clientHeight, measureSheet(canvas));
      });
    };
    remeasure();
    const unsubscribe = useAppStore.subscribe((s, prev) => {
      if (s.activeTile !== prev.activeTile || s.panelClosed !== prev.panelClosed) remeasure();
    });
    window.addEventListener('resize', remeasure);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      unsubscribe();
      window.removeEventListener('resize', remeasure);
    };
  }, [canvas]);

  // Under reduced motion a fly-to is a cut: the focus jumps to the tile with the character.
  useEffect(
    () =>
      useAppStore.subscribe((s, prev) => {
        if (!s.flight || s.flight === prev.flight || !prefersReducedMotion()) return;
        const tile = TILES[s.flight.number - 1];
        if (tile) snapFocus(cam, tile.x, tile.z, focus);
      }),
    [cam, focus],
  );

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

  useFrame(({ camera, size }, delta) => {
    const p = CONFIG.camera;
    stepCamera(
      cam,
      controller.x,
      controller.z,
      controller.vx,
      controller.vz,
      Math.min(delta, MAX_DT),
      p,
      focus,
    );
    // The camera config's own position and target are the overview pose.
    cameraPose(cam, p, p, pose);
    camera.position.set(pose.position[0], pose.position[1], pose.position[2]);
    camera.lookAt(pose.target[0], pose.target[1], pose.target[2]);
    if ('fov' in camera && camera.fov !== p.fov) {
      camera.fov = p.fov;
      camera.updateProjectionMatrix();
    }
    const lift = liftRef.current;
    lift.current = stepLift(
      lift.current,
      lift.target,
      p.liftRate,
      Math.min(delta, MAX_DT),
      reduced,
    );
    if (
      'setViewOffset' in camera &&
      (lift.current !== lift.applied || size.height !== lift.height)
    ) {
      // A positive y offset moves the view window down the virtual frame, so the image moves up.
      if (lift.current === 0) camera.clearViewOffset();
      else camera.setViewOffset(size.width, size.height, 0, lift.current, size.width, size.height);
      lift.applied = lift.current;
      lift.height = size.height;
    }
  });
  return null;
}
