# How elemental is built with an AI agent

elemental is written by an AI coding agent (Claude Code), steered by a person.

- [`CLAUDE.md`](../CLAUDE.md) and [`AGENTS.md`](../AGENTS.md) hold the house rules: where code goes, what must stay pure, and that `npm run check` passes before work is called done.
- [The `elemental-dev` skill](../.claude/skills/elemental-dev/SKILL.md) says how to run, check and preview the app.
- [Architecture decision records](adr/) keep decisions, so a later session reads them instead of re-deciding.
- The roadmap is a list of session-sized steps kept as working notes outside the repository. Each session does one step, runs the checks, commits and stops.
- The pre-commit hook runs `npm run check`, so a commit that fails the checks does not land.

The agent checks its own work with unit tests, the Playwright smoke test and its own browser preview (frame time included). What only a person can judge, such as how walking feels on a real phone, is listed separately and done last.
