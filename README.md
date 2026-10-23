# obsmin

Obfuscate and minify a mixed-language project for production distribution — browser extensions, desktop app bundles, anywhere you hand out built code — without breaking it.

[![Star on GitHub](https://img.shields.io/github/stars/byApolloWorks/obsmin?style=flat-square&label=Star)](https://github.com/byApolloWorks/obsmin)

`obsmin` doesn't reimplement obfuscation. It's a manager: it finds your project root, classifies the source files, duplicates the project, and calls the right established tool per language with a chosen preset — the same pattern as a yt-dlp wrapper shelling out to ffmpeg.

## What it wraps

| Language | Tool |
|---|---|
| JS / TS / Next.js output | [terser](https://github.com/terser/terser) + [javascript-obfuscator](https://github.com/javascript-obfuscator/javascript-obfuscator) |
| Python | [python-minifier](https://github.com/dflook/python-minifier) (`light`/`medium`) + [PyArmor](https://github.com/dashingsoft/pyarmor) (`heavy`, real bytecode protection) |
| HTML | [html-minifier-terser](https://github.com/terser/html-minifier-terser) |
| CSS | [clean-css](https://github.com/clean-css/clean-css) |

## Install

```bash
npm install -g obsmin
```

External tools (`pyarmor`, `python-minifier`) are invoked as subprocesses and are not bundled — the JS/HTML/CSS tools are fetched on demand via `npx`. Run `obsmin doctor` after installing to check what's present on your machine and get per-OS install hints.

## Usage

### CLI

```bash
# check your environment
obsmin doctor

# list presets
obsmin presets

# process a project
obsmin ./my-project --preset medium
obsmin ./my-project --preset heavy --out ./dist/my-project-obf
```

Output is written to `<project-name>-obs-minified/` next to the project by default — your original source is never touched.

### GUI

```bash
obsmin-gui
```

Opens a local web UI at `http://localhost:4178`. Same core logic as the CLI: pick a project folder, pick a preset, run, watch the live log.

## Presets

| Preset | What it does |
|---|---|
| `light` | Minify only. Safest — won't break reflection, `Function.toString()`, stack traces. |
| `medium` | Minify + identifier renaming + string array encoding. Good default. |
| `heavy` | Full obfuscation: control-flow flattening, string encryption, dead code, self-defending code. Slower, harder to read, more runtime overhead. |

**Always run your test suite (or at least a smoke test) against the output before distributing it**, especially on `heavy`. Control-flow flattening and dead-code injection are the most likely settings to surface edge cases in code that depends on exact stack traces, timing, or introspection.

## Project root detection

`obsmin` walks upward from the path you give it looking for `package.json`, `pyproject.toml`, `requirements.txt`, `setup.py`, `.git`, or a Next.js config file, and treats that directory as the project root.

## What's excluded by default

`node_modules`, `.git`, `dist`, `build`, `.next`, `venv`/`.venv`, `__pycache__`, already-minified files, source maps, `.env*` files, and anything with `test`/`spec` in the path. Add project-specific exclusions via an `.obsminrc` file (see `core/scan.js`).

## Architecture

```
obsmin/
├── core/
│   ├── scan.js        # project root detection + file classification
│   ├── presets.js      # light / medium / heavy tier definitions
│   ├── dispatcher.js   # duplicates the project, shells out to each tool
│   └── doctor.js       # environment checks
├── bin/
│   ├── cli.js           # CLI entry point
│   └── gui.js            # GUI entry point
├── gui-server.js          # local HTTP server + SSE progress stream
└── web/                    # GUI frontend (no framework, no build step)
```

CLI and GUI both call the same `core/dispatcher.js` functions — neither has obfuscation logic of its own.

## License

MIT — see [LICENSE](./LICENSE).
