type Body = {
  cartId?: string
  size?: string
  material?: string
  color?: string
  qty?: number
  fileName?: string
  fileUrl?: string
}

const PRODUCT_HANDLE =
  process.env.GG_PRODUCT_HANDLE?.replace(/^\//, "") || "design-your-own"
const VARIANT_TITLE = process.env.GG_VARIANT_TITLE || "Custom"

// Medusa v2 container keys (avoid importing enums)
const K_PRODUCT = "productModuleService"
const K_CART = "cartModuleService"
const K_REGION = "regionModuleService"

// --- Minimal inline validation & pricing so TS2307 won't block you ---

// Allowed options (keep in sync with /store/designs/config if you have it)
const GG_ALLOWED = {
  size: ["21x21", "30x20", "40x30"], // extend as needed
  material: ["clear", "shadow", "galaxy"],
  color: ["black", "white", "grey", "blue", "green", "red", "brown"],
}

// Base price per size (EUR)
const GG_BASE_EUR: Record<string, number> = {
  "21x21": 59,
  "30x20": 69,
  "40x30": 89,
}

// Surcharges (EUR)
const GG_SURCHARGE_MATERIAL_EUR: Record<string, number> = {
  clear: 0,
  shadow: 5,
  galaxy: 10,
}
const GG_SURCHARGE_COLOR_EUR: Record<string, number> = {
  black: 0,
  white: 0,
  grey: 0,
  blue: 0,
  green: 0,
  red: 0,
  brown: 0,
}

// Validate selections quickly
function ggValidateSelections(input: Body) {
  const { size, material, color, qty } = input
  if (!size || !GG_ALLOWED.size.includes(size)) {
    return { ok: false, reason: "Invalid or missing 'size'." as const }
  }
  if (!material || !GG_ALLOWED.material.includes(material)) {
    return { ok: false, reason: "Invalid or missing 'material'." as const }
  }
  if (!color || !GG_ALLOWED.color.includes(color)) {
    return { ok: false, reason: "Invalid or missing 'color'." as const }
  }
  const q = Number.isFinite(qty as number) ? Math.floor(Number(qty)) : 1
  if (q < 1 || q > 99) {
    return { ok: false, reason: "Quantity out of range (1–99)." as const }
  }
  return { ok: true as const }
}

// Clamp qty
function ggClampQty(q?: number) {
  const n = Number.isFinite(q as number) ? Number(q) : 1
  return Math.max(1, Math.min(99, Math.floor(n)))
}

// Calculate price (major + helper minor units)
function ggCalculatePrice(
  input: Required<Pick<Body, "size" | "material" | "color">> & { qty: number }
) {
  const base = GG_BASE_EUR[input.size] ?? 0
  const mat = GG_SURCHARGE_MATERIAL_EUR[input.material] ?? 0
  const col = GG_SURCHARGE_COLOR_EUR[input.color] ?? 0
  const unit_eur = base + mat + col
  const unit_price = Number(unit_eur.toFixed(2))
  const multiplier = 100
  const unit_price_minor = Math.round(unit_price * multiplier)
  const subtotal_minor = unit_price_minor * input.qty
  const subtotal = subtotal_minor / multiplier
  return {
    unit_price,
    unit_price_minor,
    subtotal,
    subtotal_minor,
    qty: input.qty,
    breakdown: {
      base_eur: base,
      material_eur: mat,
      color_eur: col,
      total_eur: unit_eur,
    },
  }
}

// --- Route handler ---

export const POST = async (req: any, res: any) => {
  try {
    const { size, material, color, qty, cartId, fileName, fileUrl } =
      (req.body || {}) as Body

    // 1) Validate payload
    const validation = ggValidateSelections({ size, material, color, qty })
    if (!validation.ok) {
      return res
        .status(400)
        .json({ code: "invalid_payload", message: validation.reason })
    }
    const quantity = ggClampQty(qty!)

    // 2) Price (minor units)
    const price = ggCalculatePrice({
      size: size!,
      material: material!,
      color: color!,
      qty: quantity,
    })

    // 3) Resolve modules
    const productModule = req.scope.resolve(K_PRODUCT)
    const cartModule = req.scope.resolve(K_CART)
    const regionModule = req.scope.resolve(K_REGION)

    // 4) Region (EUR)
    const eurRegions = await regionModule.listRegions({ currency_code: "eur" })
    if (!eurRegions?.length) {
      return res
        .status(500)
        .json({ code: "no_region", message: "No EUR region configured." })
    }
    const region = eurRegions[0]

    // 5) Sales channel from PAK (keep cart in same channel as storefront)
    const pKey: any = (req as any).publishable_key
    const salesChannelId: string | undefined = pKey?.sales_channel_id

    // 6) Product & variant
    const [product] = await productModule.listProducts(
      { handle: [PRODUCT_HANDLE] },
      { relations: ["variants"] }
    )
    if (!product) {
      return res.status(404).json({
        code: "product_not_found",
        message: `Product '${PRODUCT_HANDLE}' not found.`,
      })
    }
    const variant =
      product.variants?.find((v: any) => v.title === VARIANT_TITLE) ||
      product.variants?.[0]
    if (!variant) {
      return res.status(500).json({
        code: "variant_not_found",
        message: `Variant '${VARIANT_TITLE}' not found.`,
      })
    }

    // 7) Target cart
    let cart: any | undefined
    if (cartId) {
      try {
        cart = await cartModule.retrieveCart(cartId)
      } catch {
        // ignore; will create/reuse below
      }
    }
    if (!cart) {
      cart =
        (
          await cartModule.listCarts({
            region_id: region.id,
            ...(salesChannelId ? { sales_channel_id: [salesChannelId] } : {}),
          })
        )?.[0] || undefined

      if (!cart) {
        const created = await cartModule.createCarts([
          {
            region_id: region.id,
            currency_code: "eur",
            ...(salesChannelId ? { sales_channel_id: salesChannelId } : {}),
          } as any,
        ])
        cart = created[0]
      }
    }

    // 8) Add line item
    const lineTitle = `Design Your Own (${size} • ${material} • ${color})`
    await cartModule.addLineItems(cart.id, [
      {
        title: VARIANT_TITLE || lineTitle,
        product_id: product.id,
        variant_id: variant.id,
        quantity: quantity,
        unit_price:
          typeof price.unit_price === "number" &&
          Number.isFinite(price.unit_price)
            ? price.unit_price
            : 0,
        metadata: {
          size,
          material,
          color,
          fileName,
          fileUrl,
          currency: "EUR",
          fx_rate: 1,
          breakdown: price.breakdown,
          unit_price_minor: price.unit_price_minor,
          subtotal_minor: price.subtotal_minor,
        },
      } as any,
    ])

    // 9) Return refreshed cart
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
