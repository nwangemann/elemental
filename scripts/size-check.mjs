// Builds the app and fails if the gzipped JavaScript passes either ceiling, so bundle growth
// is noticed in the change that causes it. Two numbers are checked (docs/adr/0003-bundle-budget.md):
// - shell: the entry chunk and everything it imports statically, which the page needs to paint;
// - total: every JavaScript chunk, including the lazily loaded scene.
// The ceilings sit just above today's sizes; raise one on purpose, in the change that needs it,
// and keep it under the budget in docs/standards.md.
// It also prints where the bytes go: each chunk's minified code is split by its sourcemap into
// npm packages and app source, and each part is gzipped on its own. Parts compress a little worse
// apart than together, so they add up to slightly more than the chunk; read them as shares.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const CEILING_KB = { shell: 76, total: 318 };

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_INDEX = Object.fromEntries([...B64].map((c, i) => [c, i]));

/** Decodes one sourcemap `mappings` line into [generatedColumn, sourceIndex | -1] segments. */
function decodeLine(line, state) {
  const segments = [];
  for (const group of line.split(',')) {
    if (!group) continue;
    const fields = [];
    let value = 0;
    let shift = 0;
    for (const c of group) {
      const digit = B64_INDEX[c];
      value += (digit & 31) << shift;
      if (digit & 32) shift += 5;
      else {
        fields.push(value & 1 ? -(value >>> 1) : value >>> 1);
        value = 0;
        shift = 0;
      }
    }
    state.column += fields[0];
    if (fields.length > 1) {
      state.source += fields[1];
      segments.push([state.column, state.source]);
    } else segments.push([state.column, -1]);
  }
  return segments;
}

/** The npm package a source path belongs to, or `app` for our own code. */
function packageOf(source) {
  const at = source.lastIndexOf('node_modules/');
  if (at < 0) return source.startsWith('\0') || source.includes('vite/') ? 'bundler' : 'app';
  const parts = source.slice(at + 'node_modules/'.length).split('/');
  return parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
}

/** Splits a chunk's code by package using its sourcemap; unmapped bytes go to `(unmapped)`. */
function splitByPackage(code, map) {
  const parts = new Map();
  const add = (pkg, text) => parts.set(pkg, (parts.get(pkg) ?? '') + text);
  const lines = code.split('\n');
  const mapLines = map.mappings.split(';');
  const state = { column: 0, source: 0 };
  // A segment runs until the next one, across line breaks (multi-line strings such as three's
  // shaders map only their first line), so `pkg` carries over from the previous line.
  let pkg = '(unmapped)';
  lines.forEach((line, i) => {
    state.column = 0;
    const segments = decodeLine(mapLines[i] ?? '', state);
    let start = 0;
    for (const [column, source] of segments) {
      add(pkg, line.slice(start, column));
      start = column;
      pkg = source < 0 ? '(unmapped)' : packageOf(map.sources[source]);
    }
    add(pkg, line.slice(start) + '\n');
  });
  return parts;
}

const out = mkdtempSync(join(tmpdir(), 'elemental-size-'));
try {
  execFileSync(
    'npx',
    [
      'vite',
      'build',
      '--outDir',
      out,
      '--manifest',
      '--sourcemap',
      'hidden',
      '--logLevel',
      'error',
    ],
    {
      stdio: 'inherit',
    },
  );
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

  const breakdown = new Map();
  for (const file of allFiles) {
    const chunk = file.replace(/^assets\/|-[\w-]{8}\.js$/g, '');
    const code = readFileSync(join(out, file), 'utf8');
    const map = JSON.parse(readFileSync(join(out, `${file}.map`), 'utf8'));
    for (let [pkg, text] of splitByPackage(code, map)) {
      // Bytes no source maps to: inlined JSON (the element data) and code the bundler writes
      // itself, such as the namespace object for `import * as THREE`. Named by chunk.
      if (pkg === '(unmapped)') pkg = `(unmapped in ${chunk})`;
      const row = breakdown.get(pkg) ?? { kb: 0, chunks: new Set() };
      row.kb += gzipSync(text).length / 1024;
      row.chunks.add(chunk);
      breakdown.set(pkg, row);
    }
  }
  const rows = [...breakdown].filter(([, r]) => r.kb >= 0.5).toSorted((a, b) => b[1].kb - a[1].kb);
  const width = Math.max(...rows.map(([pkg]) => pkg.length));
  console.log('gzipped JS by package (each part gzipped alone):');
  for (const [pkg, r] of rows)
    console.log(
      `  ${pkg.padEnd(width)} ${r.kb.toFixed(1).padStart(6)} KB  ${[...r.chunks].join(', ')}`,
    );

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
