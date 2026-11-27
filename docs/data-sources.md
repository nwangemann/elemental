# Data sources

Element data is fetched at build time by `npm run data` (`scripts/build-elements.ts`), validated, and committed as `src/data/elements.json`. The app makes no runtime API calls. Re-run the script to refresh; the output is sorted and stable, so the diff shows exactly what changed.

| Source                                                                                                              | Licence                    | Fields taken                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [PubChem periodic table](https://pubchem.ncbi.nlm.nih.gov/periodic-table/) (NIH, `pug/periodictable/JSON`, keyless) | US government work, public | Name, symbol, atomic weight, electron configuration, electronegativity, atomic radius, first ionization energy, electron affinity, oxidation states, standard state, melting and boiling points, density, family, year discovered |
| [Wikidata](https://www.wikidata.org/) (SPARQL endpoint)                                                             | CC0                        | Discoverers (P61), named after (P138); the item ID only joins rows and is not kept                                                                                                                                                |

Only fields the app reads are kept (ADR 17): PubChem's CPK colour is not taken.

Derived in code, not fetched: period, group and block, from the atomic number (`src/core/elements/position.ts`). The layout follows IUPAC, with lutetium and lawrencium in group 3, so the f-block rows are La–Yb and Ac–No.

## Units

Melting and boiling points in kelvin; density in g/cm³ for every state; atomic radius in picometres (van der Waals); ionization energy and electron affinity in eV; electronegativity on the Pauling scale. Unknown values are `null`.

## Known gaps and corrections

- Wikidata lists no discoverer for elements known since antiquity, nor yet for polonium, radium and uranium; no "named after" for curium and some ancient elements.
- Values for the superheavy elements are predictions where they exist; `standardStateIsPredicted` and `electronConfigurationIsPredicted` say so.

Reference values are checked against [IUPAC](https://iupac.org/) and [NIST](https://www.nist.gov/pml/atomic-spectra-database).
