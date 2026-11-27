import { describe, expect, it } from 'vitest';
import { cartesian, cellCounts, cifNumber, fillCell, parseCif, parseOp } from './cif.ts';

// A cut-down rock-salt CIF: the F centring and a few of Fm-3m's operations are enough to
// fill a cube of four sodium and four chloride ions.
const ROCK_SALT = `data_test
_cell_length_a                   5.6402(3)
_cell_length_b                   5.6402(3)
_cell_length_c                   5.6402(3)
_cell_angle_alpha                90
_cell_angle_beta                 90
_cell_angle_gamma                90
_publ_section_title
;
 A text field the reader skips, loop_ and all
;
loop_
_symmetry_equiv_pos_as_xyz
'x, y, z'
'x, y+1/2, z+1/2'
'x+1/2, y, z+1/2'
'x+1/2, y+1/2, z'
'-x, -y, -z'
loop_
_atom_site_label
_atom_site_type_symbol
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
_atom_site_occupancy
Na1 Na1+ 0 0 0 1.
Cl1 Cl1- 0.5 0.5 0.5 1.
H1 H 0.1 0.1 0.1 0.25
`;

describe('cif', () => {
  it('reads numbers with uncertainties', () => {
    expect(cifNumber('5.6402(3)')).toBe(5.6402);
    expect(cifNumber('-0.25')).toBe(-0.25);
    expect(() => cifNumber('?')).toThrow();
  });

  it('parses symmetry operations', () => {
    expect(parseOp('x, y, z')([0.1, 0.2, 0.3])).toEqual([0.1, 0.2, 0.3]);
    const op = parseOp('-x+1/2, x-y, z+0.5');
    const [a, b, c] = op([0.1, 0.2, 0.3]);
    expect(a).toBeCloseTo(0.4);
    expect(b).toBeCloseTo(-0.1);
    expect(c).toBeCloseTo(0.8);
    expect(() => parseOp('x, y')).toThrow();
    expect(() => parseOp('x, y, q')).toThrow();
  });

  it('reads the cell, operations and sites, skipping text fields', () => {
    const cif = parseCif(ROCK_SALT);
    expect(cif.cell).toEqual({ a: 5.6402, b: 5.6402, c: 5.6402, alpha: 90, beta: 90, gamma: 90 });
    expect(cif.ops).toHaveLength(5);
    expect(cif.sites.map((s) => s.symbol)).toEqual(['Na', 'Cl', 'H']);
  });

  it('fills the cell once per position, keeping a share of partly filled sites', () => {
    const atoms = fillCell(parseCif(ROCK_SALT));
    // H sits at 25 %: 5 distinct copies (one per operation), so round(1.25) = 1 is kept.
    expect(Object.fromEntries(cellCounts(atoms))).toEqual({ Na: 4, Cl: 4, H: 1 });
    for (const a of atoms) for (const v of [a.x, a.y, a.z]) expect(v >= 0 && v < 1).toBe(true);
  });

  it('converts fractional to Cartesian for oblique cells', () => {
    const hex = cartesian({ a: 2, b: 2, c: 3, alpha: 90, beta: 90, gamma: 120 });
    const [x, y, z] = hex([0, 1, 1]);
    expect(x).toBeCloseTo(-1);
    expect(y).toBeCloseTo(Math.sqrt(3));
    expect(z).toBeCloseTo(3);
  });
});
