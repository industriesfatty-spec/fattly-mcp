# Installing the Fattly MCP server (instructions for AI agents)

Fattly generates AI images, video, voiceovers and music through 50+ models, billed in credits from the user's fattly.app account.

## Requirements

- Node.js 18 or newer (`node --version`)
- A Fattly API key. The user creates it at https://fattly.app → **Dashboard → API keys**. It starts with `gpx_live_`. Ask the user to paste it; never invent one.

## Option 1 — Local server (recommended for Cline)

No clone or build step is needed; the server runs from npm.

Add this entry to the MCP settings file (`cline_mcp_settings.json`), keeping any existing servers:

```json
{
  "mcpServers": {
    "fattly": {
      "command": "npx",
      "args": ["-y", "fattly", "mcp"],
      "env": {
        "FATTLY_API_KEY": "gpx_live_USER_KEY_HERE"
      },
      "disabled": false,
      "autoApprove": ["fattly_credits", "fattly_list_models"]
    }
  }
}
```

Only the two read-only tools are auto-approved. The generation tools spend the user's credits, so leave them out of `autoApprove`.

On Windows, if `npx` is not found, use `"command": "cmd"` and `"args": ["/c", "npx", "-y", "fattly", "mcp"]`.

## Option 2 — Hosted server (no API key, OAuth)

For clients that support remote MCP servers with OAuth, use:

```
https://fattly.app/api/mcp
```

The client opens a fattly.app consent page; the user approves access.

## Verify the installation

1. Call `fattly_credits` — it should return `Balance: N credits.` An error starting with `No API key` means `FATTLY_API_KEY` is not set; `Invalid or revoked API key (HTTP 401)` means the key is wrong — ask the user to check it.
2. Call `fattly_list_models` with `{"category": "image"}` — it returns model ids and prices.

Both are free. Do not run a generation just to test the setup — it costs credits; ask the user first.

## Tools

| Tool | Purpose | Credits |
|---|---|---|
| `fattly_credits` | Credit balance | free, read-only |
| `fattly_list_models` | Models and prices | free, read-only |
| `fattly_upload_image` | Local image → URL for edit / image-to-video models | free |
| `fattly_generate_image` | Text-to-image, image edits | spends credits |
| `fattly_generate_video` | Text/image-to-video (waits up to 10 min) | spends credits |
| `fattly_generate_audio` | Voiceover or music | spends credits |

Failed generations are refunded automatically. Content must be safe-for-work.
