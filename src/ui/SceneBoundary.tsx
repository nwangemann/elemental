import { Component, Suspense, lazy, type ReactNode } from 'react';

// Loaded only when the scene fails, so a working page never downloads it.
const SceneFallback = lazy(() =>
  import('./SceneFallback.tsx').then((m) => ({ default: m.SceneFallback })),
);

/**
 * Catches a scene that cannot start (no WebGL, a lost context at start-up, a chunk that failed
 * to load), so the rest of the page keeps working: the panel, the explorer and the element list
 * run on the element data alone. Without it React would unmount the whole page.
 */
export class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Suspense>
        <SceneFallback />
      </Suspense>
    );
  }
}
