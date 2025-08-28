// Return the current design configuration (options + pricing)
// Useful for the configurator to render options with prices.
// All comments in English as requested.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ggLoadPricing } from "../../../../lib/gg-pricing"

export const GET = async (_req: MedusaRequest, res: MedusaResponse) => {
    try {
        const table = ggLoadPricing()

        // Shape optimized for the frontend UI
        const payload = {
            currency: table.currency,
            qty: table.qty,
            options: {
                size: Object.entries(table.sizes).map(([id, eur]) => ({
                    id,
                    label: id.replace("x", " × "), // cosmetic
                    price_eur: eur,
                })),
                material: Object.entries(table.materials).map(([id, eur]) => ({
                    id,
                    label: id, // keep ids, map to display names on FE if needed
                    surcharge_eur: eur,
                })),
                color: Object.entries(table.colors).map(([id, eur]) => ({
                    id,
                    label: id,
                    surcharge_eur: eur,
                })),
            },
        }

        return res.json(payload)
    } catch (e: any) {
        return res.status(500).json({
            code: "server_error",
            message: e?.message || "Failed to load pricing config",
        })
    }
}
