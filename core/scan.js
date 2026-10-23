"use strict";

const fs = require("fs");
const path = require("path");
const fg = require("fast-glob");

const ROOT_MARKERS = [
  "package.json",
  "pyproject.toml",
  "requirements.txt",
  "setup.py",
  ".git",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts"
];

const DEFAULT_EXCLUDES = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  "**/venv/**",
  "**/.venv/**",
  "**/__pycache__/**",
  "**/*.min.js",
  "**/*.min.css",
  "**/.env",
  "**/.env.*",
  "**/*.map",
  "**/*test*/**",
  "**/*spec*/**"
];

const LANGUAGE_GLOBS = {
  js: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx", "**/*.mjs", "**/*.cjs"],
  python: ["**/*.py"],
  html: ["**/*.html", "**/*.htm"],
  css: ["**/*.css"]
};

/**
 * Walk upward from startDir looking for a recognizable project root marker.
 * Falls back to startDir itself if nothing is found.
 */
function findProjectRoot(startDir) {
  let dir = path.resolve(startDir);
  const { root } = path.parse(dir);

  while (true) {
    const hasMarker = ROOT_MARKERS.some((marker) =>
      fs.existsSync(path.join(dir, marker))
    );
    if (hasMarker) return dir;
    if (dir === root) return path.resolve(startDir);
    dir = path.dirname(dir);
  }
}

/**
 * Classify every source file under projectRoot by language.
 * extraExcludes lets a project's .obsminrc add its own ignore patterns.
 */
async function classifyFiles(projectRoot, extraExcludes = []) {
  const ignore = [...DEFAULT_EXCLUDES, ...extraExcludes];
  const result = {};

  for (const [lang, globs] of Object.entries(LANGUAGE_GLOBS)) {
    result[lang] = await fg(globs, {
      cwd: projectRoot,
      ignore,
      dot: false,
      onlyFiles: true,
      absolute: false
    });
  }

  return result;
}

module.exports = {
  findProjectRoot,
  classifyFiles,
  DEFAULT_EXCLUDES,
  LANGUAGE_GLOBS
};
