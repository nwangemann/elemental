# 4. App state in a zustand store

- Status: accepted
- Date: 2026-11-26

## Context

The scene and the DOM interface need to share state: the tile the character stands on now, and soon the selected element, the explorer's query and the settings. The scene runs every frame and must not push per-frame values through React; the interface must re-render when something it shows changes.

## Decision

- **One zustand store, `src/state/store.ts` (`useAppStore`).** Components read slices with a selector and re-render only when their slice changes. Code outside React (frame callbacks) reads with `getState()` and writes with the store's actions.
- **The scene writes on events, not frames.** Per-frame values (activation levels, positions) stay in plain objects owned by `Scene` and mutated in `useFrame`. The store holds what the interface needs and changes only on discrete events, such as entering or leaving a tile.
- **The store holds display-ready values** (the active tile's number and name), so the DOM shell does not import the element data, which lives in the lazily loaded scene chunk (ADR 3).

Alternatives: React context (every consumer re-renders on any change, and frame code cannot read it outside React) and jotai (atoms suit many independent values; this app has one small shared object). zustand is already a dependency of React Three Fiber, so it adds almost nothing to the bundle.

## Consequences

- Subscribers can react to enter and leave events with `useAppStore.subscribe` without being components.
- When the element panel needs more than a name, it either reads from a data chunk of its own or receives what it needs through the store; the shell stays free of three and the dataset.
