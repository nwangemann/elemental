# Dependencies

| Package                           | Why                                                                                |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| `react`                           | Interface and, through React Three Fiber, the scene graph                          |
| `react-dom`                       | Renders the interface in the browser                                               |
| `three`                           | 3D rendering (WebGL2)                                                              |
| `@react-three/fiber`              | React renderer for three.js: the scene as components, per-frame work in `useFrame` |
| `troika-three-text`               | SDF text for tile labels, batched into one draw call                               |
| `@fontsource/inter`               | Inter font file for the labels, bundled so text needs no network                   |
| `zod`                             | Element schema: validates the generated data and gives the `Element` type          |
| `@commitlint/cli`                 | Checks commit messages                                                             |
| `@commitlint/config-conventional` | Conventional Commits rules for commitlint                                          |
| `@playwright/test`                | Browser smoke test                                                                 |
| `@types/node`                     | Node types for config files and scripts                                            |
| `@types/three`                    | three.js types                                                                     |
| `@types/react`                    | React types                                                                        |
| `@types/react-dom`                | React DOM types                                                                    |
| `@vitejs/plugin-react`            | React support in Vite                                                              |
| `husky`                           | Git hooks that run the checks                                                      |
| `oxlint`                          | Linter                                                                             |
| `prettier`                        | Formatter                                                                          |
| `typescript`                      | Type checking                                                                      |
| `vite`                            | Dev server and build                                                               |
| `vitest`                          | Unit tests                                                                         |
