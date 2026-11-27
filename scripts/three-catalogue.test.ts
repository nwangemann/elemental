import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import * as catalogue from '../src/scene/threeCatalogue.ts';

// The production build (three-catalogue.ts) gives React Three Fiber only the names in threeCatalogue.ts, while the
// dev server and these tests see all of three. These checks stop a gap from reaching the build.

const root = join(import.meta.dirname, '..');
const has = (name: string) => name in catalogue;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith('.tsx') ? [path] : [];
  });
}

describe('threeCatalogue', () => {
  it('has a class for every lowercase JSX element that names a three class', () => {
    const missing = new Set<string>();
    for (const file of sourceFiles(join(root, 'src'))) {
      for (const [, tag] of readFileSync(file, 'utf8').matchAll(/<([a-z][A-Za-z0-9]*)[\s/>]/g)) {
        if (!tag) continue;
        const name = tag.charAt(0).toUpperCase() + tag.slice(1);
        if (name in THREE && !has(name)) missing.add(name);
      }
    }
    expect([...missing]).toEqual([]);
  });

  it('has every name React Three Fiber reads off THREE', () => {
    const dist = join(root, 'node_modules', '@react-three', 'fiber', 'dist');
    const used = new Set<string>();
    for (const file of readdirSync(dist).filter((f) => f.endsWith('.esm.js'))) {
      for (const [, name] of readFileSync(join(dist, file), 'utf8').matchAll(/\bTHREE\.(\w+)/g)) {
        if (name) used.add(name);
      }
    }
    expect(used.size).toBeGreaterThan(10);
    expect([...used].filter((name) => !has(name))).toEqual([]);
  });
});
