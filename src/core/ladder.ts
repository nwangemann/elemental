// The scale ladder on the compound card (ADR 20): short curated chains from one compound up to
// the things built from it, glucose → starch → bread. No simulation: each rung is a label, a
// line and a small picture made of one repeated unit, so a chain reads as "more of the same".
// Pure: the card draws the pictures from `artPoints`.

/** The repeated unit: a sugar ring, an amino acid bead, a DNA letter, a crystal cell or a metal atom. */
export type Unit = 'ring' | 'bead' | 'letter' | 'cell' | 'atom';

/**
 * How the units are placed: one alone, a chain, a folded chain, side-by-side chains (fibres),
 * a double helix, a packed block, or a loose jumble.
 */
export type Layout = 'one' | 'chain' | 'fold' | 'fibres' | 'helix' | 'block' | 'jumble';

export interface Rung {
  label: string;
  /** One short line on what this step is. */
  line: string;
  unit: Unit;
  layout: Layout;
  /** A compound in the set whose card this rung opens. */
  compound?: string;
  /** True for an alloy: every few units is the other element. */
  mixed?: true;
}

/** The chains, bottom rung first. A compound can sit on more than one (glucose). */
export const LADDERS: readonly (readonly Rung[])[] = [
  [
    { label: 'Glucose', line: 'One sugar ring.', unit: 'ring', layout: 'one', compound: 'glucose' },
    { label: 'Starch', line: 'Thousands of rings in a chain.', unit: 'ring', layout: 'chain' },
    { label: 'Bread', line: 'Mostly starch, packed in grains.', unit: 'ring', layout: 'block' },
  ],
  [
    { label: 'Glucose', line: 'One sugar ring.', unit: 'ring', layout: 'one', compound: 'glucose' },
    { label: 'Cellulose', line: 'Straight chains, side by side.', unit: 'ring', layout: 'fibres' },
    { label: 'Wood and cotton', line: 'Fibres of cellulose.', unit: 'ring', layout: 'block' },
  ],
  [
    { label: 'Glycine', line: 'One amino acid.', unit: 'bead', layout: 'one', compound: 'glycine' },
    { label: 'Protein', line: 'A chain of them, folded.', unit: 'bead', layout: 'fold' },
    { label: 'Muscle and enzymes', line: 'Proteins at work.', unit: 'bead', layout: 'block' },
  ],
  [
    {
      label: 'Adenine',
      line: 'One DNA letter (A).',
      unit: 'letter',
      layout: 'one',
      compound: 'adenine',
    },
    { label: 'DNA', line: 'Letters paired in a twisted ladder.', unit: 'letter', layout: 'helix' },
  ],
  [
    {
      label: 'Iron and carbon',
      line: 'Mostly iron, a pinch of carbon.',
      unit: 'atom',
      layout: 'one',
    },
    {
      label: 'Steel',
      line: 'Carbon tucked between iron atoms.',
      unit: 'atom',
      layout: 'block',
      compound: 'steel',
      mixed: true,
    },
    {
      label: 'Bridges and rails',
      line: 'Steel, by the tonne.',
      unit: 'atom',
      layout: 'jumble',
      mixed: true,
    },
  ],
  [
    { label: 'Copper and tin', line: 'About nine copper to one tin.', unit: 'atom', layout: 'one' },
    {
      label: 'Bronze',
      line: 'Tin mixed into copper.',
      unit: 'atom',
      layout: 'block',
      compound: 'bronze',
      mixed: true,
    },
    {
      label: 'Bells and medals',
      line: 'Cast in moulds.',
      unit: 'atom',
      layout: 'jumble',
      mixed: true,
    },
  ],
  [
    {
      label: 'Quartz',
      line: 'An ordered crystal.',
      unit: 'cell',
      layout: 'block',
      compound: 'quartz',
    },
    { label: 'Sand', line: 'Quartz broken into grains.', unit: 'cell', layout: 'jumble' },
    {
      label: 'Glass',
      line: 'Melted sand, cooled too fast to line up.',
      unit: 'cell',
      layout: 'jumble',
    },
  ],
  [
    {
      label: 'Limestone',
      line: 'Calcium carbonate crystal.',
      unit: 'cell',
      layout: 'block',
      compound: 'calcium-carbonate',
    },
    {
      label: 'Quicklime',
      line: 'Heated: the carbon dioxide leaves.',
      unit: 'cell',
      layout: 'block',
      compound: 'lime',
    },
    {
      label: 'Concrete',
      line: 'Cement made from lime binds sand and stones.',
      unit: 'cell',
      layout: 'jumble',
    },
  ],
];

/** The chains a compound sits on, for its card. */
export function laddersFor(id: string): (readonly Rung[])[] {
  return LADDERS.filter((l) => l.some((r) => r.compound === id));
}

/** Where a rung's picture puts its units, in a 0–1 square (x, y, and 1 for the other element). */
export function artPoints(rung: Pick<Rung, 'layout' | 'mixed'>): [number, number, number][] {
  const pts: [number, number][] = [];
  const grid = (cols: number, rows: number) => {
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) pts.push([(c + 0.5) / cols, (r + 0.5) / rows]);
  };
  switch (rung.layout) {
    case 'one':
      pts.push([0.5, 0.5]);
      break;
    case 'chain':
      for (let i = 0; i < 5; i++) pts.push([0.1 + i * 0.2, 0.5]);
      break;
    case 'fold':
      // A chain that turns back on itself: an S of seven beads.
      for (let i = 0; i < 7; i++) pts.push([0.5 + 0.32 * Math.sin(i * 0.9), 0.1 + i * 0.13]);
      break;
    case 'fibres':
      grid(5, 3);
      break;
    case 'helix':
      // Two strands crossing: each letter pairs with one on the other strand.
      for (let i = 0; i < 6; i++) {
        const y = 0.1 + i * 0.16;
        const s = 0.32 * Math.sin(i * 1.1);
        pts.push([0.5 - s, y], [0.5 + s, y]);
      }
      break;
    case 'block':
      grid(4, 4);
      break;
    case 'jumble':
      // Fixed, not random (the R2 sequence), so the card never shifts but nothing lines up.
      for (let i = 0; i < 16; i++) pts.push([fract(0.5 + i * 0.7549), fract(0.5 + i * 0.5698)]);
      break;
  }
  return pts.map(([x, y], i) => [x, y, rung.mixed && i % 5 === 2 ? 1 : 0]);
}

function fract(v: number): number {
  return 0.08 + 0.84 * (v - Math.floor(v));
}
