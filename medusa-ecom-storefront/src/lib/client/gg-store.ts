// Tiny client helpers to call our /store/designs endpoints.
// All comments in English.
// Make sure NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is set in your .env

const BASE = process.env.NEXT_PUBLIC_MEDUSA_URL || "http://localhost:9000"
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

if (!PK) {
  // Avoid silent failures during dev
  // eslint-disable-next-line no-console
  console.warn("Missing NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY in env")
}

async function jfetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": PK || "",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Request failed ${res.status}: ${text || res.statusText}`)
  }
  return res.json()
}

/** GET options + base pricing to render UI */
export function getDesignConfig() {
  return jfetch<{
    currency: "EUR"
    qty: { min: number; max: number }
    options: {
      size: { id: string; label: string; price_eur: number }[]
      material: { id: string; label: string; surcharge_eur: number }[]
      color: { id: string; label: string; surcharge_eur: number }[]
    }
  }>("/store/designs/config")
}

/** POST to get live price preview */
export function previewPrice(body: {
  size: string
  material: string
  color: string
  qty?: number
}) {
  return jfetch<{
    currency: "EUR"
    unit_price: number
    subtotal: number
    qty: number
    breakdown: {
      base_eur: number
      material_eur: number
      color_eur: number
      total_eur: number
    }
  }>("/store/designs/price", { method: "POST", body: JSON.stringify(body) })
}

/** POST upload base64 (returns tmp fileUrl) */
export function uploadArtwork(body: {
  file_base64: string
  originalName: string
  cartId?: string
}) {
  return jfetch<{
    fileUrl: string
    fileName: string
    bytes: number
    mime: string
  }>("/store/designs/upload", { method: "POST", body: JSON.stringify(body) })
}

/** POST add to cart (returns full cart) */
export function addDesignToCart(body: {
  size: string
  material: string
  color: string
  qty?: number
  fileName?: string
  fileUrl?: string
}) {
  return jfetch<any>("/store/designs/add", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

/** Tell our Next server to set the cart cookie (so the rest of the app sees the same cart) */
export async function setCartCookie(cartId: string) {
  const res = await fetch("/api/gg/cart/set", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cart_id: cartId }),
  })
  if (!res.ok) throw new Error("Failed to set cart cookie")
}
