#!/usr/bin/env node

// Suppress experimental ESM warnings for ESM-only dependencies
process.removeAllListeners("warning");
process.on("warning", (warning) => {
  if (warning.name !== "ExperimentalWarning") {
    console.warn(warning);
  }
});

require("../dist/cli.js");
