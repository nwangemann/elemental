import { describe, expect, it } from 'vitest';
import {
  addRecent,
  BOND_LABELS,
  isomersOf,
  leadsTo,
  madeOf,
  parseRecent,
  RECENT_LIMIT,
} from './compoundCard.ts';
import { COMPOUNDS } from './compounds/index.ts';
import { ELEMENTS } from './elements/index.ts';
import { tourMove, tourStops, WALK_REACH } from './tour.ts';
import { TILES } from './layout.ts';

const NUMBERS = new Map(ELEMENTS.map((e) => [e.symbol, { number: e.number, name: e.name }]));
const byId = (id: string) => COMPOUNDS.find((c) => c.id === id)!;

describe('compound card', () => {
  it('has a bond label for every bond in the set', () => {
    for (const c of COMPOUNDS) expect(BOND_LABELS[c.bond]).toBeTruthy();
  });

  it('lists what a compound is made of, in formula order, with tile numbers', () => {
    expect(madeOf(byId('water'), NUMBERS)).toEqual([
      { symbol: 'H', name: 'Hydrogen', number: 1, count: 2 },
      { symbol: 'O', name: 'Oxygen', number: 8, count: 1 },
    ]);
    expect(madeOf(byId('steel'), NUMBERS).map((m) => m.count)).toEqual([null, null]);
  });

  it('links Leads to items that name a compound in the set', () => {
    const items = leadsTo(byId('carbon-dioxide'), COMPOUNDS);
    expect(items.every((i) => i.text.length > 0)).toBe(true);
    const linked = COMPOUNDS.flatMap((c) => leadsTo(c, COMPOUNDS)).filter((i) => i.compound);
    expect(linked.map((i) => i.compound!.id)).toContain('glucose');
    for (const i of linked) expect(i.compound!.name.toLowerCase()).toBe(i.text.toLowerCase());
  });
});

describe('isomers on the card', () => {
  it('links each isomer both ways, and nothing else', () => {
    expect(isomersOf(byId('ethanol'), COMPOUNDS).map((c) => c.id)).toEqual(['dimethyl-ether']);
    expect(isomersOf(byId('dimethyl-ether'), COMPOUNDS).map((c) => c.id)).toEqual(['ethanol']);
    expect(isomersOf(byId('water'), COMPOUNDS)).toEqual([]);
  });
});

describe('recently made', () => {
  it('puts the newest first, without duplicates, up to the limit', () => {
    expect(addRecent(['water', 'ozone'], 'ozone')).toEqual(['ozone', 'water']);
    const recent = ['water'];
    expect(addRecent(recent, 'water')).toBe(recent);
    let list: string[] = [];
    for (let i = 0; i < 12; i++) list = addRecent(list, `c${String(i)}`);
    expect(list).toHaveLength(RECENT_LIMIT);
    expect(list[0]).toBe('c11');
  });

  it('reads stored text safely', () => {
    const known = new Set(['water', 'ozone']);
    expect(parseRecent(null, known)).toEqual([]);
    expect(parseRecent('not json', known)).toEqual([]);
    expect(parseRecent('{"a":1}', known)).toEqual([]);
    expect(parseRecent('["water", 3, "gone", "water", "ozone"]', known)).toEqual([
      'water',
      'ozone',
    ]);
  });
});

describe('Show me tour', () => {
  it('stops at each element in formula order and picks up its count', () => {
    expect(tourStops(byId('water'), NUMBERS)).toEqual([
      { symbol: 'H', number: 1, pick: 2 },
      { symbol: 'O', number: 8, pick: 1 },
    ]);
    expect(tourStops(byId('steel'), NUMBERS).map((s) => s.pick)).toEqual([1, 1]);
  });

  it('picks one of each for a compound too big to carry', () => {
    const sucrose = byId('sucrose');
    expect(sucrose.carryable).toBe(false);
    expect(tourStops(sucrose, NUMBERS).every((s) => s.pick === 1)).toBe(true);
  });

  it('walks to near tiles and flies to far ones, or always flies with reduced motion', () => {
    const h = TILES[0]!;
    const li = TILES[2]!;
    const o = TILES[7]!;
    expect(tourMove(h, h, false)).toBe('here');
    expect(tourMove(h, li, false)).toBe('walk');
    expect(Math.hypot(o.x - h.x, o.z - h.z)).toBeGreaterThan(WALK_REACH);
    expect(tourMove(h, o, false)).toBe('fly');
    expect(tourMove(h, li, true)).toBe('fly');
    expect(tourMove(null, li, false)).toBe('fly');
  });
});
