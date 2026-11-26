import { useCallback, useRef } from 'react';
import type { PerfReport } from './scene/PerfProbe.tsx';
import { Scene } from './scene/Scene.tsx';

const showPerf = new URLSearchParams(window.location.search).has('perf');

export function App() {
  const perf = useRef<HTMLOutputElement>(null);

  // `?perf` overlay. The numbers also go into data attributes so scripts can read them.
  const onPerf = useCallback((r: Readonly<PerfReport>) => {
    const el = perf.current;
    if (!el) return;
    const mean = r.meanMs.toFixed(1);
    const p95 = r.p95Ms.toFixed(1);
    el.textContent = `${r.calls} draw calls · ${r.triangles} tris · ${mean} ms mean · ${p95} ms p95`;
    el.dataset.calls = String(r.calls);
    el.dataset.mean = mean;
    el.dataset.p95 = p95;
  }, []);

  return (
    <>
      <Scene {...(showPerf ? { onPerf } : {})} />
      <header className="hud">
        <h1>elemental</h1>
        <p>A walkable periodic table.</p>
      </header>
      {showPerf && <output ref={perf} className="perf" aria-live="off" />}
    </>
  );
}
