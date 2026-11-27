import { atomSummary, electronAngles, type Atom } from '../core/atom.ts';

/** Diagram units: the SVG scales to the panel width. */
const SIZE = 240;
const CENTRE = SIZE / 2;
const NUCLEUS = 17;
const FIRST_RING = 29;
/** Outermost ring radius for seven shells; fewer shells spread out up to this. */
const LAST_RING = 108;
const MAX_STEP = 22;
const ELECTRON = 3;
/** Count label: 9px tabular digits are about 5.4 units wide; keep this much air past the halo. */
const DIGIT = 5.4;
const LABEL_AIR = 2.5;

/**
 * Electron shells as a flat Bohr-style diagram: the nucleus with the atomic number, one ring per
 * shell with its electrons evenly spaced, and the electron count at the top of each ring. The
 * outer (valence) ring and its electrons take the family accent. Drawn from the stored
 * configuration (`core/atom.ts`), so exceptions come out as measured.
 */
export function AtomDiagram({ atom, number }: { atom: Atom; number: number }) {
  const rings = atom.shells.length;
  const step = rings > 1 ? Math.min(MAX_STEP, (LAST_RING - FIRST_RING) / (rings - 1)) : 0;
  return (
    <svg
      className="atom-diagram"
      viewBox={`0 0 ${String(SIZE)} ${String(SIZE)}`}
      role="img"
      aria-label={atomSummary(atom)}
    >
      {atom.shells.map((shell, i) => {
        const r = FIRST_RING + i * step;
        const valence = shell.n === atom.valenceShell;
        const k = shell.electrons;
        return (
          <g key={shell.n} className={valence ? 'atom-ring atom-valence' : 'atom-ring'}>
            <circle cx={CENTRE} cy={CENTRE} r={r} className="atom-orbit" />
            {electronAngles(k, (String(k).length * DIGIT) / 2 / r + (ELECTRON + LABEL_AIR) / r).map(
              (angle, j) => (
                <circle
                  key={j}
                  cx={CENTRE + r * Math.cos(angle)}
                  cy={CENTRE + r * Math.sin(angle)}
                  r={ELECTRON}
                  className="atom-electron"
                />
              ),
            )}
            <text x={CENTRE} y={CENTRE - r} className="atom-count" dominantBaseline="central">
              {k}
            </text>
          </g>
        );
      })}
      <circle cx={CENTRE} cy={CENTRE} r={NUCLEUS} className="atom-nucleus" />
      <text x={CENTRE} y={CENTRE} className="atom-z" dominantBaseline="central">
        {number}
      </text>
    </svg>
  );
}
