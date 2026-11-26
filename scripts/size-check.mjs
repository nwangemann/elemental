// Builds the app and fails if the gzipped JavaScript passes either ceiling, so bundle growth
// is noticed in the change that causes it. Two numbers are checked (docs/adr/0003-bundle-budget.md):
// - shell: the entry chunk and everything it imports statically, which the page needs to paint;
// - total: every JavaScript chunk, including the lazily loaded scene.
// The ceilings sit just above today's sizes; raise one on purpose, in the change that needs it,
// and keep it under the budget in docs/standards.md.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const CEILING_KB = { shell: 80, total: 380 };

const out = mkdtempSync(join(tmpdir(), 'elemental-size-'));
try {
  execFileSync('npx', ['vite', 'build', '--outDir', out, '--manifest', '--logLevel', 'error'], {
    stdio: 'inherit',
  });
  const gzipKb = (file) => gzipSync(readFileSync(join(out, file))).length / 1024;

  const manifest = JSON.parse(readFileSync(join(out, '.vite', 'manifest.json'), 'utf8'));
  const shellFiles = new Set();
  const visit = (key) => {
    const chunk = manifest[key];
    if (!chunk || shellFiles.has(chunk.file)) return;
    shellFiles.add(chunk.file);
    for (const dep of chunk.imports ?? []) visit(dep);
  };
  for (const [key, chunk] of Object.entries(manifest)) if (chunk.isEntry) visit(key);

  const allFiles = readdirSync(join(out, 'assets'))
    .filter((f) => f.endsWith('.js'))
    .map((f) => `assets/${f}`);
  const sizes = {
    shell: Math.round([...shellFiles].reduce((sum, f) => sum + gzipKb(f), 0)),
    total: Math.round(allFiles.reduce((sum, f) => sum + gzipKb(f), 0)),
  };

  const report = (k) => `${k} ${sizes[k]} KB (ceiling ${CEILING_KB[k]} KB)`;
  const over = Object.keys(sizes).filter((k) => sizes[k] > CEILING_KB[k]);
  if (over.length > 0) {
    console.error(`size:check failed, gzipped JS over the ceiling: ${over.map(report).join(', ')}`);
    process.exit(1);
  }
  console.log(`size:check passed, gzipped JS: ${Object.keys(sizes).map(report).join(', ')}`);
} finally {
  rmSync(out, { recursive: true, force: true });
}
