import { describe, expect, it } from 'vitest';
import { TILES } from './layout.ts';
import { KEY_MAP } from './input.ts';
import {
  isReturnCode,
  nearestTile,
  NUMBER_STEP_KEYS,
  numberStepForKey,
  RETURN_KEYS,
  stepDirectionForCode,
  stepNumber,
  stepTile,
} from './tileStep.ts';

const at = (n: number) => TILES[n - 1]!;

describe('stepTile', () => {
  it('steps across a row, skipping empty cells', () => {
    expect(stepTile(1, 'right')).toBe(2); // H → He over the gap
    expect(stepTile(2, 'left')).toBe(1);
    expect(stepTile(4, 'right')).toBe(5); // Be → B over the transition gap
    expect(stepTile(3, 'right')).toBe(4);
  });

  it('steps between periods in the same column', () => {
    expect(stepTile(1, 'down')).toBe(3);
    expect(stepTile(3, 'up')).toBe(1);
    expect(stepTile(2, 'down')).toBe(10); // He → Ne over the gap
    expect(stepTile(26, 'down')).toBe(44); // Fe → Ru
  });

  it('stops at the edges of the table', () => {
    expect(stepTile(1, 'up')).toBeNull();
    expect(stepTile(1, 'left')).toBeNull();
    expect(stepTile(2, 'right')).toBeNull();
  });

  it('goes down into the f-block from every column of period 7', () => {
    const period7 = TILES.filter((t) => t.row === 6);
    for (const t of period7) {
      const next = stepTile(t.number, 'down');
      expect(next, `from ${String(t.number)}`).not.toBeNull();
      expect(at(next!).row).toBe(8);
    }
  });

  it('comes back up out of the f-block to period 7', () => {
    const fRow = TILES.filter((t) => t.row === 8);
    for (const t of fRow) expect(at(stepTile(t.number, 'up')!).row).toBe(6);
  });

  it('ends at the bottom f-block row', () => {
    for (const t of TILES.filter((x) => x.row === 9)) expect(stepTile(t.number, 'down')).toBeNull();
  });

  it('returns null for an unknown element', () => {
    expect(stepTile(0, 'down')).toBeNull();
  });
});

describe('nearestTile', () => {
  it('finds the tile at or nearest a point', () => {
    expect(nearestTile(at(26).x, at(26).z)).toBe(26);
    expect(nearestTile(at(1).x + 0.2, at(1).z - 0.3)).toBe(1);
    expect(nearestTile(at(1).x - 50, at(1).z)).toBe(1);
  });
});

describe('stepDirectionForCode', () => {
  it('maps I J K L and nothing else', () => {
    expect(stepDirectionForCode('KeyI')).toBe('up');
    expect(stepDirectionForCode('KeyK')).toBe('down');
    expect(stepDirectionForCode('KeyJ')).toBe('left');
    expect(stepDirectionForCode('KeyL')).toBe('right');
    expect(stepDirectionForCode('KeyW')).toBeNull();
  });
});

describe('isReturnCode', () => {
  it('maps R and Home and nothing else', () => {
    expect(isReturnCode('KeyR')).toBe(true);
    expect(isReturnCode('Home')).toBe(true);
    expect(isReturnCode('KeyE')).toBe(false);
  });

  it('does not overlap the walking or stepping keys', () => {
    for (const code of RETURN_KEYS) {
      expect(KEY_MAP[code]).toBeUndefined();
      expect(stepDirectionForCode(code)).toBeNull();
    }
  });
});

describe('stepNumber', () => {
  it('steps to the next and previous element', () => {
    expect(stepNumber(1, 1)).toBe(2); // H → He
    expect(stepNumber(2, -1)).toBe(1);
    expect(stepNumber(56, 1)).toBe(57); // Ba → La, into the f-block
    expect(stepNumber(71, 1)).toBe(72); // Lu → Hf, back to period 6
  });

  it('clamps at hydrogen and oganesson', () => {
    expect(stepNumber(1, -1)).toBe(1);
    expect(stepNumber(118, 1)).toBe(118);
    expect(TILES.length).toBe(118);
  });
});

describe('numberStepForKey', () => {
  it('maps [ and ] by the character typed', () => {
    expect(numberStepForKey('[')).toBe(-1);
    expect(numberStepForKey(']')).toBe(1);
    expect(numberStepForKey('{')).toBe(0);
    expect(numberStepForKey('BracketLeft')).toBe(0);
  });

  it('stays clear of the walking keys', () => {
    for (const key of Object.keys(NUMBER_STEP_KEYS)) expect(KEY_MAP[key]).toBeUndefined();
  });
});
