<div align="center">

# fattly — FATTLY CLI + MCP server

**Generate AI images, video, voiceovers, music and UGC-style ads from your terminal — or straight from AI assistants like Claude, Cursor and VS Code via MCP.**

50+ AI models in one account (Veo 3.1, Kling 3, Seedance, Nano Banana, GPT Image, ElevenLabs…) · pay with [fattly.app](https://fattly.app) credits that never expire.

[![npm](https://img.shields.io/npm/v/fattly?color=FF6A4A)](https://www.npmjs.com/package/fattly)
[![CI](https://github.com/industriesfatty-spec/fattly-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/industriesfatty-spec/fattly-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![fattly MCP server](https://glama.ai/mcp/servers/industriesfatty-spec/fattly-mcp/badges/score.svg)](https://glama.ai/mcp/servers/industriesfatty-spec/fattly-mcp)

</div>

---

## MCP (Claude, Cursor, VS Code)

The package is an MCP server — it lets AI assistants generate media through your FATTLY account.

### Option A — Hosted (no install, sign in with OAuth)

Connect your client to the hosted server. No npm, no key to paste — you approve access in the browser.

```
https://fattly.app/api/mcp
```

In Claude: **Settings → Connectors → Add custom connector** → paste the URL. Full setup guide: https://fattly.app/claude-mcp

### Option B — Local (npx, with an API key)

1. On [fattly.app](https://fattly.app) open **Dashboard → API keys** and create a key.
2. Add this to your client's MCP config:

```json
{
  "mcpServers": {
    "fattly": {
      "command": "npx",
      "args": ["-y", "fattly", "mcp"],
      "env": {
        "FATTLY_API_KEY": "gpx_live_YOUR_KEY"
      }
    }
  }
}
```

### Tools

| Tool | What it does | Spends credits |
|---|---|---|
| `fattly_credits` | Current credit balance | no (read-only) |
| `fattly_list_models` | Models and their price in credits | no (read-only) |
| `fattly_upload_image` | Upload a local photo → URL for edit / image-to-video models | no |
| `fattly_generate_image` | Text-to-image and image editing (multi-image edits, face swap) | yes |
| `fattly_generate_video` | Text-to-video and image-to-video; waits for the mp4 | yes |
| `fattly_generate_audio` | Voiceover (text-to-speech) or music | yes |

Every tool carries MCP annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`), so clients can ask before paid calls. Failed generations are refunded automatically. Content must be safe-for-work.

## CLI

```bash
npm install -g fattly   # Node.js 18+
fattly login            # paste your gpx_live_… key
```

```bash
fattly credits
fattly models video

fattly generate "astronaut cat on Mars" --model nano-banana-2 --out cat.png
fattly video "ocean waves at sunset" --model kling-3-standard --out waves.mp4
fattly audio "Welcome to FATTLY" --voice Rachel --out voice.mp3
fattly audio "calm ambient" --music --seconds 30 --out music.mp3
```

## Configuration

| Variable | Purpose |
|---|---|
| `FATTLY_API_KEY` | API key (alternative to `fattly login`) |
| `FATTLY_API_URL` | API address override (default `https://fattly.app`) |

The key saved by `fattly login` lives in `~/.fattly/config.json` with owner-only permissions.

## More

- Website: https://fattly.app
- More than the MCP tools (AI dubbing with lip-sync, virtual try-on, UGC ad studio) is available in the web app.
- Issues: https://github.com/industriesfatty-spec/fattly-mcp/issues

MIT © Fattly
