# Contributing to obsmin

## Setup

```bash
git clone https://github.com/byApolloWorks/obsmin.git
cd obsmin
npm install
```

## Running the test suite

```bash
npm test
```

## Running locally without installing globally

```bash
node bin/cli.js ./examples/sample-project --preset light
node bin/gui.js
```

## Project philosophy

`obsmin` is a manager, not a reimplementation. It should never contain its own obfuscation or minification logic — that belongs in `terser`, `javascript-obfuscator`, `pyarmor`, `html-minifier-terser`, and `clean-css`. If you're adding support for a new language or tool, add a new case to `core/dispatcher.js` that shells out to an established tool, following the existing pattern (`run(cmd, args, cwd)`), rather than writing a parser or transformer from scratch.

CLI (`bin/cli.js`) and GUI (`gui-server.js` + `web/`) must both stay thin wrappers around `core/`. If a feature needs logic, it goes in `core/`, not in either entry point.

## Adding a preset

Presets live in `core/presets.js`. Keep the three-tier shape (`light` / `medium` / `heavy`) rather than adding new top-level tiers, unless there's a concrete use case a tier can't already cover — more tiers add confusion more than value.

## Pull requests

- Add or update a test in `tests/` for any behavior change in `core/`.
- Run `npm test` before opening a PR.
- Keep the CLI and GUI in sync — a new option in one usually belongs in the other.
