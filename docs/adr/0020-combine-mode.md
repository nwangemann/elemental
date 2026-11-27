# 20. Combine mode: curated compounds, carried atoms and a lazy chunk

- Status: accepted
- Date: 2026-11-26
- Extends: [ADR 11](0011-lenses.md)

## Context

The table shows 118 elements, but not what they make. Combine mode answers "what is the world made of?": a visitor gathers atoms by walking, sees what they could become, and watches real compounds form. It needs a compound set, a matching rule, 3D shapes, keys, and room in the bundle, which is at 299 of its 300 KB ceiling.

## Decision

**A sandbox.** No score, no progress counts, no failure state. A set of atoms that forms nothing says so and keeps suggesting; nothing is ever marked wrong.

**Curated, not simulated.** About 40 compounds, listed by hand and built into a committed data file by a script. A molecule or lattice matches when the carried element counts equal its formula exactly. An alloy (steel, bronze) matches by the set of elements, since it has no fixed formula. One formula can match several molecules (C₂H₆O is ethanol and dimethyl ether), and the visitor picks among them. No product is ever guessed from valence rules.

**Kinds.** Molecule (ball-and-stick, from PubChem's computed 3D conformer), lattice (salts and minerals, a small chunk cut from the real crystal structure), alloy (an ingot) and lone atom (a noble gas "stays on its own"). Compounds over the carry limit of 5 elements and 24 atoms are Show me only.

**Data.** PubChem gives each compound its CID, molecular formula and computed 3D conformer. These are computed by PubChem itself, which NCBI places under no restriction. Depositor-contributed text is not taken: every card's copy is our own, in plain words, written from public facts. Crystal structures come from the Crystallography Open Database (CC0); where none exists to cut from (bleach, which is not stable as a dry solid, and the two alloys), a small chunk is built by hand from measured lattice constants. Context compositions (body, air, crust) come from cited reference tables. Orbs and atoms use CPK colours for the elements the compound set uses, stored with the compound data rather than in `elements.json`.

**Keys.** `C` picks up one atom of the element underfoot (the panel's **Add** does the same), and `Backspace` drops one atom of the element added last. Both are free today and follow the lens keys' rules: no modifiers, ignored in text fields.

**Loading.** Combine's code and data live in their own lazy chunk, loaded when Combine first opens. They stay out of the shell and out of the scene chunk, so a visitor who never opens Combine downloads none of it.

**Rendering.** Only while Combine is open: carried orbs as one instanced mesh, the formed model as two (atoms and bonds), and table arcs as one line mesh, so up to 4 more draw calls. Suggestion dimming reuses the explorer filter's surface dim (ADR 11), with no draw call added.

## Consequences

- The total JavaScript ceiling rises for this phase (ADR 3 amendment); the shell ceiling does not.
- Growing the set means adding rows and copy to the data script's source list, not writing code.
- Exact-count matching means a visitor carrying C, H₂, O₆ gets "right elements, wrong amounts" with a **Fill in** that sets the ratio, rather than a near-miss product.
- Combine opens on its first use with one extra request; if that delay shows, preload the chunk when the visitor hovers or focuses the Combine button.
