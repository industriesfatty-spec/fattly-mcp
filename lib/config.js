// CLI config stored locally in the user's home directory:
//   ~/.fattly/config.json  → { apiKey, apiUrl }
// The file gets 0600 permissions (owner only) because it holds an API key.

const fs = require("fs");
const os = require("os");
const path = require("path");

const DIR = path.join(os.homedir(), ".fattly");
const FILE = path.join(DIR, "config.json");
// Legacy location (pre-rebrand) — read as a fallback so existing logins keep working.
const LEGACY_FILE = path.join(os.homedir(), ".genpics", "config.json");

// Default API address. Override with `fattly login --url ...` or the
// FATTLY_API_URL environment variable (GENPICS_API_URL kept as a fallback).
const DEFAULT_URL =
  process.env.FATTLY_API_URL || process.env.GENPICS_API_URL || "https://fattly.app";

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    try {
      return JSON.parse(fs.readFileSync(LEGACY_FILE, "utf8"));
    } catch {
      return {};
    }
  }
}

function save(cfg) {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(cfg, null, 2), { mode: 0o600 });
}

function clear() {
  for (const f of [FILE, LEGACY_FILE]) {
    try {
      fs.unlinkSync(f);
    } catch {
      /* file didn't exist — nothing to do */
    }
  }
}

/**
 * Returns { apiKey, apiUrl }. Key: first the FATTLY_API_KEY environment
 * variable (how MCP is configured in Claude/Cursor; GENPICS_API_KEY still
 * accepted for backward compatibility), then the file from `fattly login`.
 * URL: env/file, falling back to the default.
 */
function resolved() {
  const cfg = load();
  return {
    apiKey:
      process.env.FATTLY_API_KEY || process.env.GENPICS_API_KEY || cfg.apiKey || null,
    apiUrl: (cfg.apiUrl || DEFAULT_URL).replace(/\/+$/, ""),
  };
}

module.exports = { load, save, clear, resolved, FILE, DEFAULT_URL };
