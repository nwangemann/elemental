# elemental

@AGENTS.md

- Any change to `src/core`, features, dependencies or standards updates the matching doc in the same change.
- Significant decisions get an ADR in `docs/adr`.
- Run `npm run check` before declaring work done. For anything that draws, also look at it in the preview and check frame time.

## Session routine

1. Read `dev/plan.md`: its "Next" line is the project state. `dev/` holds process notes; it is git-ignored, and committed files never link to it.
2. Load the `elemental-dev` skill before running anything.
3. Do one step (one checkbox). Touch only what that step needs.
4. Run `npm run check`, commit, tick the step, update "Next" in the plan, and stop.

New ideas go in the plan, not in the current step. Manual checks (what only a person or a real device can judge) go in the plan's last section and never block other work.
