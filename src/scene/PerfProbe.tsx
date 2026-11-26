import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { FrameStats } from '../core/frame-stats.ts';

const REPORT_EVERY = 0.5;

export interface PerfReport {
  calls: number;
  triangles: number;
  /** Milliseconds between frames, capped by the display's refresh rate. */
  meanMs: number;
  p95Ms: number;
}

/**
 * Reports draw calls, triangles and frame times twice a second, without React state.
 * The report object is reused, so copy what you keep.
 */
export function PerfProbe({ onReport }: { onReport: (report: Readonly<PerfReport>) => void }) {
  const stats = useRef(new FrameStats());
  const sinceReport = useRef(0);
  const report = useRef<PerfReport>({ calls: 0, triangles: 0, meanMs: 0, p95Ms: 0 });

  useFrame(({ gl }, delta) => {
    stats.current.push(delta * 1000);
    sinceReport.current += delta;
    if (sinceReport.current < REPORT_EVERY) return;
    sinceReport.current = 0;
    const r = report.current;
    // Read before this frame renders, so these describe the previous frame.
    r.calls = gl.info.render.calls;
    r.triangles = gl.info.render.triangles;
    r.meanMs = stats.current.mean();
    r.p95Ms = stats.current.percentile(0.95);
    onReport(r);
  });

  return null;
}
