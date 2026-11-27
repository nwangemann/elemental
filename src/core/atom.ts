/**
 * The atom tab's model: an element's stored electron configuration parsed into subshells and
 * grouped into shells, plus a comparison with the Madelung (n + l) filling order so the panel can
 * say when an element breaks the filling rule. The stored configuration is always what gets
 * drawn; the filling order is only the reference it is compared against. Pure and tested.
 */

/** Subshell letters by angular momentum l. */
export const SUBSHELL_LETTERS = ['s', 'p', 'd', 'f'] as const;
export type SubshellLetter = (typeof SUBSHELL_LETTERS)[number];

export interface Subshell {
  /** Principal quantum number. */
  n: number;
  /** Angular momentum: 0 s, 1 p, 2 d, 3 f. */
  l: number;
  electrons: number;
}

export interface Shell {
  n: number;
  electrons: number;
  /** Occupied subshells in this shell, by l. */
  subshells: Subshell[];
}

export interface SubshellDifference {
  /** Subshell label, such as `3d`. */
  subshell: string;
  /** Electrons in the stored configuration. */
  actual: number;
  /** Electrons the filling rule predicts. */
  filling: number;
}

export interface Atom {
  /** Occupied subshells, ordered by n then l, cores expanded. */
  subshells: Subshell[];
  /** Shells 1 … the outermost occupied one, by n. A shell with no electrons has count 0. */
  shells: Shell[];
  /** Total electrons (equals the atomic number for a neutral atom). */
  electrons: number;
  /** n of the valence (outermost occupied) shell. */
  valenceShell: number;
  /** True when the stored configuration differs from the Madelung filling. */
  breaksFillingRule: boolean;
  /** Subshells whose counts differ from the filling, ordered by n then l. Empty when none. */
  differences: SubshellDifference[];
}

/** Electrons a subshell holds when full: 2(2l + 1). */
export function capacity(l: number): number {
  return 2 * (2 * l + 1);
}

export function subshellLabel(s: { n: number; l: number }): string {
  return `${s.n}${SUBSHELL_LETTERS[s.l]}`;
}

/** Subshells in Madelung order: by n + l, then by n. Enough for Z up to 118 and beyond. */
const MADELUNG: { n: number; l: number }[] = (() => {
  const order: { n: number; l: number }[] = [];
  for (let sum = 1; sum <= 8; sum++) {
    for (let n = 1; n <= sum; n++) {
      const l = sum - n;
      if (l < n && l < SUBSHELL_LETTERS.length) order.push({ n, l });
    }
  }
  return order;
})();

function byNL(a: Subshell, b: Subshell): number {
  return a.n - b.n || a.l - b.l;
}

/** The ground-state configuration the Madelung rule predicts for `electrons` electrons. */
export function fillingConfiguration(electrons: number): Subshell[] {
  const result: Subshell[] = [];
  let left = electrons;
  for (const { n, l } of MADELUNG) {
    if (left <= 0) break;
    const count = Math.min(left, capacity(l));
    result.push({ n, l, electrons: count });
    left -= count;
  }
  if (left > 0) throw new Error(`fillingConfiguration: ${electrons} electrons is beyond 8s`);
  return result.toSorted(byNL);
}

/** Noble-gas cores; each follows the filling rule exactly. */
const CORES: Record<string, number> = { He: 2, Ne: 10, Ar: 18, Kr: 36, Xe: 54, Rn: 86 };

const TOKEN = /^(\d)([spdf])(\d{1,2})$/;
const CORE = /^\[([A-Z][a-z])\]$/;

/**
 * Parses a configuration such as `[Ar]3d5 4s1` or `[Rn]7s2 7p6 5f14 6d10` into subshells, ordered
 * by n then l. Cores expand to their subshells, a `(calculated)` note is dropped, whitespace is
 * optional after a core and subshells may come in any order. Throws on anything else, so a data
 * refresh that brings a new notation fails the tests.
 */
export function parseConfiguration(text: string): Subshell[] {
  const counts = new Map<string, Subshell>();
  const add = (s: Subshell) => {
    const key = subshellLabel(s);
    if (counts.has(key)) throw new Error(`parseConfiguration: ${key} twice in "${text}"`);
    counts.set(key, { ...s });
  };
  const cleaned = text
    .replace(/\(calculated\)/g, ' ')
    .replace(/\]/g, '] ')
    .trim();
  for (const token of cleaned.split(/\s+/)) {
    if (token === '') continue;
    const core = CORE.exec(token);
    if (core) {
      const size = CORES[core[1]!];
      if (size === undefined) throw new Error(`parseConfiguration: unknown core ${token}`);
      for (const s of fillingConfiguration(size)) add(s);
      continue;
    }
    const match = TOKEN.exec(token);
    if (!match) throw new Error(`parseConfiguration: cannot read "${token}" in "${text}"`);
    const n = Number(match[1]);
    const l = SUBSHELL_LETTERS.indexOf(match[2] as SubshellLetter);
    const electrons = Number(match[3]);
    if (l >= n) throw new Error(`parseConfiguration: no ${token} subshell`);
    if (electrons < 1 || electrons > capacity(l)) {
      throw new Error(`parseConfiguration: ${token} holds 1–${capacity(l)} electrons`);
    }
    add({ n, l, electrons });
  }
  return [...counts.values()].toSorted(byNL);
}

/** Groups subshells into shells 1 … max n (empty shells in between get count 0). */
export function shellsOf(subshells: readonly Subshell[]): Shell[] {
  const maxN = subshells.reduce((m, s) => Math.max(m, s.n), 0);
  const shells: Shell[] = [];
  for (let n = 1; n <= maxN; n++) shells.push({ n, electrons: 0, subshells: [] });
  for (const s of subshells) {
    const shell = shells[s.n - 1]!;
    shell.electrons += s.electrons;
    shell.subshells.push(s);
  }
  return shells;
}

/** Subshells whose counts differ between two configurations, ordered by n then l. */
export function differences(
  actual: readonly Subshell[],
  filling: readonly Subshell[],
): SubshellDifference[] {
  const keys = new Map<string, { n: number; l: number; actual: number; filling: number }>();
  const entry = (s: Subshell) => {
    const key = subshellLabel(s);
    let e = keys.get(key);
    if (!e) keys.set(key, (e = { n: s.n, l: s.l, actual: 0, filling: 0 }));
    return e;
  };
  for (const s of actual) entry(s).actual = s.electrons;
  for (const s of filling) entry(s).filling = s.electrons;
  return [...keys.values()]
    .filter((e) => e.actual !== e.filling)
    .toSorted((a, b) => a.n - b.n || a.l - b.l)
    .map((e) => ({ subshell: subshellLabel(e), actual: e.actual, filling: e.filling }));
}

/** The atom model for a stored configuration. */
export function atomOf(configuration: string): Atom {
  const subshells = parseConfiguration(configuration);
  const electrons = subshells.reduce((sum, s) => sum + s.electrons, 0);
  const shells = shellsOf(subshells);
  const diff = differences(subshells, fillingConfiguration(electrons));
  return {
    subshells,
    shells,
    electrons,
    valenceShell: shells.length,
    breaksFillingRule: diff.length > 0,
    differences: diff,
  };
}

/** Electrons per shell and the outer shell, for a screen reader: "2, 8, 13, 1 electrons; outer shell 1". */
export function atomSummary(atom: Atom): string {
  const counts = atom.shells.map((s) => String(s.electrons)).join(', ');
  const outer = atom.shells[atom.valenceShell - 1]?.electrons ?? 0;
  return `${counts} electrons; outer shell ${String(outer)}`;
}

/**
 * The exception note in plain words, or null when the element fills in the usual order. Counts
 * come as configuration text (`3d5 4s1`) for the panel to format: "Chromium breaks the filling
 * rule: it has 3d5 4s1 where the rule predicts 3d4 4s2."
 */
export function fillingNote(
  name: string,
  atom: Atom,
): { name: string; actual: string; filling: string } | null {
  if (!atom.breaksFillingRule) return null;
  const text = (pick: (d: SubshellDifference) => number) =>
    atom.differences
      .filter((d) => pick(d) > 0)
      .map((d) => `${d.subshell}${String(pick(d))}`)
      .join(' ');
  return { name, actual: text((d) => d.actual), filling: text((d) => d.filling) };
}
