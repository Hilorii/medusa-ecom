import "server-only"
import { cookies as nextCookies } from "next/headers"

const isProduction = process.env.NODE_ENV === "production"
/**
 * Third-party payment providers often redirect back via cross-site POST requests.
 * Use SameSite=None in production so cart/auth cookies survive that round-trip.
 * Browsers reject SameSite=None without Secure over HTTP, so fall back to Lax locally.
 */
export const sharedSameSite = (isProduction ? "none" : "lax") as
  | "lax"
  | "strict"
  | "none"

export const sharedCookieSecurity = {
  sameSite: sharedSameSite,
  secure: isProduction,
} as const

/**
 * Returns headers for server-side requests to Medusa Store API.
 * - Always attaches the publishable key as "x-publishable-api-key"
 * - Attaches "Authorization: Bearer <token>" if a JWT cookie is present
 *
 * Note:
 * - Prefer MEDUSA_PUBLISHABLE_KEY for server-side. We fallback to NEXT_PUBLIC_*
 *   for local/dev convenience if the non-public var is not set.
 */
export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const pak =
    process.env.MEDUSA_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
    ""

  try {
    const cookies = await nextCookies()
    const token = cookies.get("_medusa_jwt")?.value

    const headers: Record<string, string> = {}
    if (pak) headers["x-publishable-api-key"] = pak
    if (token) headers["authorization"] = `Bearer ${token}`

    return headers
  } catch {
    // In edge cases where reading cookies fails, still return PAK if available
    return pak ? { "x-publishable-api-key": pak } : {}
  }
}

/**
 * Returns a stable cache tag using the "_medusa_cache_id" cookie if present.
 * Use together with Next's "revalidateTag".
 */
export const getCacheTag = async (tag: string): Promise<string> => {
  try {
    const cookies = await nextCookies()
    const cacheId = cookies.get("_medusa_cache_id")?.value

    if (!cacheId) {
      return ""
    }

    return `${tag}-${cacheId}`
  } catch {
    return ""
  }
}

/**
 * Returns Next.js "next" cache options with tags if a cache id is present.
 * No-op on the client.
 */
export const getCacheOptions = async (
  tag: string
): Promise<{ tags: string[] } | {}> => {
  if (typeof window !== "undefined") {
    return {}
  }

  const cacheTag = await getCacheTag(tag)

  if (!cacheTag) {
    return {}
  }

  return { tags: [`${cacheTag}`] }
}

/**
 * Sets the Medusa auth token cookie used for authenticated store requests.
 */
export const setAuthToken = async (token: string) => {
  const cookies = await nextCookies()
  cookies.set("_medusa_jwt", token, {
    maxAge: 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
    ...sharedCookieSecurity,
    path: "/",
  })
}

/**
 * Removes the Medusa auth token cookie.
 */
export const removeAuthToken = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_jwt", "", {
    maxAge: -1,
    path: "/",
  })
}

/**
 * Reads the current cart id from the cookie used by server actions.
 */
export const getCartId = async () => {
  const cookies = await nextCookies()
  return cookies.get("_medusa_cart_id")?.value
}

/**
 * Sets the cart id cookie so server actions and SSR can read the same cart.
 */
export const setCartId = async (cartId: string) => {
  const cookies = await nextCookies()
  cookies.set("_medusa_cart_id", cartId, {
    maxAge: 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
    ...sharedCookieSecurity,
    path: "/",
  })
}

/**
 * Removes the cart id cookie (e.g., after order completion).
 */
export const removeCartId = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_cart_id", "", {
    maxAge: -1,
    path: "/",
  })
}
