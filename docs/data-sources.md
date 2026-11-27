# Data sources

Element data is fetched at build time by `npm run data` (`scripts/build-elements.ts`), validated, and committed as `src/data/elements.json`. The app makes no runtime API calls. Re-run the script to refresh; the output is sorted and stable, so the diff shows exactly what changed.

| Source                                                                                                              | Licence                    | Fields taken                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [PubChem periodic table](https://pubchem.ncbi.nlm.nih.gov/periodic-table/) (NIH, `pug/periodictable/JSON`, keyless) | US government work, public | Name, symbol, atomic weight, electron configuration, electronegativity, atomic radius, first ionization energy, electron affinity, oxidation states, standard state, melting and boiling points, density, family, year discovered |
| [Wikidata](https://www.wikidata.org/) (SPARQL endpoint)                                                             | CC0                        | Discoverers (P61), named after (P138); the item ID only joins rows and is not kept                                                                                                                                                |

Only fields the app reads are kept (ADR 17): PubChem's CPK colour is not taken into `elements.json` (combine mode keeps it for the elements its compounds use, below).

Derived in code, not fetched: period, group and block, from the atomic number (`src/core/elements/position.ts`). The layout follows IUPAC, with lutetium and lawrencium in group 3, so the f-block rows are La–Yb and Ac–No.

## Compounds (combine mode)

Combine mode's compound set ([ADR 20](adr/0020-combine-mode.md)) is built by `npm run data:compounds` (`scripts/build-compounds.ts`) and committed as `src/data/compounds.json`. The list, display formulas and card copy are curated in `src/core/compounds/source.ts`; the script looks each compound up by name and fails if PubChem's formula disagrees with the display formula. It takes, per compound, PubChem's CID and molecular formula (PUG-REST), and per molecule its computed 3D conformer (`record_type=3d`), baked into `src/data/compound-shapes.json` with the CPK colours of the elements the set uses (from the periodic table endpoint above). These are computed by PubChem itself and fall under [NCBI's molecular data policy](https://www.ncbi.nlm.nih.gov/home/about/policies/), which places no restriction on use or redistribution. PubChem also carries text from hundreds of depositors under their own terms ([PubChem downloads, data usage and licensing](https://pubchem.ncbi.nlm.nih.gov/docs/downloads)); none of it is taken. Compound card copy is written for this project. PubChem has no conformer for hydrogen gas or nitrogen dioxide; those two are drawn by hand from experimental geometries in [NIST's CCCBDB](https://cccbdb.nist.gov/) (H–H 0.741 Å; N–O 1.193 Å at 134.1°), in `HAND_SHAPES` (`src/core/compounds/shapes.ts`). Scripted requests stay under PubChem's rate limit.

Lattices (salts and minerals) are drawn as small chunks of their real crystal. The script fetches each one's CIF from the [Crystallography Open Database](https://www.crystallography.net/) (CC0), fills the unit cell from its symmetry operations, checks the cell holds whole formula units, and cuts the atoms within a few ångström of one centre atom. Only the parsed cell, operations and sites are kept, as a test fixture. A partly filled site (hydroxyapatite's hydroxide column) keeps that share of its positions, in one ordered arrangement.

| Compound          | COD entry                                                   | Structure                           |
| ----------------- | ----------------------------------------------------------- | ----------------------------------- |
| Table salt        | [1000041](https://www.crystallography.net/cod/1000041.html) | Rock salt                           |
| Quicklime         | [1000044](https://www.crystallography.net/cod/1000044.html) | Rock salt                           |
| Calcium carbonate | [9000965](https://www.crystallography.net/cod/9000965.html) | Calcite                             |
| Quartz            | [9000775](https://www.crystallography.net/cod/9000775.html) | α-quartz                            |
| Rust              | [9000139](https://www.crystallography.net/cod/9000139.html) | Hematite                            |
| Corundum          | [1000017](https://www.crystallography.net/cod/1000017.html) | Corundum                            |
| Magnetite         | [1011032](https://www.crystallography.net/cod/1011032.html) | Spinel                              |
| Titanium dioxide  | [9004141](https://www.crystallography.net/cod/9004141.html) | Rutile                              |
| Pyrite            | [9000594](https://www.crystallography.net/cod/9000594.html) | Pyrite                              |
| Baking soda       | [1011016](https://www.crystallography.net/cod/1011016.html) | Nahcolite (with hydrogen positions) |
| Hydroxyapatite    | [9002213](https://www.crystallography.net/cod/9002213.html) | Hydroxylapatite (synthetic sample)  |

Three chunks are built by hand in `HAND_CRYSTALS` (`src/core/compounds/shapes.ts`). Bleach: solid sodium hypochlorite is not stable without water, so it is one ion pair (Cl–O 1.69 Å). Steel: body-centred cubic iron (a = 2.8665 Å) with one carbon in an octahedral gap. Bronze: face-centred cubic copper (a = 3.6149 Å) with tin on two of 19 sites.

Bone mineral is hydroxyapatite, Ca₅(PO₄)₃(OH), rather than tricalcium phosphate, Ca₃(PO₄)₂, so the body context uses hydroxyapatite.

## Units

Melting and boiling points in kelvin, as normally quoted (1 atm; the temperature lens, ADR 18, corrects helium, whose melting point is at about 25 atm, and treats arsenic's boiling point below its melting point as sublimation); density in g/cm³ for every state; atomic radius in picometres (van der Waals); ionization energy and electron affinity in eV; electronegativity on the Pauling scale. Unknown values are `null`.

## Known gaps and corrections

- Wikidata lists no discoverer for elements known since antiquity, nor yet for polonium, radium and uranium; no "named after" for curium and some ancient elements.
- Discovery years date when an element was first recognised as a new substance. PubChem dates three by a compound's first use instead; the data script overrides them with the isolation year (`DISCOVERY_OVERRIDES` in `src/core/elements/normalize.ts`, ADR 19), each checked against the [Royal Society of Chemistry periodic table](https://www.rsc.org/periodic-table):
  - Fluorine: PubChem 1670 (fluorspar used to etch glass); isolated by Henri Moissan in 1886 ([RSC](https://www.rsc.org/periodic-table/element/9/fluorine)).
  - Aluminium: PubChem "Ancient" (alum); isolated by Hans Christian Ørsted in 1825 ([RSC](https://www.rsc.org/periodic-table/element/13/aluminium)).
  - Calcium: PubChem "Ancient" (lime); isolated by Humphry Davy in 1808 ([RSC](https://www.rsc.org/periodic-table/element/20/calcium)).

  Every antiquity and pre-1750 year was audited for the same problem and kept: phosphorus 1669, cobalt 1735, platinum 1735 and zinc 1746 date the element's identification, and arsenic and antimony were known as substances before 1650, where the discovery timeline starts. Years for elements first found in an oxide (beryllium 1798, uranium 1789 and others) date that identification, not the later isolation of the metal.

- Values for the superheavy elements are predictions where they exist; `standardStateIsPredicted` and `electronConfigurationIsPredicted` say so.

Reference values are checked against [IUPAC](https://iupac.org/) and [NIST](https://www.nist.gov/pml/atomic-spectra-database).
