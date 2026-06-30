#!/usr/bin/env node
// Backward-compatibility shim. The CLI was renamed genpics → fattly; this keeps
// any existing path-based registration (e.g. an MCP config pointing at
// bin/genpics.js) working. Prefer `fattly` going forward.
require("./fattly.js");
