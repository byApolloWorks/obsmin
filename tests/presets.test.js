"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { getPreset, PRESETS } = require("../core/presets");

test("all three tiers exist", () => {
  assert.deepEqual(Object.keys(PRESETS).sort(), ["heavy", "light", "medium"]);
});

test("light preset minifies but does not obfuscate JS", () => {
  const preset = getPreset("light");
  assert.equal(preset.js.minify, true);
  assert.equal(preset.js.obfuscate, false);
});

test("medium and heavy presets obfuscate JS", () => {
  assert.equal(getPreset("medium").js.obfuscate, true);
  assert.equal(getPreset("heavy").js.obfuscate, true);
});

test("heavy preset enables control flow flattening, medium does not", () => {
  assert.equal(getPreset("heavy").js.obfuscatorOptions.controlFlowFlattening, true);
  assert.equal(getPreset("medium").js.obfuscatorOptions.controlFlowFlattening, false);
});

test("unknown preset name throws a descriptive error", () => {
  assert.throws(() => getPreset("ultra"), /Unknown preset "ultra"/);
});
