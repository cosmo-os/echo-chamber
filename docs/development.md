# Development

## Prerequisites

- Node.js 22 or later
- A modern browser with microphone support
- `localhost` or HTTPS for microphone access (browser requirement)

## Commands

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm run dev` | Start Vite dev server |
| `npm test` | Run unit tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run build` | Typecheck and produce static `dist/` |
| `npm run preview` | Serve production build locally |

## Project layout

```
src/
  main.ts          Entry point and bootstrap
  audio/           Web Audio pipeline (upcoming)
  types/           Config and shared types (upcoming)
  ui/              DOM and controls (upcoming)
tests/
  helpers/         Shared mocks (e.g. AudioContext)
  *.test.ts        Unit tests
```

Pure logic (RMS computation, config validation) lives in testable modules. Browser APIs are mocked in unit tests.

## Test-driven workflow

1. Create a branch from `main` (see [CONTRIBUTING.md](../CONTRIBUTING.md))
2. Write a failing test in `tests/`
3. Run `npm test` and confirm it fails (red)
4. Implement the minimum code in `src/`
5. Run `npm test` and confirm it passes (green)
6. Refactor if needed; keep tests green
7. Open a PR with the template checklist

## Manual microphone checklist

Copy this into PR descriptions when audio behavior changes:

- [ ] `npm run dev` loads without console errors
- [ ] Clicking Start prompts for microphone permission
- [ ] After granting permission, echo is audible at the configured delay
- [ ] Stop ends playback and releases the microphone
- [ ] Denied permission shows a clear error message
- [ ] (Mobile Safari) Start works after a direct tap — no autoplay without gesture

## Mocking browser audio APIs

Unit tests should not require a real microphone. When adding audio modules:

- Inject `getUserMedia` and `AudioContext` factories (do not call globals directly in orchestration code)
- Use shared mocks from `tests/helpers/` once added
- Assert graph topology (node connections) and config values, not audible output

## AudioWorklet

The MVP uses `DelayNode` for fixed-delay echo. `AudioWorklet` is a future optimization for lower-latency processing and is not required for the initial scaffold.