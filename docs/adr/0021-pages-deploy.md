# 21. Deploying releases to GitHub Pages

- Status: accepted
- Date: 2026-11-26

## Context

The app is a static build (Vite, no server, no runtime API calls; element and compound data ship in the bundle), and the repository is public on GitHub. It needs a public URL so people can try it without cloning. `main` carries features in progress between releases (combine mode was reachable but unfinished for several steps), so what goes live should be a release, not every push.

## Options

- **GitHub Pages from a workflow.** Free for a public repository, same account as the code, no extra secrets. Serves under `/<repo>/`, so the build needs a base path. No custom headers.
- **A third-party static host (Netlify, Cloudflare Pages, Vercel).** Preview deploys and custom headers, but another account, another integration and its own terms.
- **Deploy every push to `main`.** Always fresh, but publishes half-built features.

## Decision

GitHub Pages, deployed by `.github/workflows/deploy.yml`:

- Pushing a `v*` tag builds that tag and deploys it. A manual run (`workflow_dispatch`) deploys the ref it is given, or the latest `v*` tag when empty, which covers redeploying and the first deploy of a tag made before the workflow existed.
- The build runs `npm run build -- --base "/<repo>/"`. The base is set only there, so local dev, `vite preview` and the browser tests keep `/`.
- Deep links are hash-based (`#/Au?lens=density`, ADR 0007), so Pages needs no 404 fallback for routes.
- The Pages source is "GitHub Actions" (set once in the repository settings).

## Consequences

- The live site is the latest release: https://nwangemann.github.io/elemental/. Work on `main` goes live only when a tag is pushed.
- A release is: update `CHANGELOG.md`, tag `vX.Y.Z`, push the tag.
- Any new absolute URL in the app must go through Vite (imports, `import.meta.env.BASE_URL`), or it breaks under `/elemental/`.
- Pages sets its own cache headers (short `max-age`); Vite's hashed file names keep updates safe.
