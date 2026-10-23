#!/usr/bin/env node
"use strict";

const path = require("path");
const { Command } = require("commander");
const { obfuscateProject } = require("../core/dispatcher");
const { runDoctor } = require("../core/doctor");
const { PRESETS } = require("../core/presets");
const { writeDefaultConfig, CONFIG_FILENAME } = require("../core/config");
const { findProjectRoot } = require("../core/scan");

const program = new Command();

program
  .name("obsmin")
  .description("Obfuscate and minify a project for production distribution, without breaking it.")
  .version("0.1.0");

program
  .command("doctor")
  .description("Check that all external tools obsmin depends on are installed")
  .action(() => {
    const report = runDoctor();
    console.log("obsmin doctor\n");
    for (const r of report.results) {
      const mark = r.ok ? "[ok]" : r.required ? "[missing]" : "[optional, missing]";
      console.log(`${mark.padEnd(20)} ${r.name}${r.ok ? " - " + r.output.split("\n")[0] : ""}`);
    }
    if (report.platformHint) {
      console.log(`\nNote: ${report.platformHint}`);
    }
    if (!report.ok) {
      console.log("\nMissing required tools:");
      for (const r of report.missingRequired) {
        console.log(`  - ${r.name}`);
      }
      process.exitCode = 1;
    } else if (report.missingOptional.length) {
      console.log("\nOptional tools not found (needed for some presets):");
      for (const r of report.missingOptional) {
        console.log(`  - ${r.name}${r.installHint ? ` (install: ${r.installHint})` : ""}`);
      }
    } else {
      console.log("\nAll checks passed.");
    }
  });

program
  .command("presets")
  .description("List available obfuscation/minification presets")
  .action(() => {
    for (const [key, p] of Object.entries(PRESETS)) {
      console.log(`${key.padEnd(8)} ${p.label} - ${p.description}`);
    }
  });

program
  .command("init")
  .description(`Write a default ${CONFIG_FILENAME} into the current (or given) project root`)
  .argument("[project]", "Path to the project", ".")
  .action((projectArg) => {
    const root = findProjectRoot(path.resolve(projectArg || "."));
    try {
      const configPath = writeDefaultConfig(root);
      console.log(`Wrote ${configPath}`);
    } catch (err) {
      console.error(err.message);
      process.exitCode = 1;
    }
  });

program
  .argument("[project]", "Path to the project to process", ".")
  .option("-p, --preset <name>", "Obfuscation preset: light, medium, heavy (overrides .obsminrc.json)")
  .option("-o, --out <dir>", "Output directory (default: <project-name>-obs-minified next to the project)")
  .action(async (projectArg, opts) => {
    const projectPath = path.resolve(projectArg || ".");
    try {
      const result = await obfuscateProject({
        projectPath,
        presetName: opts.preset,
        outDir: opts.out ? path.resolve(opts.out) : undefined,
        onProgress: (event) => {
          if (event.status === "start" && event.file) {
            process.stdout.write(`  ${event.stage.padEnd(8)} ${event.file} ... `);
          } else if (event.status === "done" && event.file) {
            console.log("ok");
          } else if (event.status === "error" && event.file) {
            console.log(`FAILED: ${event.message}`);
          } else if (event.message) {
            console.log(`[${event.stage}] ${event.message}`);
          }
        }
      });
      console.log(`\nDone. Preset: ${result.preset}`);
      console.log(`Output: ${result.target}`);
      console.log("\nRun your test suite against the output before distributing it.");
    } catch (err) {
      console.error(`obsmin failed: ${err.message}`);
      process.exitCode = 1;
    }
  });

program.parse(process.argv);
