"use strict";

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { findProjectRoot, classifyFiles } = require("./scan");
const { getPreset } = require("./presets");
const { loadConfig } = require("./config");

/**
 * Run an external CLI tool and resolve/reject based on its exit code.
 * Never throws synchronously; always returns a promise.
 */
function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, shell: process.platform === "win32" });
    let stderr = "";
    child.stderr?.on("data", (d) => (stderr += d.toString()));
    child.on("error", (err) => reject(new Error(`${cmd} failed to start: ${err.message}`)));
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}\n${stderr}`));
    });
  });
}

function copyDir(src, dest, ignoreDirs = ["node_modules", ".git", "dist", "build", ".next", "venv", ".venv", "__pycache__"]) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (ignoreDirs.includes(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, ignoreDirs);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * obfuscateProject walks projectPath, duplicates it, and runs the
 * per-language pipeline over the copy according to the chosen preset.
 *
 * onProgress(event) is called with { stage, file, status, message }
 * so both the CLI and the GUI can render the same stream.
 */
async function obfuscateProject({ projectPath, presetName, outDir, onProgress = () => {} }) {
  const root = findProjectRoot(projectPath);
  const config = loadConfig(root);
  const resolvedPresetName = presetName || config.preset || "medium";
  const preset = getPreset(resolvedPresetName);
  const projectName = path.basename(root);
  const target = outDir || config.outDir || path.join(path.dirname(root), `${projectName}-obs-minified`);

  if (fs.existsSync(path.join(root, ".obsminrc.json"))) {
    onProgress({ stage: "config", status: "done", message: "Loaded .obsminrc.json" });
  }

  onProgress({ stage: "scan", status: "start", message: `Scanning ${root}` });
  const files = await classifyFiles(root, config.exclude);
  onProgress({
    stage: "scan",
    status: "done",
    message: `Found ${files.js.length} JS/TS, ${files.python.length} Python, ${files.html.length} HTML, ${files.css.length} CSS files`
  });

  onProgress({ stage: "copy", status: "start", message: `Duplicating project to ${target}` });
  copyDir(root, target);
  onProgress({ stage: "copy", status: "done", message: "Duplicate complete" });

  // JS / TS
  for (const file of files.js) {
    const abs = path.join(target, file);
    onProgress({ stage: "js", file, status: "start" });
    try {
      if (preset.js.minify) {
        await run("npx", ["--yes", "terser", abs, "--compress", "--mangle", "-o", abs], target);
      }
      if (preset.js.obfuscate) {
        await run(
          "npx",
          [
            "--yes",
            "javascript-obfuscator",
            abs,
            "--output",
            abs,
            "--compact",
            String(preset.js.obfuscatorOptions.compact),
            "--control-flow-flattening",
            String(preset.js.obfuscatorOptions.controlFlowFlattening),
            "--dead-code-injection",
            String(preset.js.obfuscatorOptions.deadCodeInjection),
            "--string-array",
            String(preset.js.obfuscatorOptions.stringArray),
            "--identifier-names-generator",
            preset.js.obfuscatorOptions.identifierNamesGenerator
          ],
          target
        );
      }
      onProgress({ stage: "js", file, status: "done" });
    } catch (err) {
      onProgress({ stage: "js", file, status: "error", message: err.message });
    }
  }

  // Python
  if (files.python.length) {
    onProgress({ stage: "python", status: "start", message: `Processing ${files.python.length} file(s)` });
    try {
      if (preset.python.mode === "minify") {
        // python-minifier (the `pyminify` CLI) strips comments/docstrings/
        // whitespace and, with --rename-globals, renames locals and globals.
        // This is the Python equivalent of what terser does for JS - it
        // does NOT encrypt or protect the source the way pyarmor does.
        for (const file of files.python) {
          const abs = path.join(target, file);
          await run("pyminify", [...(preset.python.pyminifyArgs || []), "--in-place", abs], target);
        }
      } else if (preset.python.mode === "pyarmor") {
        // pyarmor compiles to protected bytecode rather than editing the
        // .py files in place - output lands in dist_obf/ alongside them.
        const args = ["gen", "-O", "dist_obf", ...(preset.python.pyarmorExtraArgs || []), ...files.python];
        await run("pyarmor", args, target);
      }
      onProgress({ stage: "python", status: "done" });
    } catch (err) {
      onProgress({ stage: "python", status: "error", message: err.message });
    }
  }

  // HTML
  for (const file of files.html) {
    const abs = path.join(target, file);
    onProgress({ stage: "html", file, status: "start" });
    try {
      await run(
        "npx",
        ["--yes", "html-minifier-terser", "--collapse-whitespace", "--remove-comments", "--minify-js", "true", "--minify-css", "true", "-o", abs, abs],
        target
      );
      onProgress({ stage: "html", file, status: "done" });
    } catch (err) {
      onProgress({ stage: "html", file, status: "error", message: err.message });
    }
  }

  // CSS
  for (const file of files.css) {
    const abs = path.join(target, file);
    onProgress({ stage: "css", file, status: "start" });
    try {
      await run("npx", ["--yes", "clean-css-cli", "-o", abs, abs], target);
      onProgress({ stage: "css", file, status: "done" });
    } catch (err) {
      onProgress({ stage: "css", file, status: "error", message: err.message });
    }
  }

  onProgress({ stage: "complete", status: "done", message: `Output written to ${target}` });
  return { root, target, files, preset: resolvedPresetName };
}

module.exports = { obfuscateProject, run, copyDir };
