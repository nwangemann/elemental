import type { Plugin } from 'vite';

/** The call troika-three-text makes to warm up its GPU glyph generator. */
const WARMUP = 'mainThreadGenerator.webgl.isSupported(canvas);';

/**
 * Removes troika-three-text's GPU warm-up from the production build. On the first text request
 * troika renders a test glyph on a second WebGL context and reads it back with a blocking
 * `readPixels`, which held the first frame back by about 0.9 s. elemental's labels build their
 * glyphs in troika's workers (`gpuAccelerateSDF = false`), so the warm-up does nothing useful.
 * Fails the build if the call is not found, so a troika upgrade is checked by hand (ADR 0010).
 */
export function troikaNoSdfWarmup(): Plugin {
  return {
    name: 'elemental:troika-no-sdf-warmup',
    apply: 'build',
    transform(code, id) {
      if (!/troika-three-text[\\/]dist[\\/]troika-three-text\.esm\.js$/.test(id)) return null;
      if (!code.includes(WARMUP)) {
        this.error(
          'troika-three-text changed: its SDF warm-up call was not found. See ADR 0010 and re-check the first-frame time with `npm run perf`.',
        );
      }
      return { code: code.replace(WARMUP, ''), map: null };
    },
  };
}
