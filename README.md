<div align="center">

# fattly — FATTLY CLI

**Generate AI images, video, voiceovers, avatars & UGC ads from your terminal — or from AI assistants like Claude & Cursor via MCP.**

30+ AI models · credits from your [fattly.app](https://fattly.app) account.

[![Website](https://img.shields.io/badge/Try%20it-fattly.app-FF6A4A?style=for-the-badge)](https://fattly.app)

</div>

---

## Install

```bash
npm install -g fattly
```

(Requires Node.js 18+.)

## Get started

1. Open the site → **Dashboard → API keys** → generate a key.
2. Log in from the terminal:

```bash
fattly login
# paste your gpx_live_… key
```

## Examples

```bash
fattly credits
fattly models

fattly generate "astronaut cat on Mars" --model nano-banana-2 --out cat.png
fattly video "ocean waves at sunset" --model kling-3-standard --out waves.mp4
fattly audio "Welcome to FATTLY" --voice Rachel --out voice.mp3
fattly audio "calm ambient" --music --seconds 30 --out music.mp3
```

## MCP (Claude, Cursor)

The same package is an MCP server — it lets AI assistants generate through FATTLY.
Add this to your client's MCP config:

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

Available tools: `fattly_credits`, `fattly_list_models`,
`fattly_generate_image`, `fattly_generate_video`, `fattly_generate_audio`.

## API address

By default the CLI/MCP connects to the address set at login (or the default).
Override it at login (`fattly login --url https://your-domain`) or with the
`FATTLY_API_URL` environment variable.
