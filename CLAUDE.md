# elemental

@AGENTS.md

- Any change to `src/core`, features, dependencies or standards updates the matching doc in the same change.
- Significant decisions get an ADR in `docs/adr`.
- Run `npm run check` before declaring work done. For anything that draws, also look at it in the preview and check frame time.

## Session routine

1. If `dev/handoff.md` exists, read it first (the `handoff` skill says how to resume). Then read `dev/plan.md`: its "Next" line is the project state. `dev/` holds process notes; it is git-ignored, and committed files never link to it.
2. Load the `elemental-dev` skill before running anything.
3. Work through the steps in order, one checkbox at a time. Touch only what each step needs.
4. After each step: run `npm run check`, commit, tick the step, update "Next" in the plan, then go on to the next step. Around 50% of the context window, tell the person and offer a handoff (see the workspace guidance on context windows).

New ideas go in the plan, not in the current step. Manual checks (what only a person or a real device can judge) go in the plan's last section and never block other work.
