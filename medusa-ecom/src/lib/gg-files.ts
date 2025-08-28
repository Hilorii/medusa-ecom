// Utility helpers for file uploads (local disk).

import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"

const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads")               // ./uploads
const TMP_DIR = path.join(UPLOAD_ROOT, "tmp")                            // ./uploads/tmp

// Allowed mime types and max size (15 MB)
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/jpg", "image/svg+xml"])
const MAX_BYTES = 15 * 1024 * 1024

export type GGSaveResult = {
    absPath: string
    relPath: string        // e.g. uploads/tmp/abc.png
    urlPath: string        // e.g. /uploads/tmp/abc.png  (you can serve it via nginx / static hosting)
    bytes: number
    mime: string
    fileName: string
}

/** Ensure upload directories exist. Call before writing. */
function ensureDirs() {
    if (!fs.existsSync(UPLOAD_ROOT)) fs.mkdirSync(UPLOAD_ROOT, { recursive: true })
    if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true })
}

/** Parse data URL like "data:image/png;base64,AAAA..." -> { mime, buffer } */
export function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } {
    const m = /^data:([\w/+.-]+);base64,(.+)$/.exec(dataUrl)
    if (!m) throw new Error("Invalid data URL format")
    const mime = m[1]
    const buffer = Buffer.from(m[2], "base64")
    return { mime, buffer }
}

/** Sanitize a filename to avoid path tricks. */
function sanitizeName(name: string): string {
    return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 100)
}

/** Save a base64 image to ./uploads/tmp and return paths. */
export function ggSaveBase64ToTmp(
    dataUrl: string,
    originalName: string,
    prefix?: string
): GGSaveResult {
    ensureDirs()
    const { mime, buffer } = parseDataUrl(dataUrl)

    if (!ALLOWED_MIME.has(mime)) {
        throw new Error(`Unsupported file type: ${mime}`)
    }
    if (buffer.byteLength > MAX_BYTES) {
        throw new Error(`File too large (max ${Math.round(MAX_BYTES / (1024 * 1024))} MB)`)
    }

    const safeName = sanitizeName(originalName || "upload")
    const ext = mime === "image/png" ? ".png"
        : mime === "image/jpeg" || mime === "image/jpg" ? ".jpg"
            : mime === "image/svg+xml" ? ".svg"
                : ""

    // Unique file name: {prefix}-{rand}-{safeName}{ext?}
    const rand = crypto.randomBytes(6).toString("hex")
    const base = [prefix, rand, safeName].filter(Boolean).join("-")
    const fileName = base.endsWith(ext) ? base : base + ext

    const relPath = path.join("uploads", "tmp", fileName)
    const absPath = path.join(process.cwd(), relPath)
    fs.writeFileSync(absPath, buffer)

    return {
        absPath,
        relPath,
        urlPath: "/" + relPath.replace(/\\/g, "/"),
        bytes: buffer.byteLength,
        mime,
        fileName,
    }
}
