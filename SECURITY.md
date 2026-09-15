# Security Policy

## Reporting a vulnerability

Please report security issues privately — do not open a public issue.

- Email: **contact@fattly.app** (subject: `SECURITY`)
- Or use GitHub's **Report a vulnerability** button on the Security tab of this repository.

Include what you found, how to reproduce it and the affected version (`npm ls -g fattly`). We aim to acknowledge reports within 72 hours.

## Scope

- This package: the `fattly` CLI and stdio MCP server (npm `fattly`)
- The hosted MCP server at `https://fattly.app/api/mcp` and its OAuth endpoints

## Handling of credentials

- API keys are read from `FATTLY_API_KEY` or `~/.fattly/config.json` (created with owner-only permissions) and are only sent to the configured API address over HTTPS.
- The server stores only a SHA-256 hash of each API key; keys can be revoked at fattly.app → Dashboard → API keys.
