// Upload endpoint: accepts JSON with base64 data URL.
// Returns a temporary, opaque file URL that you can pass to /store/designs/add.
// DEV/PROD safe: writes outside the project tree (system temp) to avoid dev watcher restarts.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import path from "path"
import os from "os"
import fs from "fs/promises"
import crypto from "crypto"

// ---------- Types ----------

type Body = {
    file_base64: string        // e.g. "data:image/png;base64,AAAA..."
    originalName?: string      // e.g. "my-artwork.png"
    cartId?: string            // optional, used to prefix the temp filename
}

// ---------- Config ----------

// Keep in sync with your UI accept list
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"])

// 6 MB limit by default (can override via env)
const MAX_BYTES = (Number(process.env.GG_UPLOAD_MAX_MB) || 6) * 1024 * 1024

// System temp dir → guaranteed to be outside your project tree
// You may override with GG_UPLOADS_DIR if needed
const LOCAL_BASE_DIR =
    process.env.GG_UPLOADS_DIR || path.join(os.tmpdir(), "rgb-led-uploads")

// ---------- Helpers ----------

function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } {
    const m = /^data:([^;]+);base64,(.*)$/i.exec(dataUrl || "")
    if (!m) throw new Error("Invalid data URL")
    const mime = m[1].toLowerCase()
    const b64 = m[2]
    const buffer = Buffer.from(b64, "base64")
    return { mime, buffer }
}

function extFromMime(mime: string): string {
    switch (mime) {
        case "image/png":
            return ".png"
        case "image/jpeg":
            return ".jpg"
        case "image/webp":
            return ".webp"
        default:
            return ""
    }
}

function sanitizeBase(name: string) {
    return name.replace(/[^\w.\-]+/g, "_")
}

function randomKey(prefix = "gg") {
    return `${prefix}-${crypto.randomBytes(8).toString("hex")}`
}

// ---------- Route ----------

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
    try {
        const { file_base64, originalName, cartId } = (req.body || {}) as Body

        if (!file_base64) {
            return res
                .status(400)
                .json({ code: "invalid_payload", message: "file_base64 is required" })
        }

        const { mime, buffer } = parseDataUrl(file_base64)

        if (!ALLOWED_MIME.has(mime)) {
            return res
                .status(415)
                .json({ code: "unsupported_media_type", message: `Unsupported mime: ${mime}` })
        }

        if (buffer.byteLength > MAX_BYTES) {
            return res
                .status(413)
                .json({
                    code: "payload_too_large",
                    message: `Max size ${MAX_BYTES} bytes exceeded`,
                })
        }

        await fs.mkdir(LOCAL_BASE_DIR, { recursive: true })

        const base = sanitizeBase(originalName || "upload").replace(/\.[^.]+$/, "")
        const ext = extFromMime(mime) || path.extname(originalName || "") || ".bin"

        // Prefix with cartId if provided (helps with debugging / grouping)
        const prefix = cartId ? sanitizeBase(cartId).slice(0, 16) : "gg"
        const fileName = `${prefix}-${randomKey("art")}-${base}${ext}`
        const filePath = path.join(LOCAL_BASE_DIR, fileName)

        await fs.writeFile(filePath, buffer)

        // We return an opaque, non-HTTP URL. It's meant for metadata only.
        // If one day you need to serve files publicly, create a separate static route that reads from LOCAL_BASE_DIR.
        const fileUrl = `tmp://${fileName}`

        return res.json({
            fileUrl,                 // opaque handle for later reference (metadata only)
            fileName,                // actual filename on disk
            bytes: buffer.byteLength,
            mime,
            // hint: "Files are stored in system temp; not publicly served.",
        })
    } catch (e: any) {
        return res.status(500).json({
            code: "server_error",
            message: e?.message || "Upload failed",
        })
    }
}
