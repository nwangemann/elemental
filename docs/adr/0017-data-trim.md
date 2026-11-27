# 17. Ship only the element fields the app reads, as plain JSON

- Status: accepted
- Date: 2026-11-26
- Amends: [ADR 3](0003-bundle-budget.md)

## Context

ADR 15 found the slow profile bound by bandwidth and named fewer bytes as the lever. The element data is the one part of the bundle the project fully controls, so it was checked first. Every consumer of each field in `src` was listed: two fields had none, the CPK colour and the Wikidata item ID. The data lands in the `elementFacts` chunk, which the shell's list view and the scene share without three.

Gzipped sizes of the minified data (level 9):

| Variant                                    | KB  |
| ------------------------------------------ | --- |
| Before (all fields)                        | 9.7 |
| Unused fields dropped                      | 8.8 |
| Also period, group, block (derivable)      | 8.5 |
| Unused dropped, column-wise arrays         | 6.8 |
| Unused dropped, header row plus value rows | 7.5 |

At the slow profile's 200 KB/s, 1 KB is about 5 ms of transfer.

## Decision

- **Drop the CPK colour and the Wikidata item ID** from the schema, the data script and `src/data/elements.json`. The script still uses the item ID to check that each element has one Wikidata item.
- **Keep period, group and block** in the data: 0.3 KB, and the schema and tests check them against the atomic number.
- **Keep one JSON object per element.** A column-wise encoding saves about 2 KB (about 10 ms on the slow profile) but needs decoding code, makes data refreshes harder to review as diffs, and loses the direct `Element` typing.

## Consequences

- The data is about 1 KB smaller gzipped. First move on slow connections barely changes: the remaining bytes are three (about 130 KB) and React Three Fiber (about 50 KB).
- A feature that needs a dropped field adds it back to the schema and the data script, then runs `npm run data`.
