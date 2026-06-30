// MCP server for FATTLY — lets AI assistants (Claude, Cursor) generate
// images/video/audio via tools. Communicates over stdio (JSON-RPC), so nothing
// may be written to stdout except the protocol — diagnostics go to stderr
// (console.error).
//
// The API key and address come from lib/config (the FATTLY_API_KEY env var, or
// the file after `fattly login`). Under the hood these are the same endpoints as the CLI.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const api = require("./api.js");

// --- Tool definitions (visible to the assistant) -------------------------
const TOOLS = [
  {
    name: "fattly_credits",
    description: "Shows the current credit balance on the FATTLY account.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "fattly_list_models",
    description:
      "Returns available models and their cost in credits (images, video, audio). " +
      "Use before generating to pick the right model.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["image", "video", "audio"],
          description: "Optional category filter.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "fattly_upload_image",
    description:
      "Uploads a local image file (JPG, PNG or WEBP) to FATTLY and returns a public fal URL. " +
      "Use this to turn a photo on disk into an inputImageUrl for editing / face-swap / " +
      "image-to-video models: pass the returned URL as inputImageUrl to fattly_generate_image " +
      "or fattly_generate_video. No credits are charged for the upload.",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Absolute path to a local image file (JPG, PNG or WEBP), max 10 MB.",
        },
      },
      required: ["filePath"],
      additionalProperties: false,
    },
  },
  {
    name: "fattly_generate_image",
    description:
      "Generates an AI image from a prompt. Returns a link to the finished image. " +
      "Credits are deducted from the user's account.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Description of the image to generate." },
        model: {
          type: "string",
          description: "Model id (default flux-schnell). List: fattly_list_models.",
        },
        aspectRatio: {
          type: "string",
          description: "Aspect ratio, e.g. 1:1, 16:9, 9:16 (default 1:1).",
        },
        numImages: {
          type: "integer",
          minimum: 1,
          maximum: 4,
          description: "Number of images 1–4 (default 1).",
        },
        inputImageUrl: {
          type: "string",
          description:
            "Optional single input image for editing / face-swap models — must be a fal URL. " +
            "Get one by uploading a local photo with fattly_upload_image.",
        },
        inputImageUrls: {
          type: "array",
          items: { type: "string" },
          maxItems: 4,
          description:
            "Optional MULTIPLE input images (fal URLs) for multi-image edit models like " +
            "nano-banana-edit / nano-banana-pro-edit / seedream-v4-edit. Typical swap use: " +
            "image #1 = the scene/frame to keep (background, framing, lighting), image #2 = " +
            "the subject/face to place into that scene. Get each URL from fattly_upload_image.",
        },
      },
      required: ["prompt"],
      additionalProperties: false,
    },
  },
  {
    name: "fattly_generate_video",
    description:
      "Generates an AI video from a prompt (or from an image). Takes a few minutes — " +
      "the tool waits for the result and returns a link to the mp4 file.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Description of the video scene." },
        model: {
          type: "string",
          description: "ltx-2 | kling-2-5 | seedance-v1-pro (default ltx-2).",
        },
        duration: { type: "integer", description: "Clip length in seconds (model dependent)." },
        aspectRatio: { type: "string", description: "Aspect ratio, e.g. 16:9, 9:16, 1:1 (default 16:9)." },
        inputImageUrl: {
          type: "string",
          description:
            "Optional start image for image-to-video — must be a fal URL. " +
            "Get one by uploading a local photo with fattly_upload_image.",
        },
      },
      required: ["prompt"],
      additionalProperties: false,
    },
  },
  {
    name: "fattly_generate_audio",
    description:
      "Generates AI audio: a voiceover (mode=speech) from text, or music (mode=music) from a description. " +
      "Returns a link to the mp3 file.",
    inputSchema: {
      type: "object",
      properties: {
        mode: { type: "string", enum: ["speech", "music"], description: "speech = voiceover, music = music." },
        text: { type: "string", description: "Text to read (speech) or a music description (music)." },
        voice: { type: "string", description: "Voiceover voice, e.g. Rachel, Aria, George (speech only)." },
        seconds: { type: "integer", description: "Music length: 15, 30 or 60 (music only)." },
      },
      required: ["mode", "text"],
      additionalProperties: false,
    },
  },
];

// --- Call handling -------------------------------------------------------
function text(s) {
  return { content: [{ type: "text", text: s }] };
}

async function handleCall(name, args) {
  switch (name) {
    case "fattly_credits": {
      const { credits } = await api.request("GET", "/api/credits");
      return text(`Balance: ${credits} credits.`);
    }

    case "fattly_list_models": {
      const cat = await api.publicGet("/api/models");
      const wanted = args.category;
      const out = {};
      if (!wanted || wanted === "image") out.image = cat.image.models;
      if (!wanted || wanted === "video") out.video = cat.video.models;
      if (!wanted || wanted === "audio") out.audio = cat.audio;
      return text(JSON.stringify(out, null, 2));
    }

    case "fattly_upload_image": {
      const data = await api.uploadFile(args.filePath, "image");
      return text(data.url);
    }

    case "fattly_generate_image": {
      const body = {
        prompt: args.prompt,
        modelId: args.model || "flux-schnell",
        aspectRatio: args.aspectRatio || "1:1",
        numImages: args.numImages || 1,
      };
      // Wiele obrazów (edycja wielo-obrazowa) ma pierwszeństwo; w innym wypadku
      // pojedynczy obraz. Backend i tak waliduje, że to URL-e z uploadu (fal).
      const imgs =
        args.inputImageUrls && args.inputImageUrls.length
          ? args.inputImageUrls
          : args.inputImageUrl
            ? [args.inputImageUrl]
            : [];
      if (imgs.length) body.inputImageUrls = imgs;
      const data = await api.request("POST", "/api/generate", body);
      return text((data.imageUrls || []).join("\n") || "No result.");
    }

    case "fattly_generate_video": {
      const body = {
        prompt: args.prompt,
        modelId: args.model || "ltx-2",
        duration: args.duration,
        aspectRatio: args.aspectRatio || "16:9",
      };
      if (args.inputImageUrl) body.inputImageUrl = args.inputImageUrl;
      const start = await api.request("POST", "/api/video/generate", body);

      // Wait for the result (poll every 3s, up to 10 min). Progress → stderr.
      const deadline = Date.now() + 10 * 60 * 1000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 3000));
        const st = await api.request("GET", `/api/video/status?id=${start.id}`);
        if (st.status === "completed") return text(st.url);
        if (st.status === "failed") throw new Error(st.error || "Video generation failed.");
        console.error("[fattly] video in progress…");
      }
      throw new Error("Timed out waiting for the video (10 min).");
    }

    case "fattly_generate_audio": {
      const body =
        args.mode === "music"
          ? { type: "music", text: args.text, seconds: args.seconds || 30 }
          : { type: "speech", text: args.text, voice: args.voice || "Rachel" };
      const data = await api.request("POST", "/api/audio/generate", body);
      return text(data.url);
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// --- Start the server ----------------------------------------------------
export async function startMcp() {
  const server = new Server(
    { name: "fattly", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args = {} } = req.params;
    try {
      return await handleCall(name, args);
    } catch (e) {
      // Return the error as the tool result (isError) — the assistant will see it.
      return { content: [{ type: "text", text: "Error: " + e.message }], isError: true };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[fattly] MCP server started (stdio).");
}
