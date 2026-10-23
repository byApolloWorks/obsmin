"use strict";

const { spawnSync } = require("child_process");
const os = require("os");

const CHECKS = [
  { name: "Node.js", cmd: "node", args: ["--version"], required: true },
  { name: "npm", cmd: "npm", args: ["--version"], required: true },
  { name: "Python 3", cmd: process.platform === "win32" ? "python" : "python3", args: ["--version"], required: true },
  { name: "pip", cmd: process.platform === "win32" ? "pip" : "pip3", args: ["--version"], required: true },
  { name: "pyarmor", cmd: "pyarmor", args: ["--version"], required: false, installHint: "pip install pyarmor" },
  { name: "pyminify", cmd: "pyminify", args: ["--help"], required: false, installHint: "pip install python-minifier" }
];

function checkOne(check) {
  try {
    const result = spawnSync(check.cmd, check.args, { shell: process.platform === "win32" });
    const ok = result.status === 0;
    return { ...check, ok, output: (result.stdout || result.stderr || "").toString().trim() };
  } catch (err) {
    return { ...check, ok: false, output: err.message };
  }
}

function platformHint() {
  const platform = os.platform();
  if (platform === "linux") {
    return "Linux: if a GUI file dialog is ever added, remember tkinter-based tooling needs `python3-tk` from your package manager (apt/dnf/pacman) separately from pip.";
  }
  if (platform === "darwin") {
    return "macOS: prefer Python from python.org or Homebrew over the system Python to avoid permission issues with pip installs.";
  }
  if (platform === "win32") {
    return "Windows: make sure Python and its Scripts folder are on PATH, and enable long path support if you hit path-length errors on deep node_modules trees.";
  }
  return null;
}

function runDoctor() {
  const results = CHECKS.map(checkOne);
  const missingRequired = results.filter((r) => r.required && !r.ok);
  const missingOptional = results.filter((r) => !r.required && !r.ok);
  return {
    results,
    ok: missingRequired.length === 0,
    missingRequired,
    missingOptional,
    platformHint: platformHint()
  };
}

module.exports = { runDoctor, CHECKS };
