#!/usr/bin/env node
// FATTLY CLI — generate images / video / audio from your terminal.
// Log in with an API key (fattly login); credits come from your account on the site.

const fs = require("fs");
const readline = require("readline");
const { request, publicGet } = require("../lib/api");
const config = require("../lib/config");

// --- Tiny argument parser ------------------------------------------------
// Splits argv into positionals and flags (--key value, --flag).
function parseArgs(argv) {
  const positionals = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const name = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        flags[name] = true; // flag without a value
      } else {
        flags[name] = next;
        i++;
      }
    } else {
      positionals.push(a);
    }
  }
  return { positionals, flags };
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) =>
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

function die(msg) {
  console.error("✖ " + msg);
  process.exit(1);
}

// Downloads a file from a URL to disk (for the --out flag).
async function download(url, outPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not download file (HTTP ${res.status}).`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buf);
}

// --- Commands ------------------------------------------------------------

async function cmdLogin(positionals, flags) {
  let key = flags.key || positionals[0];
  if (!key) {
    key = await prompt("Paste your API key (gpx_live_…): ");
  }
  if (!key || !key.startsWith("gpx_live_")) {
    die("That doesn't look like a valid key (it should start with gpx_live_).");
  }

  const cfg = config.load();
  cfg.apiKey = key;
  if (flags.url) cfg.apiUrl = String(flags.url).replace(/\/+$/, "");
  config.save(cfg);

  // Quick check that the key works.
  try {
    const { credits } = await request("GET", "/api/credits");
    console.log(`✓ Logged in. Balance: ${credits} credits.`);
    console.log(`  API: ${config.resolved().apiUrl}`);
    console.log(`  Key saved at: ${config.FILE}`);
  } catch (e) {
    config.clear();
    die("The server rejected the key: " + e.message);
  }
}

function cmdLogout() {
  config.clear();
  console.log("✓ Logged out (key removed from this computer).");
}

async function cmdCredits() {
  const { credits } = await request("GET", "/api/credits");
  console.log(`Balance: ${credits} credits.`);
}

async function cmdModels(positionals) {
  const filter = positionals[0]; // image | video | audio (optional)
  const cat = await publicGet("/api/models");

  if (!filter || filter === "image") {
    console.log("\n🖼️  IMAGES (id — cost cr — name):");
    cat.image.models.forEach((m) =>
      console.log(`  ${m.id.padEnd(20)} ${String(m.credits).padStart(3)} cr  ${m.name}`)
    );
  }
  if (!filter || filter === "video") {
    console.log("\n🎬  VIDEO (id — cost/5s — durations):");
    cat.video.models.forEach((m) =>
      console.log(`  ${m.id.padEnd(20)} ${String(m.creditsPer5s).padStart(3)} cr  [${m.durations.join(", ")}] s`)
    );
  }
  if (!filter || filter === "audio") {
    console.log("\n🎵  AUDIO:");
    console.log(`  voice (TTS): ${cat.audio.speech.credits} cr — voices: ${cat.audio.speech.voices.map((v) => v.id).join(", ")}`);
    console.log(`  music: ${cat.audio.music.lengths.map((l) => `${l.seconds}s=${l.credits}cr`).join(", ")}`);
  }
  console.log("");
}

async function cmdGenerate(positionals, flags) {
  const prompt = positionals.join(" ").trim();
  if (!prompt) die('Provide a prompt, e.g.: fattly generate "a cat in space"');

  const body = {
    prompt,
    modelId: flags.model || "flux-schnell",
    aspectRatio: flags.ratio || "1:1",
    numImages: flags.n ? Number(flags.n) : 1,
  };
  if (flags.image) body.inputImageUrl = flags.image; // fal URL (editing)

  console.log(`⏳ Generating image with model "${body.modelId}"…`);
  const data = await request("POST", "/api/generate", body);
  const urls = data.imageUrls || [];
  urls.forEach((u, i) => console.log(`✓ Image ${i + 1}: ${u}`));

  if (flags.out && urls[0]) {
    await download(urls[0], flags.out);
    console.log(`💾 Saved: ${flags.out}`);
  }
}

async function cmdVideo(positionals, flags) {
  const prompt = positionals.join(" ").trim();
  if (!prompt) die('Provide a prompt, e.g.: fattly video "ocean waves" --model kling-2-5');

  const body = {
    prompt,
    modelId: flags.model || "ltx-2",
    duration: flags.duration ? Number(flags.duration) : undefined,
    aspectRatio: flags.ratio || "16:9",
  };
  if (flags.image) body.inputImageUrl = flags.image;

  console.log(`⏳ Submitting video with model "${body.modelId}" (this takes a few minutes)…`);
  const start = await request("POST", "/api/video/generate", body);
  const id = start.id;

  // Poll status every 3s, up to 10 minutes.
  const deadline = Date.now() + 10 * 60 * 1000;
  process.stdout.write("   ");
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    const st = await request("GET", `/api/video/status?id=${id}`);
    if (st.status === "completed") {
      console.log(`\n✓ Done: ${st.url}`);
      if (flags.out) {
        await download(st.url, flags.out);
        console.log(`💾 Saved: ${flags.out}`);
      }
      return;
    }
    if (st.status === "failed") {
      die("\nGeneration failed: " + (st.error || "unknown error"));
    }
    process.stdout.write(".");
  }
  die("\nTimed out after 10 min. Check your history on the website.");
}

async function cmdAudio(positionals, flags) {
  const text = positionals.join(" ").trim();
  if (!text) die('Provide text, e.g.: fattly audio "Hello world" --voice Rachel');

  const body = flags.music
    ? { type: "music", text, seconds: flags.seconds ? Number(flags.seconds) : 30 }
    : { type: "speech", text, voice: flags.voice || "Rachel" };

  console.log(flags.music ? "⏳ Generating music…" : "⏳ Generating voiceover…");
  const data = await request("POST", "/api/audio/generate", body);
  console.log(`✓ Done: ${data.url}`);

  if (flags.out) {
    await download(data.url, flags.out);
    console.log(`💾 Saved: ${flags.out}`);
  }
}

function cmdHelp() {
  console.log(`
FATTLY — CLI

Usage:
  fattly login [--url <address>]      Log in with an API key (saved locally)
  fattly logout                       Remove the key from this computer
  fattly credits                      Show your credit balance
  fattly models [image|video|audio]   List models and their costs
  fattly mcp                          Start the MCP server (for Claude/Cursor)

  fattly generate "<prompt>" [options]
      --model <id>     image model (default flux-schnell)
      --ratio <r>      aspect ratio, e.g. 1:1, 16:9 (default 1:1)
      --n <1-4>        number of images (default 1)
      --image <url>    input image URL (editing models)
      --out <file>     save the first result to disk

  fattly video "<prompt>" [options]
      --model <id>     ltx-2 | kling-2-5 | seedance-v1-pro (default ltx-2)
      --duration <s>   clip length in seconds
      --ratio <r>      aspect ratio (default 16:9)
      --image <url>    image URL (image-to-video)
      --out <file>     save the mp4 to disk

  fattly audio "<text>" [options]
      --voice <voice>  voiceover: Rachel, Aria, George… (default Rachel)
      --music          music mode instead of voiceover
      --seconds <s>    music length: 15 | 30 | 60
      --out <file>     save the mp3 to disk

The API address comes from login or the FATTLY_API_URL environment variable.
`);
}

// --- Router --------------------------------------------------------------

async function main() {
  const [, , cmd, ...rest] = process.argv;
  const { positionals, flags } = parseArgs(rest);

  try {
    switch (cmd) {
      case "login": return await cmdLogin(positionals, flags);
      case "logout": return cmdLogout();
      case "credits": return await cmdCredits();
      case "models": return await cmdModels(positionals);
      case "generate": return await cmdGenerate(positionals, flags);
      case "video": return await cmdVideo(positionals, flags);
      case "audio": return await cmdAudio(positionals, flags);
      case "mcp": {
        // The MCP server is ESM (official SDK) — load it dynamically.
        const { startMcp } = await import("../lib/mcp.mjs");
        return await startMcp();
      }
      case undefined:
      case "help":
      case "--help":
      case "-h": return cmdHelp();
      default:
        die(`Unknown command: "${cmd}". Run "fattly help".`);
    }
  } catch (e) {
    die(e.message);
  }
}

main();
