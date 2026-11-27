# 16. Idle frame pacing

- Status: accepted
- Date: 2026-11-26

## Context

The scene rendered every display frame for as long as the tab was open, 60 or 120 times a second, even when nobody touched it. Each frame is cheap (about 0.3 ms of work), but on a laptop or phone a GPU that never rests costs battery and heat. The scene is never fully still: the figure breathes and the active tile's glow pulses, so a pure "render on change" loop would freeze them.

## Options

- **`frameloop="demand"` with `invalidate` from every animation.** Draws nothing while still, but breathing and the glow are always moving, so the loop would never stop unless they were dropped.
- **An idle frame cap.** Keep drawing while still, at a lower rate. Breathing and the glow are slow, so they read at a fraction of the display rate.

## Decision

The canvas runs with React Three Fiber's `frameloop="demand"`, and one component, `scene/FramePacer.tsx`, decides when the next frame comes, using `core/pacer.ts`:

- While anything moves it asks for the next display frame. "Moves" means held keys, the joystick, a walk target, the figure's speed or lean, a hop, fall or landing squash, tiles easing (`activation.anyDirty`, which also covers the height lens) or the camera's pose changing by more than 1e-4.
- After `CONFIG.pacing.settle` (1.5 s) of stillness it asks for a frame every `1 / CONFIG.pacing.idleFps` (20 fps). The wait is shortened by half a display frame, since a requested frame lands on the next refresh. `idleFps` 0 stops drawing until woken.
- Key, pointer press, wheel, resize, focus and visibility events on the window, a pointer drag, and every app-store change (fly-to, panel, lens, filters) wake it to full rate at once.
- The quality governor ignores frames that follow an idle wait (`pacer.paced`), because their interval is the idle rate, not frame cost.

## Consequences

- Idle rendering drops from the display rate to about 20 fps: 21 fps measured on a 120 Hz display, and `npm run perf` reports idle frames (`perf:idle`).
- The `?perf` overlay's frame interval reads the idle rate (about 50 ms) while the scene is still; walk to read frame cost.
- A new animation that runs without input must count as busy in `FramePacer`, or it plays at the idle rate after the settle time. Slow ambient motion (breathing, glows) can stay at the idle rate.
