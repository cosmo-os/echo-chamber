# Contributing

Thank you for contributing to Echo Chamber. This project uses test-driven development and small, focused pull requests.

## Branch naming

Use a prefix and short kebab-case slug:

- `feat/` — new behavior (e.g. `feat/level-detector`)
- `fix/` — bug fixes
- `chore/` — tooling, CI, dependencies
- `docs/` — documentation only

Branch from the latest `main`.

## Commit messages

Write imperative subject lines:

- **Good:** `Add Vitest smoke test`, `Document manual mic checklist`
- **Avoid:** `Added tests`, `WIP`, `fix stuff`

When using red-green TDD, the commit body can note the phase:

```
Add failing tests for RMS computation

Red: levelDetector returns undefined until implemented.
```

## Test-driven development

Every feature follows red-green-refactor:

1. **Red** — write a failing test that describes the desired behavior
2. **Green** — implement the minimum code to make the test pass
3. **Refactor** — clean up without changing behavior; tests must stay green

Run tests locally before pushing:

```bash
npm test
```

Use watch mode while developing:

```bash
npm run test:watch
```

Do not add production logic without a corresponding test, except for thin UI wiring that is covered by a higher-level test.

## Pull requests

- **One concern per PR** — keep changes reviewable and easy to revert
- **CI must pass** — `npm test` and `npm run build`
- **Include a test plan** — use the PR template checklist
- **Audio/UI changes** — note manual mic testing in the PR description (see [docs/development.md](docs/development.md))

## Merge policy

- Squash merge into `main`
- Delete the branch after merge
- Ensure the squashed commit title is clear and imperative

## Getting started

See [docs/development.md](docs/development.md) for local setup, architecture notes, and manual testing.