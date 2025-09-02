// All comments in English
// Client-safe cart utilities (no "use server" here).
// Used from client components like the checkout payment button.

export type CompleteCartResponse =
  | {
      type: "order"
      order: any
    }
  | {
      type: "cart"
      cart: any
    }

/**
 * Completes the cart and attempts to place the order.
 * Must be called from the client with a concrete cartId.
 *
 * Notes:
 * - Uses NEXT_PUBLIC_MEDUSA_URL to talk directly to the Medusa store API.
 * - Sends credentials to include cookies if your backend relies on them.
 */
export async function placeOrder(
  cartId: string
): Promise<CompleteCartResponse> {
  if (!cartId) {
    throw new Error("Missing cart id for placing the order")
  }

  const base = (
    process.env.NEXT_PUBLIC_MEDUSA_URL || "http://localhost:9000"
  ).replace(/\/+$/, "")

  const res = await fetch(`${base}/store/carts/${cartId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  })

  if (!res.ok) {
    let msg = `Complete cart failed: ${res.status}`
    try {
      const text = await res.text()
      if (text) msg += ` - ${text}`
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }

  // The API may return either { order, type: "order" } or { cart, type: "cart" }
  const data = (await res.json()) as CompleteCartResponse
  return data
}
