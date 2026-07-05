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
| `npm run dev:mobile` | Start dev server with HTTPS tunnel for phone testing |
| `npm test` | Run unit tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run build` | Typecheck and produce static `dist/` |
| `npm run preview` | Serve production build locally |

## Project layout

```
src/
  main.ts          Entry point and bootstrap
  audio/           Web Audio pipeline (graph, engine)
  types/           Config and shared types
  ui/              DOM and controls
tests/
  helpers/         Shared mocks (e.g. AudioContext)
  *.test.ts        Unit tests
```

Pure logic (config validation) lives in testable modules. Browser APIs are mocked in unit tests.

## Test-driven workflow

1. Create a branch from `main` (see [CONTRIBUTING.md](../CONTRIBUTING.md))
2. Write a failing test in `tests/`
3. Run `npm test` and confirm it fails (red)
4. Implement the minimum code in `src/`
5. Run `npm test` and confirm it passes (green)
6. Refactor if needed; keep tests green
7. Open a PR with the template checklist

## Testing on mobile

Phones require **HTTPS** for microphone access. A plain `http://192.168.x.x` URL on your LAN will load the page but block the mic.

### Production (no local server)

The deployed app is always available at [https://cosmo-os.github.io/echo-chamber/](https://cosmo-os.github.io/echo-chamber/). Open that URL on your phone to test the current `main` branch — no Mac or tunnel needed.

Deployments use the **Deploy Pages** GitHub Actions workflow. To verify a production build locally before merge:

```bash
npm run build:pages
npm run preview:pages
```

Then open the printed URL (paths use the `/echo-chamber/` base, matching Pages).

### Local changes (`dev:mobile`)

Use this when iterating on unmerged code.

#### One-time setup

Install [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) (the tunnel used by `dev:mobile`):

```bash
brew install cloudflared
```

### Run

```bash
npm run dev:mobile
```

This script:

1. Starts the Vite dev server on all interfaces (`--host`)
2. Opens a temporary HTTPS tunnel via cloudflared
3. Prints a **Ready!** URL like `https://something.trycloudflare.com`

Open that URL on your phone (same Wi‑Fi is fine; traffic goes through the tunnel). Keep your Mac awake and the terminal running while you test.

### On your phone

1. Open the printed `https://…trycloudflare.com` URL in Safari (iOS) or Chrome (Android)
2. Tap **Start** — microphone permission must come from a direct tap (especially on iOS)
3. Allow microphone access when prompted
4. Confirm echo is audible at the configured delay
5. Tap **Stop** and confirm the mic is released

The tunnel URL changes each time you restart `dev:mobile`. For testing merged code, use the [production URL](https://cosmo-os.github.io/echo-chamber/) instead.

### Troubleshooting

| Issue | Fix |
|-------|-----|
| `cloudflared not found` | Run `brew install cloudflared` |
| `Blocked request. This host … is not allowed` | Use `npm run dev:mobile` (not `npm run dev`); it sets `MOBILE_DEV=1` so Vite allows tunnel hostnames |
| No mic prompt | URL must be `https://`, not `http://192.168…` |
| iOS: no audio after Start | Tap Start directly; iOS blocks autoplay without a user gesture |

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