// Smoke test (CI): starts `fattly mcp` over stdio, runs initialize + tools/list
// and checks every tool has a schema and annotations. No network, no real key —
// tools/list is static, so a placeholder key is enough.

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "url";
import path from "path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const EXPECTED = [
  "fattly_credits",
  "fattly_list_models",
  "fattly_upload_image",
  "fattly_generate_image",
  "fattly_generate_video",
  "fattly_generate_audio",
];

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(root, "bin", "fattly.js"), "mcp"],
  env: { ...process.env, FATTLY_API_KEY: "gpx_live_placeholder" },
  stderr: "ignore",
});
const client = new Client({ name: "fattly-smoke", version: "1.0.0" });

function fail(msg) {
  console.error("FAIL:", msg);
  process.exit(1);
}

const timer = setTimeout(() => fail("timeout after 20s"), 20000);

await client.connect(transport);
const { tools } = await client.listTools();
const names = tools.map((t) => t.name);

for (const name of EXPECTED) {
  if (!names.includes(name)) fail(`missing tool ${name}`);
}
for (const t of tools) {
  if (!t.description) fail(`${t.name}: no description`);
  if (t.inputSchema?.type !== "object") fail(`${t.name}: bad inputSchema`);
  const a = t.annotations;
  if (!a || typeof a.readOnlyHint !== "boolean" || typeof a.destructiveHint !== "boolean") {
    fail(`${t.name}: missing annotations`);
  }
}
const readOnly = tools.filter((t) => t.annotations.readOnlyHint).map((t) => t.name);
if (readOnly.some((n) => n.includes("generate"))) fail("generation tool marked read-only");

clearTimeout(timer);
await client.close();
console.log(`OK: ${tools.length} tools, read-only: ${readOnly.join(", ")}`);
process.exit(0);
