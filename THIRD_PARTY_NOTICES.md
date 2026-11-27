# Third-party notices

## Data

- **PubChem** (National Library of Medicine, NIH): element properties in `src/data/elements.json`. US government work, public domain in the United States. Kim S, et al. PubChem. https://pubchem.ncbi.nlm.nih.gov/
- **PubChem**: compound IDs, molecular formulas and computed 3D conformers in `src/data/compounds.json` and `src/data/compound-shapes.json` (combine mode), and CPK colours for the elements those compounds use. Same terms as above.
- **Crystallography Open Database**: the crystal structures that combine mode's lattice chunks are cut from (`src/data/compound-shapes.json`; entries listed in `docs/data-sources.md`). CC0 1.0. Gražulis S, et al. Crystallography Open Database – an open-access collection of crystal structures. J. Appl. Cryst. 42 (2009) 726–729. https://www.crystallography.net/
- **Wikidata**: discoverers, "named after" and item IDs in `src/data/elements.json`. CC0 1.0. https://www.wikidata.org/

## Fonts

- **Inter** (Bold, Latin subset) by The Inter Project Authors, via `@fontsource/inter`: tile labels, shipped as a signed-distance-field atlas rendered from the font (`src/assets/label-atlas.png`). SIL Open Font License 1.1. https://github.com/rsms/inter
