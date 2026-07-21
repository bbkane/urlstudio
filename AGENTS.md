# AGENTS.md

## Purpose

Guidance for coding agents working in this repository.

## Project Snapshot

- URL Studio is a static browser app for editing URLs and preserving editor state in the app URL.
- Runtime stack: plain HTML/CSS/JS (ESM), no build step, no runtime dependencies.
- Local server: `npm run serve` (Node HTTP static server).

## Source of Truth

- Prefer live code and tests over historical prompt docs when they differ.
- Historical design context lives in [prompts/001-create.md](prompts/001-create.md).
- Current behavior is implemented in:
  - [lib.js](lib.js) (pure logic and app-state serialization)
  - [index.js](index.js) (DOM wiring, rendering, user interactions)
  - [lib.test.js](lib.test.js) (behavioral expectations)

## Commands

- Install deps: `npm install`
- Run tests: `npm run test`
- Format: `npm run fmt`
- Start local server: `npm run start` (default `http://localhost:4173`)

## Architecture Conventions

- Keep computation in [lib.js](lib.js) and UI/DOM side effects in [index.js](index.js).
- Preserve JSDoc typing style in [lib.js](lib.js); new exported logic should be typed and testable.
- Add/adjust tests in [lib.test.js](lib.test.js) when changing behavior in [lib.js](lib.js).

## Behavioral Invariants

- App URL uses explicit query params (not compact encoding).
- `t` (title) must serialize first when present.
- Query row insertion order is significant and must be preserved.
- Blank query key/value pairs are kept unless user removes the row.
- Editable path should be normalized to a leading slash.
- Default empty state includes one blank editable row.

## Editing Tips

- When asserting rows in tests, compare `[key, value]` pairs; row `id` values are generated and non-deterministic.
- If you change URL state serialization/parsing, update both:
  - `serializeAppStateToQuery` / `parseAppStateFromSearch`
  - any expectations in [lib.test.js](lib.test.js)

## Reference Docs

- Setup and quick dev commands: [README.md](README.md)
- Original planning notes and UX intent: [prompts/001-create.md](prompts/001-create.md)