// File: src/api/store/designs/upload/route.ts
// Endpoint: POST /store/designs/upload
// Saves uploaded images into /static/incoming/<dd>-<mm>-<cart_line_item_id>.webp
// Converts to WebP with reduced quality to keep file sizes manageable.
// CORS is handled here (including OPTIONS preflight) to allow storefront on :8000.

/* eslint-disable no-console */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import fs from "fs/promises";
import {
  ggPrepareIncomingFinalTarget,
  ggPrepareIncomingTempTarget,
  ggSanitizeLineItemId,
} from "../../../../lib/gg-incoming";
import { ggConvertBufferToWebp } from "../../../../lib/gg-image";

// ---------- Types ----------
type GGUploadBody = {
  file_base64: string; // "data:image/png;base64,AAAA..." etc.
  originalName?: string; // optional client file name
  cartId?: string; // legacy prefix support
  cart_line_item_id?: string; // preferred identifier for naming
  cartLineItemId?: string; // camelCase variant
  lineItemId?: string; // extra alias
};

// ---------- Config ----------
const GG_ALLOWED_ORIGINS = new Set<string>([
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "https://192.168.1.109:8443/",
]);

const GG_ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);
const GG_MAX_BYTES = (Number(process.env.GG_UPLOAD_MAX_MB) || 6) * 1024 * 1024;
const GG_WEBP_QUALITY = Number(process.env.GG_UPLOAD_WEBP_QUALITY) || 80;
const GG_WEBP_MAX_DIMENSION =
  Number(process.env.GG_UPLOAD_WEBP_MAX_DIMENSION) || 3000;

// ---------- Small CORS helper ----------
function ggSetCorsHeaders(req: MedusaRequest, res: MedusaResponse) {
  const origin = (req.headers?.origin as string) || "";
  if (GG_ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
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

// NOTE: accept a *partial* body to avoid TS2345 when req.body is `unknown`
function ggExtractLineItemId(body: Partial<GGUploadBody>): string | undefined {
  return body.cart_line_item_id || body.cartLineItemId || body.lineItemId;
}

// ---------- OPTIONS (CORS preflight) ----------
export const OPTIONS = async (req: MedusaRequest, res: MedusaResponse) => {
  ggSetCorsHeaders(req, res);
  return res.status(204).send();
};

// ---------- POST /store/designs/upload ----------
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    ggSetCorsHeaders(req, res);
    console.log("[gg:upload] hit /store/designs/upload");

    // Ensure JSON body is present
    const { file_base64, originalName, cartId } = (req.body ||
      {}) as Partial<GGUploadBody>;
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

    const providedLineItemId = ggExtractLineItemId(
      (req.body || {}) as Partial<GGUploadBody>,
    );
    const sanitizedLineItemId = ggSanitizeLineItemId(providedLineItemId);
    console.log("[gg:upload] meta", {
      originalName,
      cartId,
      providedLineItemId,
    });

    if (!sanitizedLineItemId) {
      console.warn(
        "[gg:upload] no cart_line_item_id provided – storing as pending",
      );
    }

    const optimized = await ggConvertBufferToWebp(buffer, {
      quality: GG_WEBP_QUALITY,
      maxWidth: GG_WEBP_MAX_DIMENSION,
      maxHeight: GG_WEBP_MAX_DIMENSION,
    });

    const target = sanitizedLineItemId
      ? await ggPrepareIncomingFinalTarget(sanitizedLineItemId)
      : await ggPrepareIncomingTempTarget();

    await fs.writeFile(target.absPath, optimized);

    console.log(
      "[gg:upload] saved",
      target.absPath,
      "orig",
      buffer.byteLength,
      "bytes → webp",
      optimized.byteLength,
      "bytes",
    );

    return res.status(201).json({
      fileUrl: target.urlPath,
      fileName: target.fileName,
      bytes: optimized.byteLength,
      mime: "image/webp",
      original_mime: mime,
      relativePath: target.relativePath,
      stored_line_item_id: sanitizedLineItemId || null,
      cart_line_item_id: providedLineItemId ?? null,
      pending_line_item: !sanitizedLineItemId,
      hint: `Saved under ${target.relDir}`,
    });
  } catch (e: any) {
    console.error("[gg:upload] ERR:", e?.message);
    ggSetCorsHeaders(req as any, res);
    return res.status(500).json({
      code: "server_error",
      message: e?.message || "Upload failed",
    });
  }
};
