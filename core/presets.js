"use strict";

/**
 * Presets control how aggressively each per-language tool is run.
 * "light"  -> minify only (safe for almost anything, including libraries
 *             that rely on reflection, Function.toString(), etc.)
 * "medium" -> minify + identifier renaming
 * "heavy"  -> minify + renaming + control-flow flattening + string
 *             encoding. Slower output, slightly larger, harder to read.
 *             Always re-run your test suite after using this tier.
 */

const PRESETS = {
  light: {
    label: "Light",
    description: "Minify only. Fastest, safest, easiest to debug if something breaks.",
    js: {
      minify: true,
      obfuscate: false
    },
    python: {
      mode: "minify",
      pyminifyArgs: []
    },
    html: {
      minify: true
    },
    css: {
      minify: true
    }
  },
  medium: {
    label: "Medium",
    description: "Minify + rename identifiers. Good default for most production handoffs.",
    js: {
      minify: true,
      obfuscate: true,
      obfuscatorOptions: {
        compact: true,
        controlFlowFlattening: false,
        deadCodeInjection: false,
        stringArray: true,
        stringArrayEncoding: ["base64"],
        rotateStringArray: true,
        identifierNamesGenerator: "mangled",
        renameGlobals: false
      }
    },
    python: {
      mode: "minify",
      pyminifyArgs: ["--rename-globals"]
    },
    html: {
      minify: true
    },
    css: {
      minify: true
    }
  },
  heavy: {
    label: "Heavy",
    description: "Full obfuscation: control-flow flattening, string encryption, dead code. Validate with your test suite before shipping.",
    js: {
      minify: true,
      obfuscate: true,
      obfuscatorOptions: {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.4,
        stringArray: true,
        stringArrayEncoding: ["rc4"],
        rotateStringArray: true,
        selfDefending: true,
        identifierNamesGenerator: "hexadecimal",
        renameGlobals: false
      }
    },
    python: {
      mode: "pyarmor",
      pyarmorExtraArgs: ["--enable-jit"]
    },
    html: {
      minify: true
    },
    css: {
      minify: true
    }
  }
};

function getPreset(name) {
  const preset = PRESETS[name];
  if (!preset) {
    const known = Object.keys(PRESETS).join(", ");
    throw new Error(`Unknown preset "${name}". Known presets: ${known}`);
  }
  return preset;
}

module.exports = { PRESETS, getPreset };
