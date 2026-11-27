import { describe, expect, it } from 'vitest';
import { fillIn, nearest, wrongAmounts, type Carried } from './combine.ts';
import { COMPOUNDS } from './compounds/index.ts';
import {
  carryLine,
  countWord,
  leadsLine,
  listOf,
  nearMissLine,
  ratioLine,
  refusalLine,
  startersLine,
  traySummary,
} from './trayText.ts';

const carry = (spec: Record<string, number>): Carried => new Map(Object.entries(spec));

describe('tray text helpers', () => {
  it('words small counts and lists items', () => {
    expect(countWord(1)).toBe('one');
    expect(countWord(10)).toBe('ten');
    expect(countWord(24)).toBe('24');
    expect(listOf(['a'])).toBe('a');
    expect(listOf(['a', 'b'])).toBe('a and b');
    expect(listOf(['a', 'b', 'c'], 'or')).toBe('a, b or c');
  });

  it('lists the carry in first-picked order', () => {
    expect(carryLine(carry({ O: 1, H: 2 }))).toBe('O 1, H 2');
  });
});

describe('tray summary', () => {
  it('offers the starters when nothing is carried', () => {
    expect(startersLine(COMPOUNDS.filter((c) => c.starter))).toBe(
      'Try water, table salt or carbon dioxide.',
    );
    expect(traySummary(new Map(), COMPOUNDS)).toBe(
      'Carrying nothing. Try water, table salt or carbon dioxide.',
    );
  });

  it('names the nearest compound and every atom still missing', () => {
    expect(traySummary(carry({ Na: 1 }), COMPOUNDS)).toBe(
      'Carrying Na 1. Could become table salt with one Cl.',
    );
    expect(leadsLine(carry({ S: 1 }), COMPOUNDS)).toBe(
      "Could become pyrite (fool's gold) with one Fe and one S.",
    );
  });

  it('says what forms now and what it could grow into', () => {
    expect(traySummary(carry({ H: 2 }), COMPOUNDS)).toBe(
      'Carrying H 2. Makes hydrogen gas. Could become water with one O.',
    );
    expect(leadsLine(carry({ C: 2, H: 6, O: 1 }), COMPOUNDS)).toMatch(
      /^Makes ethanol or dimethyl ether\. Could become /,
    );
    expect(leadsLine(carry({ H: 2, O: 1 }), COMPOUNDS)).toBe(
      'Makes water. Could become hydrogen peroxide with one O.',
    );
  });

  it('never ends at a dead end: nothing forms, but the nearest is named', () => {
    expect(leadsLine(carry({ Au: 1, H: 1 }), COMPOUNDS)).toBe(
      'Nothing in the set forms from just these. Could become hydrogen gas by dropping one Au and adding one H.',
    );
    expect(leadsLine(carry({ Au: 1 }), COMPOUNDS)).toBe(
      'Nothing in the set forms from just these.',
    );
  });

  it('puts a carry-limit refusal first', () => {
    expect(refusalLine('P', 'too-many-elements')).toBe(
      "Can't pick up P: you can carry five elements at most.",
    );
    expect(refusalLine('H', 'too-many-atoms')).toBe(
      "Can't pick up H: you can carry 24 atoms at most.",
    );
    expect(
      traySummary(carry({ H: 2 }), COMPOUNDS, { symbol: 'P', reason: 'too-many-elements' }),
    ).toMatch(/^Can't pick up P: .+ Carrying H 2\./);
  });
});

describe('tray guidance lines', () => {
  const names = new Map([
    ['C', 'carbon'],
    ['H', 'hydrogen'],
    ['O', 'oxygen'],
  ]);

  it('lists the nearest compounds with atoms to add and drop', () => {
    expect(nearest(carry({ H: 2 }), COMPOUNDS).map(nearMissLine)).toEqual([
      'Water — 1 more O',
      'Hydrogen sulfide — 1 more S',
      'Ammonia — 1 more N, 1 more H',
    ]);
    expect(nearest(carry({ Na: 1, Cl: 2 }), COMPOUNDS).map(nearMissLine)[0]).toBe(
      'Table salt — 1 fewer Cl',
    );
  });

  it('teaches the ratio for right elements in the wrong amounts', () => {
    const glucose = wrongAmounts(carry({ C: 1, H: 2, O: 1 }), COMPOUNDS).find(
      (w) => w.compound.id === 'glucose',
    )!;
    expect(ratioLine(glucose, names)).toBe(
      'Glucose is C₆H₁₂O₆: 1 carbon, 2 hydrogen, 1 oxygen, six times over.',
    );
    const water = fillIn(carry({ H: 1, O: 1 }), COMPOUNDS)!;
    expect(ratioLine(water, names)).toBe('Water is H₂O: 2 hydrogen, 1 oxygen.');
  });

  it('offers Fill in only while nothing forms, and not for one-element molecules', () => {
    expect(fillIn(carry({ H: 1, O: 1 }), COMPOUNDS)?.compound.id).toBe('water');
    expect(fillIn(carry({ H: 2, O: 1 }), COMPOUNDS)).toBeUndefined();
    expect(fillIn(carry({ O: 1 }), COMPOUNDS)).toBeUndefined();
  });

  it('forms lone atoms and self-pairs', () => {
    expect(traySummary(carry({ Ar: 1 }), COMPOUNDS)).toBe('Carrying Ar 1. Makes argon.');
    expect(leadsLine(carry({ O: 1 }), COMPOUNDS)).toBe('Could become oxygen gas with one O.');
    expect(leadsLine(carry({ O: 2 }), COMPOUNDS)).toMatch(/^Makes oxygen gas\./);
    expect(leadsLine(carry({ O: 3 }), COMPOUNDS)).toMatch(/^Makes ozone\./);
  });
});
