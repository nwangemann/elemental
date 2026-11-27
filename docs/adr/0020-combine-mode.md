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

**Forming (decided while building it).** A match forms on its own, with no button, and uses nothing up: the model shows while the carry still matches and goes back to orbs the moment an atom is added or dropped. So "leftover atoms stay carried" holds trivially, and a molecule that is also a step to a bigger one (H₂ on the way to water) shows and then keeps building. The carried orbs become the model's atoms; a lattice's other atoms grow in from the centre outward. The isomer choice is kept in the store and only applies while it is one of the matches.

**Card, Recently made and Show me (decided while building them).** The card opens inside the Combine tray, in place of the suggestions, rather than as a second panel: the element panel already holds the right side on desktops and the bottom on phones, and the card belongs with the carry that made it. Recently made is kept in the browser's `localStorage` (ids only, at most 8, unknown ids dropped on read) and has a Clear button; nothing leaves the browser. Show me moves the figure the way a visitor would: a walk to tiles within about four tiles, the explorer's fly-to for anything further (and always with reduced motion), so a tour across the table takes seconds, not a long walk. It picks the atoms up through the same store action as `C`, so the compound forms exactly as if walked. A compound too big to carry (sucrose) is toured with one atom of each element and then shows its card, which says why it doesn't form.

**Contexts (decided while building them).** The picker sits in the tray and shows only while nothing is carried, beside the starters it replaces with the context's own compounds. A picked context lights its elements and dims the rest fully, and while carrying the suggestion dim takes over, since it says what to pick up next. Its heights go through the height lens's lift and override the lens's property while Combine is open: one landscape at a time, and closing Combine brings the lens's landscape back. Shares by mass span 33 orders of magnitude in the crust, so the height is the log of the share, from the context's smallest share up to its largest, floored at one part per billion so the rarest elements share the lowest step instead of flattening the rest. The kitchen has no single composition: it only lights the elements of its compounds and leaves the heights to the lens. The kitchen's elements are written out beside the tables (a test checks them against the compound set), so the panel's "Found in" and the scene never load the compounds.

**Ladder, isomers and electrons (decided while building them).** The scale ladder is a short hand-written list in `core/ladder.ts`, not a field in the data script's source: it is a handful of chains, most of whose rungs (starch, bread, DNA) are not compounds in the set, and the card is the only reader. Each rung is drawn as a tiny SVG of one repeated unit placed by a layout (one, chain, fold, fibres, helix, block, jumble), so "more of the same" reads at a glance without an illustration per step and with no image assets. A compound on a chain shows its ladder in place of Leads to, which would repeat it. Isomers link each other by name under "Same atoms as", beside the note that says how they differ. "See the electrons" links each element to its Atom tab through a store request (`showTab`), which flies there and reopens the panel, rather than drawing shared or handed-over electrons on the card: the shell diagram already exists and is accessible, and drawing bonds per compound would need its own data.

## Consequences

- The total JavaScript ceiling rises for this phase (ADR 3 amendment); the shell ceiling does not.
- Growing the set means adding rows and copy to the data script's source list, not writing code.
- Exact-count matching means a visitor carrying C, H₂, O₆ gets "right elements, wrong amounts" with a **Fill in** that sets the ratio, rather than a near-miss product.
- Combine opens on its first use with one extra request; if that delay shows, preload the chunk when the visitor hovers or focuses the Combine button.
- Adding a chain to the ladder means a few lines in `core/ladder.ts` (a test checks every linked compound exists). The ladder and links fit within the 327 KB total ceiling with no room left, so the next feature that adds code must trim or amend ADR 3 first.
