import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { ggCalculatePrice, ggValidateSelections } from "../../../../lib/gg-pricing"
import type { GGSelections } from "../../../../lib/gg-pricing/types"

type Body = GGSelections & {
    fileName?: string
    fileUrl?: string
}

const PRODUCT_HANDLE = "design-your-own"
const VARIANT_TITLE = "Custom"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
    try {
        const { size, material, color, qty, fileName, fileUrl } = req.body as Body

        // 1) Validate payload vs. our config
        const validation = ggValidateSelections({ size, material, color, qty })
        if (!validation.ok) {
            return res.status(400).json({ code: "invalid_payload", message: validation.reason })
        }

        // 2) Calculate price (minor units)
        const price = ggCalculatePrice({ size, material, color, qty })

        // 3) Resolve modules
        const productModule = req.scope.resolve(Modules.PRODUCT)
        const cartModule = req.scope.resolve(Modules.CART)
        const regionModule = req.scope.resolve(Modules.REGION)

        // 4) Region (EUR)
        const eurRegions = await regionModule.listRegions({ currency_code: "eur" })
        if (!eurRegions?.length) {
            return res.status(500).json({ code: "no_region", message: "No EUR region configured." })
        }
        const region = eurRegions[0]

        // 5) Get product & variant (ONLY by handle; do not populate non-existent relations)
        const [product] = await productModule.listProducts(
            { handle: [PRODUCT_HANDLE] },
            { relations: ["variants"] } // 'sales_channels' is NOT a relation on Product in v2
        )
        if (!product) {
            return res.status(404).json({ code: "product_not_found", message: "Design Your Own product not found." })
        }
        const variant = product.variants?.find((v: any) => v.title === VARIANT_TITLE)
        if (!variant) {
            return res.status(500).json({ code: "variant_not_found", message: "Custom variant not found." })
        }

        // 6) Find or create cart (guest flow). We don't filter by sales channel here.
        const existing = await cartModule.listCarts({ region_id: region.id })
        let cart = existing?.[0]

        if (!cart) {
            const created = await cartModule.createCarts([
                {
                    region_id: region.id,
                    currency_code: "eur",
                } as any,
            ])
            cart = created[0]
        }

        // 7) Add line item — v2 DTO requires 'title'
        const lineTitle = `Design Your Own (${size} • ${material} • ${color})`

        await cartModule.addLineItems(cart.id, [
            {
                title: "Custom",
                product_id: product.id,
                variant_id: variant.id,
                quantity: qty,
                unit_price: price.unit_price,
                metadata: {
                    size,
                    material,
                    color,
                    fileName,
                    fileUrl,
                    breakdown: price.breakdown,
                },
            } as any,
        ])

        // 8) Return updated cart
        const updated = await cartModule.retrieveCart(cart.id)

        return res.json(updated)
    } catch (e: any) {
        return res.status(500).json({
            code: "server_error",
            message: e?.message || "Internal error",
            stack: process.env.NODE_ENV !== "production" ? e?.stack : undefined,
        })
    }
}
