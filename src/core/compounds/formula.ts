// Formula parsing, kept apart from `normalize.ts` so runtime code (contexts) can read
// formulas without loading zod.

const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉';

/**
 * Element counts of a formula, in order of first appearance. Accepts ASCII or subscript
 * digits and parenthesised groups with a multiplier, so it reads both the display
 * formula "Ca₃(PO₄)₂" and PubChem's Hill formula "Ca3O8P2". Throws on anything else.
 */
export function parseFormula(formula: string): Map<string, number> {
  const text = [...formula]
    .map((c) => {
      const i = SUBSCRIPTS.indexOf(c);
      return i >= 0 ? String(i) : c;
    })
    .join('');
  let at = 0;
  /** The character at the cursor, or '' past the end. */
  const peek = () => text.charAt(at);
  const number = (): number => {
    let digits = '';
    while (/\d/.test(peek())) digits += text.charAt(at++);
    return digits ? Number(digits) : 1;
  };
  const group = (): Map<string, number> => {
    const counts = new Map<string, number>();
    const add = (symbol: string, n: number) => counts.set(symbol, (counts.get(symbol) ?? 0) + n);
    while (at < text.length && peek() !== ')') {
      if (peek() === '(') {
        at++;
        const inner = group();
        if (peek() !== ')') throw new Error(`Unclosed group in ${formula}`);
        at++;
        const times = number();
        for (const [symbol, n] of inner) add(symbol, n * times);
      } else if (/[A-Z]/.test(peek())) {
        let symbol = text.charAt(at++);
        if (/[a-z]/.test(peek())) symbol += text.charAt(at++);
        add(symbol, number());
      } else throw new Error(`Unexpected "${peek()}" in ${formula}`);
    }
    return counts;
  };
  const counts = group();
  if (at !== text.length || counts.size === 0) throw new Error(`Cannot read formula ${formula}`);
  return counts;
}
