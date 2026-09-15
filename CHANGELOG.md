# Changelog

## 0.1.1 — 2026-09-15

- MCP tool annotations (`title`, `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) on all 6 tools.
- Tool descriptions now state credit usage, automatic refunds on failure and read-only status.
- Updated model ids in descriptions and CLI help (removed retired `sora-2`, `seedream-v4-edit`, `nano-banana-edit`).
- MCP server reports the real package version.
- `mcpName` for the Official MCP Registry, `server.json` with npm package and hosted remote.
- `glama.json`, CI smoke test (`npm test`), LICENSE shipped in the npm package.

## 0.1.0

- First public release: CLI (`login`, `credits`, `models`, `generate`, `video`, `audio`) and stdio MCP server.
