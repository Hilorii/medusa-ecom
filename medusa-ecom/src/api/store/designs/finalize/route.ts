import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { ggMoveTmpToOrder } from "../../../../lib/gg-files-move"

type Body = { order_id: string }

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
    try {
        const { order_id } = req.body as Body
        if (!order_id) {
            return res.status(400).json({ code: "invalid_payload", message: "order_id is required" })
        }

        const orderModule = req.scope.resolve(Modules.ORDER)
        const cartModule = req.scope.resolve(Modules.CART)

        // 1) Pobierz zamówienie
        const order = await orderModule.retrieveOrder(order_id)
        if (!order) {
            return res.status(404).json({ code: "order_not_found", message: "Order not found" })
        }

        const displayId = String((order as any).display_id ?? (order as any).id)
        const cartId: string | undefined = (order as any).cart_id

        const moved: Array<{ item_id?: string; fromUrl: string; toUrl: string; source: "order" | "cart" }> = []
        const candidates: Array<{ source: "order" | "cart"; item_id?: string; fileUrl?: string; fileName?: string }> = []

        // Helper: przenieś jeśli url to /uploads/tmp/...
        const tryMove = (fileUrl?: string, fileName?: string, item_id?: string, source: "order" | "cart" = "order") => {
            if (!fileUrl) return
            candidates.push({ source, item_id, fileUrl, fileName })
            if (fileUrl.startsWith("/uploads/tmp/")) {
                const safeName = fileName || "file"
                const resMove = ggMoveTmpToOrder(fileUrl, displayId, safeName)
                moved.push({ item_id, fromUrl: resMove.fromUrl, toUrl: resMove.toUrl, source })
            }
        }

        // 2) Skanuj pozycje w zamówieniu
        for (const it of ((order as any).items ?? [])) {
            const meta = it?.metadata ?? {}
            tryMove(meta.fileUrl, meta.fileName, it?.id, "order")
        }

        // 3) Jeśli nic nie przeniesiono – spróbuj pozycje z koszyka powiązanego z zamówieniem
        if (moved.length === 0 && cartId) {
            try {
                const cart = await cartModule.retrieveCart(cartId)
                for (const it of ((cart as any).items ?? [])) {
                    const meta = it?.metadata ?? {}
                    tryMove(meta.fileUrl, meta.fileName, it?.id, "cart")
                }
            } catch {
                // ignore cart fallback errors
            }
        }

        return res.json({
            order_id,
            display_id: displayId,
            moved_count: moved.length,
            moved,
            candidates_count: candidates.length,
            candidates, // podgląd co widzimy; ułatwia diagnozę
            hint: "Make sure /uploads is served statically (e.g., Nginx). Ensure fileUrl from /store/designs/add starts with /uploads/tmp/…",
        })
    } catch (e: any) {
        return res.status(500).json({ code: "server_error", message: e?.message || "Finalize failed" })
    }
}
