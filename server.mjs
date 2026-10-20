import http from "node:http";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(ROOT, "大家來找碴圖庫");
const PORT = Number(process.env.PORT || 4173);
const MAX_BODY_BYTES = 20 * 1024 * 1024;

function loadDotEnv(fileName) {
  try {
    const text = readFileSync(path.join(ROOT, fileName), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    }
  } catch {
    // Optional local environment file.
  }
}

loadDotEnv(".env.local");
loadDotEnv(".env");

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function errorMessage(data) {
  return data?.error?.message || data?.error || "OpenAI API request failed";
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("Request body too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function openAiJson(endpoint, payload) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("尚未設定 OPENAI_API_KEY。請設定環境變數或 .env.local");

  const response = await fetch(`https://api.openai.com/v1/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(errorMessage(data));
  return data;
}

async function generateImage(prompt) {
  const data = await openAiJson("images/generations", {
    model: "gpt-image-2",
    prompt,
    size: "1024x1536",
    quality: "high",
    output_format: "png",
    n: 1,
  });
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI 沒有返回圖片資料");
  return `data:image/png;base64,${b64}`;
}

async function editImage({ image, prompt }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("尚未設定 OPENAI_API_KEY。請設定環境變數或 .env.local");
  const match = String(image || "").match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/);
  if (!match) throw new Error("圖片格式不正確");

  const form = new FormData();
  form.append("model", "gpt-image-2");
  form.append("prompt", prompt);
  form.append("size", "1024x1536");
  form.append("quality", "high");
  form.append("output_format", "png");
  form.append("image", new Blob([Buffer.from(match[2], "base64")], { type: match[1] }), "original.png");

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(errorMessage(data));
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI 沒有返回編輯後的圖片資料");
  return `data:image/png;base64,${b64}`;
}

function safeFileName(name) {
  const cleaned = String(name || "image.png")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\.+$/g, "")
    .trim();
  return (cleaned || "image.png").slice(0, 180);
}

async function saveImage({ filename, dataUrl }) {
  const match = String(dataUrl || "").match(/^data:image\/png;base64,(.+)$/);
  if (!match) throw new Error("只接受 PNG 圖片");
  await mkdir(OUTPUT_DIR, { recursive: true });
  const finalName = safeFileName(filename);
  const outputPath = path.join(OUTPUT_DIR, finalName);
  await writeFile(outputPath, Buffer.from(match[1], "base64"));
  return { saved: true, path: outputPath };
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

async function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/大家來找碴圖卡產生器(品質好).html";
  if (pathname.startsWith("/.") || pathname.includes("/.env")) {
    res.writeHead(403); res.end("Forbidden"); return;
  }
  const filePath = path.resolve(ROOT, `.${pathname}`);
  const relative = path.relative(ROOT, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    res.writeHead(403); res.end("Forbidden"); return;
  }
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("Not a file");
    const body = await readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404); res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (url.pathname === "/api/health" && req.method === "GET") {
      return json(res, 200, { ok: true, model: "gpt-image-2", apiKeyConfigured: Boolean(process.env.OPENAI_API_KEY) });
    }
    if (url.pathname === "/api/generate-image" && req.method === "POST") {
      const { prompt } = JSON.parse(await readBody(req));
      return json(res, 200, { image: await generateImage(String(prompt || "")) });
    }
    if (url.pathname === "/api/edit-image" && req.method === "POST") {
      const { image, prompt } = JSON.parse(await readBody(req));
      return json(res, 200, { image: await editImage({ image, prompt }) });
    }
    if (url.pathname === "/api/save-image" && req.method === "POST") {
      return json(res, 200, await saveImage(JSON.parse(await readBody(req))));
    }
    if (url.pathname.startsWith("/api/")) return json(res, 404, { error: "API route not found" });
    return await serveStatic(req, res, url);
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: error.message || "Server error" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`OpenAI 圖卡產生器：http://127.0.0.1:${PORT}`);
  console.log(`API Key：${process.env.OPENAI_API_KEY ? "已設定" : "未設定"}`);
});
