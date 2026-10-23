#!/usr/bin/env node
"use strict";

const { startServer } = require("../gui-server");

const PORT = process.env.OBSMIN_PORT ? Number(process.env.OBSMIN_PORT) : 4178;

startServer(PORT).then((url) => {
  console.log(`obsmin GUI running at ${url}`);
  console.log("Press Ctrl+C to stop.");
});
