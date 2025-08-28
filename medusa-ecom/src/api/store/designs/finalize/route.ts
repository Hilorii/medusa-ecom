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

        // 1) Retrieve order
        const order = await orderModule.retrieveOrder(order_id)
        if (!order) {
            return res.status(404).json({ code: "order_not_found", message: "Order not found" })
        }

        const displayId = String((order as any).display_id ?? (order as any).id)
        const cartId: string | undefined = (order as any).cart_id

        const moved: Array<{ item_id?: string; fromUrl: string; toUrl: string; source: "order" | "cart" }> = []
        const candidates: Array<{ source: "order" | "cart"; item_id?: string; fileUrl?: string; fileName?: string }> = []

        // Helper: move if tmp url
        const tryMove = (fileUrl?: string, fileName?: string, item_id?: string, source: "order" | "cart" = "order") => {
            if (!fileUrl) return
            candidates.push({ source, item_id, fileUrl, fileName })
            if (fileUrl.startsWith("/uploads/tmp/")) {
                const safeName = fileName || "file"
                const resMove = ggMoveTmpToOrder(fileUrl, displayId, safeName)
                moved.push({ item_id, fromUrl: resMove.fromUrl, toUrl: resMove.toUrl, source })
            }
        }

        // 2) Scan order items
        for (const it of ((order as any).items ?? [])) {
            const meta = it?.metadata ?? {}
            tryMove(meta.fileUrl, meta.fileName, it?.id, "order")
        }

        // 3) Cart fallback if nothing moved
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

        // 4) Try to persist new URLs into order items' metadata
        let itemsUpdated: Array<{ id: string; fileUrl: string }> = []
        if (moved.length > 0) {
            try {
                // Build update payloads based on current order items metadata
                const updates: Array<any> = []
                for (const it of ((order as any).items ?? [])) {
                    const hit = moved.find((m) => m.item_id === it.id && m.source === "order")
                    if (!hit) continue
                    const meta = { ...(it.metadata || {}) }
                    meta.fileUrl = hit.toUrl
                    // keep existing fileName if present
                    if (typeof meta.fileName !== "string" || !meta.fileName) {
                        meta.fileName = (meta.fileName || "file")
                    }
                    updates.push({ id: it.id, metadata: meta })
                    itemsUpdated.push({ id: it.id, fileUrl: hit.toUrl })
                }

                // Some Medusa v2 builds expose update method for order items; use 'as any' for DTO strictness
                if (updates.length > 0 && (orderModule as any).updateOrderItems) {
                    await (orderModule as any).updateOrderItems(updates as any)
                } else if (updates.length > 0) {
                    // Fallback: persist mapping on the order metadata (Admin will still see it)
                    const existing = (order as any).metadata || {}
                    const finalFiles = Array.isArray(existing.finalFiles) ? existing.finalFiles : []
                    const merged = [...finalFiles, ...moved.map((m) => ({ item_id: m.item_id, toUrl: m.toUrl }))]
                    await (orderModule as any).updateOrders?.([{ id: order_id, metadata: { ...existing, finalFiles: merged } }])
                }
            } catch (e) {
                // If updating items fails, keep moving result and mapping in response
            }
        }

        return res.json({
            order_id,
            display_id: displayId,
            moved_count: moved.length,
            moved,
            items_updated_count: itemsUpdated.length,
            items_updated: itemsUpdated,
            candidates_count: candidates.length,
            candidates,
            hint: "Ensure /uploads is served statically (e.g., Nginx). Final URLs are now stored on order items (or order.metadata as fallback).",
        })
    } catch (e: any) {
        return res.status(500).json({ code: "server_error", message: e?.message || "Finalize failed" })
    }
}
