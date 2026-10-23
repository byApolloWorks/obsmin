"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { findProjectRoot, classifyFiles } = require("../core/scan");

function makeTempProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "obsmin-test-"));
  fs.writeFileSync(path.join(dir, "package.json"), "{}");
  fs.mkdirSync(path.join(dir, "src"));
  fs.writeFileSync(path.join(dir, "src", "index.js"), "console.log('hi');");
  fs.writeFileSync(path.join(dir, "src", "app.py"), "print('hi')");
  fs.writeFileSync(path.join(dir, "src", "page.html"), "<html></html>");
  fs.writeFileSync(path.join(dir, "src", "style.css"), "body { color: red; }");
  fs.mkdirSync(path.join(dir, "node_modules", "some-dep"), { recursive: true });
  fs.writeFileSync(path.join(dir, "node_modules", "some-dep", "index.js"), "module.exports = {};");
  return dir;
}

test("findProjectRoot finds the directory with package.json", () => {
  const dir = makeTempProject();
  const nested = path.join(dir, "src");
  assert.equal(findProjectRoot(nested), dir);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("classifyFiles groups files by language and excludes node_modules", async () => {
  const dir = makeTempProject();
  const files = await classifyFiles(dir);
  assert.ok(files.js.some((f) => f.endsWith("index.js")));
  assert.ok(files.python.some((f) => f.endsWith("app.py")));
  assert.ok(files.html.some((f) => f.endsWith("page.html")));
  assert.ok(files.css.some((f) => f.endsWith("style.css")));
  assert.ok(!files.js.some((f) => f.includes("node_modules")));
  fs.rmSync(dir, { recursive: true, force: true });
});

test("classifyFiles respects extra excludes from config", async () => {
  const dir = makeTempProject();
  const files = await classifyFiles(dir, ["**/src/app.py"]);
  assert.ok(!files.python.some((f) => f.endsWith("app.py")));
  fs.rmSync(dir, { recursive: true, force: true });
});
