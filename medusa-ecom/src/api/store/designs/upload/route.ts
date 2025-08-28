// Upload endpoint: accepts JSON with base64 data URL.
// Returns a temporary file URL that can be passed to /store/designs/add.
// Later we can switch the implementation to S3 without changing this API.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ggSaveBase64ToTmp } from "../../../../lib/gg-files"

type Body = {
    file_base64: string        // e.g. "data:image/png;base64,AAAA..."
    originalName?: string      // e.g. "my-artwork.png"
    cartId?: string            // optional, used only to prefix the temp filename
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
    try {
        const { file_base64, originalName, cartId } = req.body as Body
        if (!file_base64) {
            return res.status(400).json({ code: "invalid_payload", message: "file_base64 is required" })
        }

        // Save to ./uploads/tmp with a predictable prefix (cartId if provided)
        const saved = ggSaveBase64ToTmp(file_base64, originalName || "upload", cartId)

        // Respond with info the frontend needs
        return res.json({
            fileUrl: saved.urlPath,      // e.g. "/uploads/tmp/abc-123-my-artwork.png"
            fileName: saved.fileName,    // saved file name on disk
            bytes: saved.bytes,
            mime: saved.mime,
            // For local disk, you may want to show a hint about serving static files:
            hint: "Serve /uploads as static in your reverse proxy (e.g., Nginx).",
        })
    } catch (e: any) {
        return res.status(500).json({
            code: "server_error",
            message: e?.message || "Upload failed",
        })
    }
}
