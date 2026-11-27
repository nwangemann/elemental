import { describe, expect, it } from 'vitest';
import { carriedCounts, dropLast, dropOne, pickUp, withCounts, type Carry } from './carry.ts';

const pickAll = (symbols: string[], start: Carry = []) => symbols.reduce(pickUp, start);

describe('carry', () => {
  it('counts atoms by element in the order each was first picked up', () => {
    expect([...carriedCounts(['H', 'O', 'H'])]).toEqual([
      ['H', 2],
      ['O', 1],
    ]);
  });

  it('refuses a sixth element and a 25th atom, keeping the same carry', () => {
    const five = pickAll(['C', 'H', 'O', 'N', 'S']);
    expect(pickUp(five, 'P')).toBe(five);
    expect(pickUp(five, 'C')).toHaveLength(6);
    const full = pickAll(Array<string>(24).fill('H'));
    expect(full).toHaveLength(24);
    expect(pickUp(full, 'H')).toBe(full);
  });

  it('drops the last atom, or the latest of one element', () => {
    expect(dropLast(['H', 'O', 'H'])).toEqual(['H', 'O']);
    const empty: Carry = [];
    expect(dropLast(empty)).toBe(empty);
    expect(dropOne(['H', 'O', 'H'], 'O')).toEqual(['H', 'H']);
    expect(dropOne(['H'], 'O')).toEqual(['H']);
  });

  it('fills in counts, keeping carried elements first', () => {
    const glucose = new Map([
      ['C', 6],
      ['H', 12],
      ['O', 6],
    ]);
    const filled = withCounts(['O', 'C', 'H'], glucose);
    expect(filled).toHaveLength(24);
    expect([...carriedCounts(filled).keys()]).toEqual(['O', 'C', 'H']);
    const tooBig = new Map([
      ['C', 12],
      ['H', 22],
      ['O', 11],
    ]);
    const carry: Carry = ['C'];
    expect(withCounts(carry, tooBig)).toBe(carry);
  });
});
