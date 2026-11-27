# Dependencies

| Package                           | Why                                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `react`                           | Interface and, through React Three Fiber, the scene graph                                                                |
| `react-dom`                       | Renders the interface in the browser                                                                                     |
| `three`                           | 3D rendering (WebGL2)                                                                                                    |
| `@react-three/fiber`              | React renderer for three.js: the scene as components, per-frame work in `useFrame`                                       |
| `@fontsource/inter`               | Inter Bold, rasterised into the label atlas by `npm run atlas` (ADR 13); build-time only, not shipped                    |
| `zustand`                         | App state shared by the scene and the interface (ADR 4); already inside React Three Fiber, so it adds almost nothing     |
| `zod`                             | Element schema: validates the generated data (data script and tests) and gives the `Element` type; not in the app bundle |
| `@commitlint/cli`                 | Checks commit messages                                                                                                   |
| `@commitlint/config-conventional` | Conventional Commits rules for commitlint                                                                                |
| `@axe-core/playwright`            | Accessibility audit (axe) in the Playwright tests                                                                        |
| `@playwright/test`                | Browser smoke test                                                                                                       |
| `@types/node`                     | Node types for config files and scripts                                                                                  |
| `@types/three`                    | three.js types                                                                                                           |
| `@types/react`                    | React types                                                                                                              |
| `@types/react-dom`                | React DOM types                                                                                                          |
| `@vitejs/plugin-react`            | React support in Vite                                                                                                    |
| `leva`                            | Dev-only tuning panel (`?tune`) over `CONFIG`; kept out of the production build                                          |
| `husky`                           | Git hooks that run the checks                                                                                            |
| `oxlint`                          | Linter                                                                                                                   |
| `prettier`                        | Formatter                                                                                                                |
| `typescript`                      | Type checking                                                                                                            |
| `vite`                            | Dev server and build                                                                                                     |
| `vitest`                          | Unit tests                                                                                                               |
