import { useFrame, useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import type { Pacer } from '../core/pacer.ts';
import { createQuality, stepQuality } from '../core/quality.ts';

/**
 * Adaptive resolution: feeds each frame interval to `core/quality.ts` and applies a new device
 * pixel ratio only when the governor changes it (a handful of times at most). The ratio starts at
 * the display's own, capped at 2. `?quality=off` pins the ratio, for measuring frame work at
 * full resolution where the frame loop is throttled (headless browsers, embedded previews), which
 * the governor cannot tell from a slow GPU. Frames after an idle wait (`pacer.paced`) are left
 * out: their interval is the idle rate, not frame cost. Renders nothing.
 */
const pinned = new URLSearchParams(window.location.search).get('quality') === 'off';

export function QualityGovernor({ pacer }: { pacer: Pacer }) {
  const setDpr = useThree((s) => s.setDpr);
  const quality = useMemo(() => createQuality(window.devicePixelRatio || 1), []);
  useFrame((_, delta) => {
    if (pinned || pacer.paced) return;
    if (stepQuality(quality, delta * 1000)) setDpr(quality.dpr);
  });
  return null;
}
