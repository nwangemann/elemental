# 19. Discovery timeline: what "discovered" means, isolation-year overrides and the year scale

- Status: accepted
- Date: 2026-11-26
- Extends: [ADR 11](0011-lenses.md)

## Context

A fourth lens scrubs a year and shows which elements chemists knew then. The data has, per element, PubChem's discovery year or an antiquity flag. Every element has one or the other, and the dated years run from 1669 (phosphorus) to 2010 (tennessine). PubChem dates some elements by when a compound was first used rather than when the element was recognised: aluminium and calcium read "Ancient" (alum and lime), and fluorine reads 1670 (fluorspar used to etch glass). The panel's discovery facts, the height lens's discovery year and the explorer's discovery sort read the same field, so a timeline would make the error visible everywhere.

## Decision

**Meaning of "discovered".** An element counts as discovered from the year it was first recognised as a new substance. Where PubChem's year marks a compound in use, the element is dated by its isolation instead. Where a new element was identified in an oxide or mineral before the metal was isolated (beryllium 1798, uranium 1789 and others), that identification is the date, as PubChem has it.

**Overrides.** A short, commented list in `core/elements/normalize.ts` (`DISCOVERY_OVERRIDES`), applied when the data script builds the dataset: fluorine 1886 (Moissan), aluminium 1825 (Ørsted), calcium 1808 (Davy). Sources are in `docs/data-sources.md`. An audit of every antiquity and pre-1750 year found no other case: phosphorus 1669, cobalt 1735, platinum 1735 and zinc 1746 date identification, and arsenic and antimony stay as antiquity because both were known as substances before the timeline's 1650 start. A test pins the committed data to the list. The change applies to all three readers, so the panel, the height lens and the explorer sort show the corrected years too. Antiquity now holds 11 elements.

**Rule.** `knownBy(e, year)` in `core/discovery.ts`: antiquity elements are always known; dated ones from their year on, inclusive. The antiquity stop is the year `ANTIQUITY` (−Infinity), so the same comparison covers it and only the antiquity set is known there. With these dates, 12 elements are known in 1700, 32 in 1800, 63 in 1869, 83 in 1900, 96 in 1945, 114 in 2000 and all 118 from 2010.

**Scale.** The slider is piecewise linear: the Antiquity stop at 0, a gap to 1650 at 0.05, 1650–1750 (four discoveries) compressed into 0.05–0.15, and 1750–2010 linear over the remaining 0.85, about a third of a percent of track per year. Positions in the lower half of the gap read as Antiquity, the upper half as 1650. `positionOfYear` is the inverse of `yearAt` for every whole year on the scale. Detents at Antiquity, 1789 (Lavoisier's list of elements), 1869 (Mendeleev's table) and Today (2010) snap within 0.01 of track (about three years) on pointer drags; keyboard steps of one year do not snap.

**Link and state.** The store holds `lens.year`, null when the lens is off (the default) and `ANTIQUITY` for the stop. Deep links carry it as `?year=1869`, or `?year=antiquity`, beside `?lens=`, `?colour=` and `?t=`. Years round to whole years and clamp to 1650–2010; non-numbers are ignored.

## Consequences

- The years shown in the panel and used by the height lens and explorer sort change for fluorine, aluminium and calcium; anyone comparing with PubChem sees a difference, which `docs/data-sources.md` explains.
- Refreshing the data keeps the overrides, since they are applied in the build, not patched into the JSON.
- The compressed 1650–1750 stretch makes years there coarser to pick by pointer (about one year per 0.1% of track); the keyboard still steps one year at a time.
