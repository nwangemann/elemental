import { Suspense, lazy, useCallback, useRef } from 'react';
import type { PerfReport } from './scene/PerfProbe.tsx';
import { KeyHelp } from './ui/KeyHelp.tsx';
import { TileStatus } from './ui/TileStatus.tsx';

// The scene (three, React Three Fiber, troika, element data) is its own chunk. The DOM shell
// paints first and the scene streams in behind it; see docs/adr/0003-bundle-budget.md.
const Scene = lazy(() => import('./scene/Scene.tsx').then((m) => ({ default: m.Scene })));

// The element panel and the element data come in a chunk of their own, shared with the scene,
// so the shell carries neither (docs/adr/0005-element-panel-data.md).
const ElementPanel = lazy(() =>
  import('./ui/ElementPanel.tsx').then((m) => ({ default: m.ElementPanel })),
);

// The explorer shares that chunk: it needs the element data too.
const Explorer = lazy(() => import('./ui/Explorer.tsx').then((m) => ({ default: m.Explorer })));

const params = new URLSearchParams(window.location.search);
const showPerf = params.has('perf');

// `?tune` opens the leva panel in development only. `import.meta.env.DEV` is false in a
// production build, so the import below and leva itself are dropped from the bundle.
const TunePanel =
  import.meta.env.DEV && params.has('tune') ? lazy(() => import('./ui/TunePanel.tsx')) : null;

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
      <Suspense
        fallback={
          <p className="loading" role="status">
            Loading the table…
          </p>
        }
      >
        <Scene {...(showPerf ? { onPerf } : {})} />
      </Suspense>
      <header className="hud">
        <h1>elemental</h1>
        <p>A walkable periodic table.</p>
      </header>
      <Suspense>
        <Explorer />
      </Suspense>
      <Suspense>
        <ElementPanel />
      </Suspense>
      <KeyHelp />
      <TileStatus />
      {showPerf && <output ref={perf} className="perf" aria-live="off" />}
      {TunePanel && (
        <Suspense>
          <TunePanel />
        </Suspense>
      )}
    </>
  );
}
