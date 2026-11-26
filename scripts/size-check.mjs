// Builds the app and fails if the gzipped JavaScript passes the ceiling, so bundle growth is
// noticed in the change that causes it. The ceiling is a guard rail, not the target: the
// performance budget is in docs/standards.md.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const CEILING_KB = 400;

const out = mkdtempSync(join(tmpdir(), 'elemental-size-'));
try {
  execFileSync('npx', ['vite', 'build', '--outDir', out, '--logLevel', 'error'], {
    stdio: 'inherit',
  });
  const assets = join(out, 'assets');
  let total = 0;
  for (const file of readdirSync(assets).filter((f) => f.endsWith('.js'))) {
    total += gzipSync(readFileSync(join(assets, file))).length;
  }
  const kb = Math.round(total / 1024);
  if (kb > CEILING_KB) {
    console.error(`size:check failed: ${kb} KB of gzipped JS, ceiling ${CEILING_KB} KB`);
    process.exit(1);
  }
  console.log(`size:check passed: ${kb} KB of gzipped JS (ceiling ${CEILING_KB} KB)`);
} finally {
  rmSync(out, { recursive: true, force: true });
}
