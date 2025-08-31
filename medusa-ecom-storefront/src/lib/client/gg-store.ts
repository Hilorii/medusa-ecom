// Tiny client helpers to call our /store/designs endpoints.
// All comments in English. Keep logs verbose only during debugging.

const RAW_BASE =
  process.env.NEXT_PUBLIC_MEDUSA_URL ||
  process.env.MEDUSA_BACKEND_URL ||
  "http://127.0.0.1:9000"

// Normalize base URL: trim spaces and trailing slashes
const BASE = RAW_BASE.trim().replace(/\/+$/, "")

const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

// Debug: print BASE once on module load
// NOTE: In client components this lands in the browser console.
//       In server code it lands in the server terminal.
try {
  // eslint-disable-next-line no-console
  console.log("[gg-store] BASE =", JSON.stringify(BASE))
} catch {
  /* noop */
}

// Ensures path always starts with a single slash
function normalizePath(path: string): string {
  if (!path.startsWith("/")) return `/${path}`
  return path
}

// Single fetch wrapper with consistent headers, error handling and logging
async function jfetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE}${normalizePath(path)}`
  const method = (init?.method || "GET").toUpperCase()

  // Merge headers and add our defaults
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-publishable-api-key": PK,
    ...(init?.headers as Record<string, string> | undefined),
  }

  // Log the outgoing request (method + URL). Body size, if present.
  try {
    const bodyPreview =
      typeof init?.body === "string"
        ? ` bodyBytes=${new Blob([init.body]).size}`
        : init?.body
        ? " body=[FormData/Blob]"
        : ""
    // eslint-disable-next-line no-console
    console.log(`[gg-store] → ${method} ${url}${bodyPreview}`)
  } catch {
    /* noop */
  }

  // Perform the request with no caching
  try {
    const res = await fetch(url, {
      cache: "no-store",
      ...init,
      headers,
    })

    // Log status line
    try {
      // eslint-disable-next-line no-console
      console.log(`[gg-store] ← ${res.status} ${res.statusText} ${url}`)
    } catch {
      /* noop */
    }

    if (!res.ok) {
      // Try to read text for clearer error messages
      let text = ""
      try {
        text = await res.text()
      } catch {
        /* ignore */
      }
      const msg = text || res.statusText || "Request failed"
      const err = new Error(`Request failed ${res.status}: ${msg}`)

      // eslint-disable-next-line no-console
      console.error("[gg-store] ✖ error", err)
      throw err
    }

    // Parse JSON
    return (await res.json()) as T
  } catch (err: any) {
    // Network-level failure (e.g. net::ERR_CONNECTION_REFUSED) lands here
    // eslint-disable-next-line no-console
    console.error("[gg-store] ✖ fetch failed", { url, method, err })
    throw err
  }
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
  }>("/store/designs/price", {
    method: "POST",
    body: JSON.stringify(body),
  })
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
  }>("/store/designs/upload", {
    method: "POST",
    body: JSON.stringify(body),
  })
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
  // This hits our own Next API, same origin – no CORS issues.
  const url = "/api/gg/cart/set"
  try {
    // eslint-disable-next-line no-console
    console.log(`[gg-store] → POST ${url} {"cart_id":"${cartId}"}`)
  } catch {
    /* noop */
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ cart_id: cartId }),
  })

  try {
    // eslint-disable-next-line no-console
    console.log(`[gg-store] ← ${res.status} ${res.statusText} ${url}`)
  } catch {
    /* noop */
  }

  if (!res.ok) throw new Error("Failed to set cart cookie")
}
