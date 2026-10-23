"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { loadConfig, writeDefaultConfig, CONFIG_FILENAME } = require("../core/config");

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "obsmin-config-test-"));
}

test("loadConfig returns defaults when no file exists", () => {
  const dir = tempDir();
  const config = loadConfig(dir);
  assert.equal(config.preset, "medium");
  assert.deepEqual(config.exclude, []);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("loadConfig merges a present .obsminrc.json over the defaults", () => {
  const dir = tempDir();
  fs.writeFileSync(
    path.join(dir, CONFIG_FILENAME),
    JSON.stringify({ preset: "heavy", exclude: ["**/legacy/**"] })
  );
  const config = loadConfig(dir);
  assert.equal(config.preset, "heavy");
  assert.deepEqual(config.exclude, ["**/legacy/**"]);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("loadConfig throws a descriptive error on invalid JSON", () => {
  const dir = tempDir();
  fs.writeFileSync(path.join(dir, CONFIG_FILENAME), "{ not valid json");
  assert.throws(() => loadConfig(dir), /not valid JSON/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("writeDefaultConfig refuses to overwrite an existing file", () => {
  const dir = tempDir();
  writeDefaultConfig(dir);
  assert.throws(() => writeDefaultConfig(dir), /already exists/);
  fs.rmSync(dir, { recursive: true, force: true });
});
