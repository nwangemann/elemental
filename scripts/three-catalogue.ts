import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const CATALOGUE = fileURLToPath(new URL('../src/scene/threeCatalogue.ts', import.meta.url));

/** React Three Fiber's own modules, whose `import * as THREE from 'three'` is redirected. */
const R3F = /[\\/]node_modules[\\/]@react-three[\\/]fiber[\\/]/;

/**
 * Points React Three Fiber's `three` import at `src/scene/threeCatalogue.ts` in the production
 * build. R3F registers the whole `three` namespace as its JSX catalogue, so without this every
 * three export ships. Every other importer still gets the real `three`. Build only: the dev
 * server pre-bundles R3F and keeps the full namespace (ADR 0012).
 */
export function threeCatalogue(): Plugin {
  return {
    name: 'elemental:three-catalogue',
    apply: 'build',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source === 'three' && importer && R3F.test(importer)) return CATALOGUE;
      return null;
    },
  };
}
