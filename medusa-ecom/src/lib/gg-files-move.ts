// Helpers for moving files from tmp to final order folder.
// All comments in English.

import fs from "node:fs"
import path from "node:path"

export type GGMoveResult = {
    fromAbs: string
    toAbs: string
    fromUrl: string
    toUrl: string
}

/** Ensure directory exists (recursive). */
function ensureDir(p: string) {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

/**
 * Move (or copy+delete on cross-device) a file within the local uploads.
 * - tmpUrl: e.g. "/uploads/tmp/cart_123-abc-my-artwork.png"
 * - orderDisplayId: e.g. "100023"
 * - originalName: e.g. "my-artwork.png"
 */
export function ggMoveTmpToOrder(
    tmpUrl: string,
    orderDisplayId: string,
    originalName: string | undefined
): GGMoveResult {
    if (!tmpUrl.startsWith("/uploads/tmp/")) {
        throw new Error("Given URL is not a tmp upload path")
    }

    const appRoot = process.cwd()
    const fromAbs = path.join(appRoot, tmpUrl.replace(/^\//, ""))

    // @ts-ignore
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 100)
    const orderDirRel = path.join("uploads", "orders", orderDisplayId)
    const orderDirAbs = path.join(appRoot, orderDirRel)
    ensureDir(orderDirAbs)

    const finalFile = `${orderDisplayId}-${safeName}`
    const toAbs = path.join(orderDirAbs, finalFile)
    const toUrl = "/" + path.join(orderDirRel, finalFile).replace(/\\/g, "/")

    // prefer rename; if fails (e.g. across devices), do copy+unlink
    try {
        fs.renameSync(fromAbs, toAbs)
    } catch {
        fs.copyFileSync(fromAbs, toAbs)
        fs.unlinkSync(fromAbs)
    }

    return {
        fromAbs,
        toAbs,
        fromUrl: tmpUrl,
        toUrl,
    }
}
