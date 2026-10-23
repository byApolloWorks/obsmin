"use strict";

const fs = require("fs");
const path = require("path");

const CONFIG_FILENAME = ".obsminrc.json";

const DEFAULT_CONFIG = {
  preset: "medium",
  exclude: [],
  entry: {
    js: [],
    python: [],
    html: [],
    css: []
  },
  outDir: null
};

/**
 * Load <root>/.obsminrc.json if present and merge it over the defaults.
 * Returns DEFAULT_CONFIG untouched (a fresh copy) when no file exists.
 * Throws a descriptive error if the file exists but isn't valid JSON,
 * rather than silently falling back - a bad config should be loud.
 */
function loadConfig(root) {
  const configPath = path.join(root, CONFIG_FILENAME);
  const config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

  if (!fs.existsSync(configPath)) {
    return config;
  }

  let raw;
  try {
    raw = fs.readFileSync(configPath, "utf8");
  } catch (err) {
    throw new Error(`Could not read ${CONFIG_FILENAME}: ${err.message}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`${CONFIG_FILENAME} is not valid JSON: ${err.message}`);
  }

  if (parsed.preset) config.preset = parsed.preset;
  if (Array.isArray(parsed.exclude)) config.exclude = parsed.exclude;
  if (parsed.entry && typeof parsed.entry === "object") {
    config.entry = { ...config.entry, ...parsed.entry };
  }
  if (parsed.outDir) config.outDir = parsed.outDir;

  return config;
}

function writeDefaultConfig(root) {
  const configPath = path.join(root, CONFIG_FILENAME);
  if (fs.existsSync(configPath)) {
    throw new Error(`${CONFIG_FILENAME} already exists at ${configPath}`);
  }
  const content = JSON.stringify(
    {
      preset: "medium",
      exclude: [],
      entry: { js: [], python: [], html: [], css: [] },
      outDir: null
    },
    null,
    2
  );
  fs.writeFileSync(configPath, content + "\n", "utf8");
  return configPath;
}

module.exports = { loadConfig, writeDefaultConfig, CONFIG_FILENAME, DEFAULT_CONFIG };
