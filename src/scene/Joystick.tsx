import { useEffect, useRef, useSyncExternalStore } from 'react';
import { CONFIG } from '../core/config.ts';
import {
  clampKnob,
  createFloatingStick,
  createStick,
  floatCancel,
  floatMove,
  floatPress,
  floatRelease,
  stickFromOffset,
  type Stick,
} from '../core/steering.ts';

/** Radius of the knob the thumb holds, px. */
const KNOB_RADIUS = 22;
const COARSE = '(any-pointer: coarse)';
/** Phones: a coarse pointer below the panel's sheet breakpoint (`40rem` in index.css). */
const PHONE = '(any-pointer: coarse) and (width < 40rem)';

type Mode = 'none' | 'fixed' | 'floating';

function subscribeMode(onChange: () => void): () => void {
  const mqs = [COARSE, PHONE].map((q) => window.matchMedia?.(q));
  for (const mq of mqs) mq?.addEventListener('change', onChange);
  return () => {
    for (const mq of mqs) mq?.removeEventListener('change', onChange);
  };
}

function currentMode(): Mode {
  if (window.matchMedia?.(PHONE).matches) return 'floating';
  return window.matchMedia?.(COARSE).matches ? 'fixed' : 'none';
}

/**
 * On-screen joystick for touch screens, shown only when a coarse pointer (a finger) is present.
 * On wider touch screens it is a fixed pad in the bottom-left corner; on phones it floats,
 * appearing where the thumb lands on the scene (see `Floating`). Either way the deflection goes
 * into `stick`, which the character's frame reads; the knob is moved by style, so nothing here
 * sets React state while dragging. Releasing, losing the pointer or the page going hidden
 * recentres it. Hidden from screen readers: the keyboard is the accessible way to walk.
 */
export function Joystick({ stick }: { stick: Stick }) {
  const mode = useSyncExternalStore(subscribeMode, currentMode, () => 'none' as const);
  if (mode === 'floating') return <Floating stick={stick} />;
  return mode === 'fixed' ? <Pad stick={stick} /> : null;
}

/**
 * The phone joystick. It listens to touches on the scene (`#scene`, the canvas wrapper) without
 * taking them over, so tap-to-walk and the camera's pinch see the same events: a short still tap
 * stays a walk tap, a drag past the tap threshold shows the stick centred where the thumb landed,
 * and a second finger (a pinch) cancels it. The base never takes pointer events.
 */
function Floating({ stick }: { stick: Stick }) {
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = document.getElementById('scene');
    const el = base.current;
    if (!scene || !el) return;
    const float = createFloatingStick();
    const offset = createStick();
    const fingers = new Set<number>();
    const half = CONFIG.character.stickRadius + KNOB_RADIUS;

    const hide = () => {
      el.dataset.active = 'false';
      if (knob.current) knob.current.style.transform = '';
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      fingers.add(e.pointerId);
      if (floatPress(float, e.pointerId, e.clientX, e.clientY, fingers.size, stick)) hide();
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== float.pointer) return;
      const was = float.engaged;
      if (!floatMove(float, e.pointerId, e.clientX, e.clientY, CONFIG.character, stick)) return;
      if (!was) {
        el.style.transform = `translate(${float.ox - half}px, ${float.oy - half}px)`;
        el.dataset.active = 'true';
      }
      clampKnob(e.clientX - float.ox, e.clientY - float.oy, CONFIG.character.stickRadius, offset);
      if (knob.current) knob.current.style.transform = `translate(${offset.x}px, ${offset.z}px)`;
    };
    const onUp = (e: PointerEvent) => {
      fingers.delete(e.pointerId);
      if (floatRelease(float, e.pointerId, stick)) hide();
    };
    const release = () => {
      fingers.clear();
      floatCancel(float, stick);
      hide();
    };
    const onVisibility = () => {
      if (document.hidden) release();
    };

    scene.addEventListener('pointerdown', onDown);
    scene.addEventListener('pointermove', onMove);
    scene.addEventListener('pointerup', onUp);
    scene.addEventListener('pointercancel', onUp);
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      scene.removeEventListener('pointerdown', onDown);
      scene.removeEventListener('pointermove', onMove);
      scene.removeEventListener('pointerup', onUp);
      scene.removeEventListener('pointercancel', onUp);
      window.removeEventListener('blur', release);
      document.removeEventListener('visibilitychange', onVisibility);
      stick.x = 0;
      stick.z = 0;
    };
  }, [stick]);

  const size = (CONFIG.character.stickRadius + KNOB_RADIUS) * 2;
  return (
    <div
      ref={base}
      className="joystick joystick-floating"
      data-active="false"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <div ref={knob} className="joystick-knob" style={{ width: KNOB_RADIUS * 2 }} />
    </div>
  );
}

function Pad({ stick }: { stick: Stick }) {
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = base.current;
    if (!el) return;
    const offset = createStick();
    let pointer: number | null = null;
    let cx = 0;
    let cy = 0;

    const place = (dx: number, dy: number) => {
      const r = CONFIG.character.stickRadius;
      clampKnob(dx, dy, r, offset);
      if (knob.current) knob.current.style.transform = `translate(${offset.x}px, ${offset.z}px)`;
      stickFromOffset(dx, dy, CONFIG.character, stick);
    };
    const release = () => {
      pointer = null;
      place(0, 0);
      el.dataset.active = 'false';
    };
    const onDown = (e: PointerEvent) => {
      if (pointer !== null) return;
      e.preventDefault();
      pointer = e.pointerId;
      el.setPointerCapture(e.pointerId);
      const rect = el.getBoundingClientRect();
      cx = rect.left + rect.width / 2;
      cy = rect.top + rect.height / 2;
      el.dataset.active = 'true';
      place(e.clientX - cx, e.clientY - cy);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerId === pointer) place(e.clientX - cx, e.clientY - cy);
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId === pointer) release();
    };
    const onVisibility = () => {
      if (document.hidden) release();
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('lostpointercapture', onUp);
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('lostpointercapture', onUp);
      window.removeEventListener('blur', release);
      document.removeEventListener('visibilitychange', onVisibility);
      stick.x = 0;
      stick.z = 0;
    };
  }, [stick]);

  const size = (CONFIG.character.stickRadius + KNOB_RADIUS) * 2;
  return (
    <div
      ref={base}
      className="joystick"
      data-active="false"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <div ref={knob} className="joystick-knob" style={{ width: KNOB_RADIUS * 2 }} />
    </div>
  );
}
