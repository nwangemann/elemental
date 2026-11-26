import { useEffect, useRef, useSyncExternalStore } from 'react';
import { CONFIG } from '../core/config.ts';
import { clampKnob, createStick, stickFromOffset, type Stick } from '../core/steering.ts';

/** Radius of the knob the thumb holds, px. */
const KNOB_RADIUS = 22;
const COARSE = '(any-pointer: coarse)';

function subscribeCoarse(onChange: () => void): () => void {
  const mq = window.matchMedia?.(COARSE);
  mq?.addEventListener('change', onChange);
  return () => mq?.removeEventListener('change', onChange);
}

function isCoarse(): boolean {
  return window.matchMedia?.(COARSE).matches ?? false;
}

/**
 * On-screen joystick for touch screens, shown only when a coarse pointer (a finger) is present.
 * Dragging the knob writes a deflection into `stick`, which the character's frame reads; the
 * knob is moved by style, so nothing here sets React state while dragging. Releasing, losing
 * the pointer or the page going hidden recentres it. Hidden from screen readers: the keyboard is
 * the accessible way to walk.
 */
export function Joystick({ stick }: { stick: Stick }) {
  const coarse = useSyncExternalStore(subscribeCoarse, isCoarse, () => false);
  return coarse ? <Pad stick={stick} /> : null;
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
