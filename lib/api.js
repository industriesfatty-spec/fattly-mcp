// Thin wrapper over fetch — adds the API address and Authorization header,
// and turns HTTP errors into readable exceptions. Requires Node 18+ (global fetch).

const fs = require("fs");
const path = require("path");
const { resolved } = require("./config");

// Rozpoznanie MIME po rozszerzeniu — upload akceptuje tylko JPG/PNG/WEBP,
// a serwer i tak sprawdza prawdziwy nagłówek pliku (defense-in-depth).
const MIME_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

// Wgrywa lokalny plik graficzny do storage fal (przez /api/upload) i zwraca
// { url, ... }. Zwrócony URL nadaje się jako inputImageUrl dla modeli edycji.
async function uploadFile(localPath, kind = "image") {
  const { apiKey, apiUrl } = resolved();
  if (!apiKey) {
    throw new Error("No API key. Run first: fattly login");
  }

  let buf;
  try {
    buf = fs.readFileSync(localPath);
  } catch {
    throw new Error(`Cannot read file: ${localPath}`);
  }

  const ext = path.extname(localPath).toLowerCase();
  const type = MIME_BY_EXT[ext];
  if (!type) {
    throw new Error(`Unsupported image format (${ext || "no extension"}). Use JPG, PNG or WEBP.`);
  }

  const form = new FormData();
  form.append("file", new Blob([buf], { type }), path.basename(localPath));
  form.append("kind", kind);

  const res = await fetch(apiUrl + "/api/upload", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey },
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Server error (HTTP ${res.status}).`);
  }
  return data;
}

async function request(method, pathName, body) {
  const { apiKey, apiUrl } = resolved();
  if (!apiKey) {
    throw new Error("No API key. Run first: fattly login");
  }

  const res = await fetch(apiUrl + pathName, {
    method,
    headers: {
      Authorization: "Bearer " + apiKey,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Server error (HTTP ${res.status}).`);
  }
  return data;
}

// Key-less variant — for public endpoints (the model catalog).
async function publicGet(pathName) {
  const { apiUrl } = resolved();
  const res = await fetch(apiUrl + pathName);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Server error (HTTP ${res.status}).`);
  }
  return data;
}

module.exports = { request, publicGet, uploadFile };
