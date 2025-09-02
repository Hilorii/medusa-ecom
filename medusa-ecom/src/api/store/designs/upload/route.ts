// File: src/api/store/designs/upload/route.ts
// Endpoint: POST /store/designs/upload
// Saves images strictly to ~/Desktop/medusa-upload OR ~/Pulpit/medusa-upload
// CORS is handled here (including OPTIONS preflight) to allow storefront on :8000.

/* eslint-disable no-console */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import path from "path";
import os from "os";
import fs from "fs/promises";
import { constants as FS } from "fs";
import crypto from "crypto";

// ---------- Types ----------
type GGUploadBody = {
  file_base64: string; // "data:image/png;base64,AAAA..."
  originalName?: string; // optional client file name
  cartId?: string; // optional for prefixing
};

// ---------- Config ----------
// Allowed frontend origins for CORS (adjust if you use a different port/host)
const GG_ALLOWED_ORIGINS = new Set<string>([
  "http://localhost:8000",
  "http://127.0.0.1:8000",
]);

// If you want to override the directory completely, set env GG_UPLOADS_DIR.
// Otherwise we save ONLY to Desktop/Pulpit. No OneDrive fallbacks.
const GG_ENV_DIR = process.env.GG_UPLOADS_DIR;

const GG_ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);
const GG_MAX_BYTES = (Number(process.env.GG_UPLOAD_MAX_MB) || 6) * 1024 * 1024;

// ---------- Small CORS helper ----------
function ggSetCorsHeaders(req: MedusaRequest, res: MedusaResponse) {
  // Pick Origin header from request and allow it if whitelisted
  const origin = (req.headers?.origin as string) || "";
  if (GG_ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  // If you need cookies, also set: Access-Control-Allow-Credentials: "true"
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, medusa-session, X-Requested-With",
  );
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
}

// ---------- Helpers ----------
function ggParseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } {
  const m = /^data:([^;]+);base64,(.*)$/i.exec(dataUrl || "");
  if (!m) throw new Error("Invalid data URL");
  const mime = m[1].toLowerCase();
  const buffer = Buffer.from(m[2], "base64");
  return { mime, buffer };
}

function ggExtFromMime(mime: string): string {
  switch (mime) {
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    default:
      return "";
  }
}

function ggSanitizeBase(name: string) {
  // Keep alphanumerics, dot, dash and underscore; replace the rest with underscore
  return (name || "").replace(/[^\w.\-]+/g, "_");
}

function ggRandomKey(prefix = "gg") {
  return `${prefix}-${crypto.randomBytes(8).toString("hex")}`;
}

async function ggIsWritable(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.access(dir, FS.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve uploads dir:
 *  1) If GG_UPLOADS_DIR is set AND writable → use it.
 *  2) Otherwise try: ~/Desktop/medusa-upload then ~/Pulpit/medusa-upload
 *  3) No OneDrive, no tmpdir fallback — hard requirement per user.
 */
async function ggResolveUploadsDir(): Promise<{ dir: string; reason: string }> {
  if (GG_ENV_DIR) {
    if (await ggIsWritable(GG_ENV_DIR)) {
      return { dir: GG_ENV_DIR, reason: "env:GG_UPLOADS_DIR" };
    }
    console.warn("[gg:upload] GG_UPLOADS_DIR not writable:", GG_ENV_DIR);
    throw new Error("Configured GG_UPLOADS_DIR is not writable");
  }

  const home = process.env.USERPROFILE || os.homedir();
  const desktop = path.join(home, "Desktop", "medusa-upload");
  const pulpit = path.join(home, "Pulpit", "medusa-upload");

  if (await ggIsWritable(desktop)) return { dir: desktop, reason: "Desktop" };
  if (await ggIsWritable(pulpit)) return { dir: pulpit, reason: "Pulpit" };

  // Hard fail if neither Desktop nor Pulpit is writable
  throw new Error(
    "Cannot write to Desktop/Pulpit. Create 'medusa-upload' on Desktop or Pulpit and allow write access",
  );
}

// ---------- OPTIONS (CORS preflight) ----------
export const OPTIONS = async (req: MedusaRequest, res: MedusaResponse) => {
  ggSetCorsHeaders(req, res);
  // No body for preflight
  return res.status(204).send();
};

// ---------- POST /store/designs/upload ----------
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    ggSetCorsHeaders(req, res);
    console.log("[gg:upload] hit /store/designs/upload");

    // Ensure JSON body is present
    const { file_base64, originalName, cartId } = (req.body ||
      {}) as GGUploadBody;
    if (!file_base64) {
      console.warn("[gg:upload] invalid payload: file_base64 missing");
      return res
        .status(400)
        .json({ code: "invalid_payload", message: "file_base64 is required" });
    }

    // Decode Data URL
    const { mime, buffer } = ggParseDataUrl(file_base64);
    if (!GG_ALLOWED_MIME.has(mime)) {
      console.warn("[gg:upload] unsupported mime:", mime);
      return res.status(415).json({
        code: "unsupported_media_type",
        message: `Unsupported mime: ${mime}`,
      });
    }

    if (buffer.byteLength > GG_MAX_BYTES) {
      console.warn("[gg:upload] payload too large:", buffer.byteLength);
      return res.status(413).json({
        code: "payload_too_large",
        message: `Max size ${GG_MAX_BYTES} bytes exceeded`,
      });
    }

    // Resolve target dir (strict Desktop/Pulpit or env override)
    const { dir, reason } = await ggResolveUploadsDir();
    console.log("[gg:upload] target dir =", dir, "(via:", reason + ")");

    // Build filename
    const baseNameNoExt = ggSanitizeBase(
      (originalName || "upload").replace(/\.[^.]+$/, ""),
    );
    const ext =
      ggExtFromMime(mime) ||
      (originalName ? ggSanitizeBase(path.extname(originalName)) : "") ||
      ".bin";
    const prefix = cartId ? ggSanitizeBase(cartId).slice(0, 16) : "gg";
    const fileName = `${prefix}-${ggRandomKey("art")}-${baseNameNoExt}${ext}`;
    const filePath = path.join(dir, fileName);

    // Write file
    await fs.writeFile(filePath, buffer);
    console.log("[gg:upload] saved", filePath, buffer.byteLength, "bytes");

    // Return a non-public token-like URL to be stored on line item metadata
    const fileUrl = `desktop://${fileName}`;

    return res.status(201).json({
      fileUrl,
      fileName,
      bytes: buffer.byteLength,
      mime,
      hint: `Saved to ${dir} (no public serving)`,
    });
  } catch (e: any) {
    console.error("[gg:upload] ERR:", e?.message);
    // Also set CORS on error responses
    ggSetCorsHeaders(req as any, res);
    return res.status(500).json({
      code: "server_error",
      message: e?.message || "Upload failed",
    });
  }
};
