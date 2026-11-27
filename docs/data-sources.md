# Data sources

Element data is fetched at build time by `npm run data` (`scripts/build-elements.ts`), validated, and committed as `src/data/elements.json`. The app makes no runtime API calls. Re-run the script to refresh; the output is sorted and stable, so the diff shows exactly what changed.

| Source                                                                                                              | Licence                    | Fields taken                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [PubChem periodic table](https://pubchem.ncbi.nlm.nih.gov/periodic-table/) (NIH, `pug/periodictable/JSON`, keyless) | US government work, public | Name, symbol, atomic weight, electron configuration, electronegativity, atomic radius, first ionization energy, electron affinity, oxidation states, standard state, melting and boiling points, density, family, year discovered |
| [Wikidata](https://www.wikidata.org/) (SPARQL endpoint)                                                             | CC0                        | Discoverers (P61), named after (P138); the item ID only joins rows and is not kept                                                                                                                                                |

Only fields the app reads are kept (ADR 17): PubChem's CPK colour is not taken.

Derived in code, not fetched: period, group and block, from the atomic number (`src/core/elements/position.ts`). The layout follows IUPAC, with lutetium and lawrencium in group 3, so the f-block rows are La–Yb and Ac–No.

## Compounds (combine mode)

Combine mode ([ADR 20](adr/0020-combine-mode.md)) takes, per compound, PubChem's CID, molecular formula and computed 3D conformer (PUG-REST), and CPK colours for the elements those compounds use. These are computed by PubChem itself and fall under [NCBI's molecular data policy](https://www.ncbi.nlm.nih.gov/home/about/policies/), which places no restriction on use or redistribution. PubChem also carries text from hundreds of depositors under their own terms ([PubChem downloads, data usage and licensing](https://pubchem.ncbi.nlm.nih.gov/docs/downloads)); none of it is taken. Compound card copy is written for this project. Scripted requests stay under PubChem's rate limit.

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
