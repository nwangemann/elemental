# Architecture decision records

Each record states one decision, why it was made and what it costs. Later changes are added as dated amendments inside the record they change, so a record reads as its own history. All are accepted.

| ADR                                  | Decision                                                                                                                      |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| [1](0001-tooling.md)                 | Tooling.                                                                                                                      |
| [2](0002-scene-rendering.md)         | Scene rendering. Its label part is superseded by ADR 13.                                                                      |
| [3](0003-bundle-budget.md)           | Bundle budget and a lazily loaded scene.                                                                                      |
| [4](0004-app-state.md)               | App state in a zustand store.                                                                                                 |
| [5](0005-element-panel-data.md)      | Element data in a shared chunk for the panel.                                                                                 |
| [6](0006-family-themes.md)           | Family themes as data, drawn per instance in one material.                                                                    |
| [7](0007-explorer-and-deep-links.md) | Explorer search, fly-to and deep links.                                                                                       |
| [8](0008-keyboard-access.md)         | Keyboard access to the scene.                                                                                                 |
| [9](0009-walkable-model.md)          | Walkable model: tiles on open ground.                                                                                         |
| [10](0010-performance-pass.md)       | Performance pass: adaptive resolution, worker-built labels and a perf script. Its label part is superseded by ADR 13.         |
| [11](0011-lenses.md)                 | Lenses: one normalised level per tile, drawn as instance attributes.                                                          |
| [12](0012-three-catalogue.md)        | A curated `three` namespace for React Three Fiber.                                                                            |
| [13](0013-label-atlas.md)            | Tile labels from a baked SDF atlas.                                                                                           |
| [14](0014-climbing-a-landscape.md)   | Climbing a height lens landscape.                                                                                             |
| [15](0015-no-preload-hints.md)       | No preload hints for the scene.                                                                                               |
| [16](0016-idle-frame-pacing.md)      | Idle frame pacing.                                                                                                            |
| [17](0017-data-trim.md)              | Ship only the element fields the app reads, as plain JSON. Its one-object-per-element part is reversed by an ADR 3 amendment. |
| [18](0018-temperature-lens.md)       | Temperature lens: phase from melting and boiling points at 1 atm.                                                             |
| [19](0019-discovery-timeline.md)     | Discovery timeline: what "discovered" means, isolation-year overrides and the year scale.                                     |
| [20](0020-combine-mode.md)           | Combine mode: curated compounds, carried atoms and a lazy chunk.                                                              |
| [21](0021-pages-deploy.md)           | Deploying releases to GitHub Pages.                                                                                           |
