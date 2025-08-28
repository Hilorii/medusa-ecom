// Live price preview for the configurator.
// Input: { size, material, color, qty }
// Output: { currency, unit_price, subtotal, qty, breakdown }
// All comments in English as requested.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ggCalculatePrice, ggValidateSelections } from "../../../../lib/gg-pricing"
import type { GGSelections } from "../../../../lib/gg-pricing/types"

type Body = GGSelections

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
    try {
        const { size, material, color, qty } = req.body as Body

        // Basic validation using the same helper as add-to-cart
        const validation = ggValidateSelections({ size, material, color, qty })
        if (!validation.ok) {
            return res.status(422).json({ code: "invalid_payload", message: validation.reason })
        }

        const price = ggCalculatePrice({ size, material, color, qty })
        return res.json(price) // { currency, unit_price, subtotal, qty, breakdown }
    } catch (e: any) {
        return res.status(500).json({
            code: "server_error",
            message: e?.message || "Failed to calculate price",
        })
    }
}
