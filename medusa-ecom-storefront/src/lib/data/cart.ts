"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import {
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
  getCartId,
  setCartId,
} from "./cookies"
import { getRegion } from "./regions"

/** Resolve storefront/base URL once (trim + strip trailing slash). */
function getStoreBaseUrl() {
  const RAW_BASE =
    process.env.MEDUSA_BACKEND_URL ||
    process.env.NEXT_PUBLIC_MEDUSA_URL ||
    "http://localhost:9000"
  return RAW_BASE.trim().replace(/\/+$/, "")
}

/** Prefer explicit sales channel via ENV; fall back to undefined (backend default). */
function getDefaultSalesChannelId(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SALES_CHANNEL_ID ||
    process.env.MEDUSA_SALES_CHANNEL_ID ||
    process.env.SALES_CHANNEL_ID ||
    undefined
  )
}

/** Convenience: re-fetch the latest cart from the backend. */
async function refreshCart(id: string, headers: Record<string, string>) {
  return sdk.client
    .fetch<HttpTypes.StoreCartResponse>(`/store/carts/${id}`, {
      method: "GET",
      query: {
        fields:
          "*items, *region, *items.product, *items.variant, *items.thumbnail, *items.metadata, total, subtotal, tax_total, shipping_total, shipping_subtotal, discount_total, gift_card_total, +items.total, *promotions, +shipping_methods.name, *payment_collection, +payment_collection.payment_sessions",
      },
      headers,
      cache: "no-store",
    })
    .then(({ cart }) => cart)
}

/**
 * Ensure a payment_collection exists for the given cart.
 * Tries the "current" route first, then falls back to legacy aliases to be version-agnostic.
 * Returns the (possibly re-fetched) cart with payment_collection present.
 */
async function ensurePaymentCollection(
  cart: HttpTypes.StoreCart,
  headers: Record<string, string>
): Promise<HttpTypes.StoreCart> {
  if (cart?.payment_collection?.id) {
    return cart
  }

  const BASE = getStoreBaseUrl()
  const commonHeaders: Record<string, string> = {
    "content-type": "application/json",
    ...headers,
  }

  // Try to create via multiple possible endpoints; ignore 409 if it already exists on server.
  const candidates: Array<{ url: string; body?: any }> = [
    // Newer-style cart-scoped creation
    { url: `${BASE}/store/carts/${cart.id}/payment-collections`, body: {} },
    // Direct creation with explicit cart_id
    { url: `${BASE}/store/payment-collections`, body: { cart_id: cart.id } },
    // Another legacy alias (if any)
    { url: `${BASE}/store/carts/${cart.id}/payment-collection`, body: {} },
  ]

  let created = false
  for (const c of candidates) {
    try {
      const res = await fetch(c.url, {
        method: "POST",
        headers: commonHeaders,
        cache: "no-store",
        body: JSON.stringify(c.body ?? {}),
      })
      if (res.ok || res.status === 409) {
        created = true
        break
      }
    } catch {
      // swallow and try next candidate
    }
  }

  // Regardless of creation success/failure, re-fetch to see the current state.
  const fresh = await refreshCart(cart.id, headers)
  if (fresh?.payment_collection?.id) {
    return fresh
  }

  // If creation didn't materialize, give a helpful error containing preconditions.
  if (!created) {
    throw new Error(
      "Failed to create payment_collection. Ensure email + shipping method are set and cart total > 0."
    )
  }

  throw new Error(
    "payment_collection was created but not visible on cart. Try reloading and retrying."
  )
}

/**
 * Retrieves a cart by its ID. If no ID is provided, it will use the cart ID from the cookies.
 */
export async function retrieveCart(cartId?: string) {
  const id = cartId || (await getCartId())
  if (!id) return null

  const headers = {
    ...(await getAuthHeaders()),
  }

  // carts must not be cached; they change often
  return await sdk.client
    .fetch<HttpTypes.StoreCartResponse>(`/store/carts/${id}`, {
      method: "GET",
      query: {
        fields:
          "*items, *region, *items.product, *items.variant, *items.thumbnail, *items.metadata, total, subtotal, tax_total, shipping_total, shipping_subtotal, discount_total, gift_card_total, +items.total, *promotions, +shipping_methods.name, *payment_collection, +payment_collection.payment_sessions",
      },
      headers,
      cache: "no-store",
    })
    .then(({ cart }) => cart)
    .catch(() => null)
}

export async function getOrSetCart(countryCode: string) {
  const region = await getRegion(countryCode)
  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  let cart = await retrieveCart()
  const headers = { ...(await getAuthHeaders()) }

  // Create new cart (inject sales_channel_id if available)
  if (!cart) {
    const salesChannelId = getDefaultSalesChannelId()
    const payload: HttpTypes.StoreCreateCart = {
      region_id: region.id,
      ...(salesChannelId ? { sales_channel_id: salesChannelId } : {}),
    }

    const cartResp = await sdk.store.cart.create(payload, {}, headers)
    cart = cartResp.cart

    await setCartId(cart.id)
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
  }

  // Keep region / sales channel consistent
  const updates: Partial<HttpTypes.StoreUpdateCart> = {}
  if (cart.region_id !== region.id) {
    updates.region_id = region.id
  }
  if (!cart.sales_channel_id) {
    const salesChannelId = getDefaultSalesChannelId()
    if (salesChannelId) updates.sales_channel_id = salesChannelId
  }

  if (Object.keys(updates).length) {
    await sdk.store.cart.update(cart.id, updates, {}, headers)
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
    cart = await refreshCart(cart.id, headers)
  }

  return cart
}

export async function updateCart(data: HttpTypes.StoreUpdateCart) {
  const cartId = await getCartId()
  if (!cartId) {
    throw new Error("No existing cart found, please create one before updating")
  }

  const headers = { ...(await getAuthHeaders()) }

  return sdk.store.cart
    .update(cartId, data, {}, headers)
    .then(async ({ cart }) => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)

      return cart
    })
    .catch(medusaError)
}

export async function addToCart({
  variantId,
  quantity,
  countryCode,
}: {
  variantId: string
  quantity: number
  countryCode: string
}) {
  if (!variantId) {
    throw new Error("Missing variant ID when adding to cart")
  }

  const cart = await getOrSetCart(countryCode)
  if (!cart) {
    throw new Error("Error retrieving or creating cart")
  }

  const headers = { ...(await getAuthHeaders()) }

  await sdk.store.cart
    .createLineItem(
      cart.id,
      {
        variant_id: variantId,
        quantity,
      },
      {},
      headers
    )
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)
    })
    .catch(medusaError)
}

export async function updateLineItem({
  lineId,
  quantity,
}: {
  lineId: string
  quantity: number
}) {
  if (!lineId) throw new Error("Missing lineItem ID when updating line item")

  const cartId = await getCartId()
  if (!cartId) throw new Error("Missing cart ID when updating line item")

  const headers = { ...(await getAuthHeaders()) }

  await sdk.store.cart
    .updateLineItem(cartId, lineId, { quantity }, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)
    })
    .catch(medusaError)
}

export async function deleteLineItem(lineId: string) {
  if (!lineId) throw new Error("Missing lineItem ID when deleting line item")

  const cartId = await getCartId()
  if (!cartId) throw new Error("Missing cart ID when deleting line item")

  const headers = { ...(await getAuthHeaders()) }

  // This SDK method in your setup accepts (cartId, lineId, headers)
  await sdk.store.cart
    .deleteLineItem(cartId, lineId, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)
    })
    .catch(medusaError)
}

export async function setShippingMethod({
  cartId,
  shippingMethodId,
}: {
  cartId: string
  shippingMethodId: string
}) {
  const headers = { ...(await getAuthHeaders()) }

  return sdk.store.cart
    .addShippingMethod(cartId, { option_id: shippingMethodId }, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)
    })
    .catch(medusaError)
}

/**
 * Initialize a payment session for a given provider.
 * If the cart has no payment_collection yet, it will be created automatically (multi-endpoint fallback).
 * Then it tries SDK first, and falls back to REST routes to handle differences across Medusa versions.
 */
export async function initiatePaymentSession(
  cartInput: HttpTypes.StoreCart,
  data: HttpTypes.StoreInitializePaymentSession
) {
  const headers = { ...(await getAuthHeaders()) }

  // Ensure we have a fresh cart (with payment_collection if possible)
  let cart = cartInput
  cart = await ensurePaymentCollection(cart, headers)

  // Preferred path: SDK
  try {
    const resp = await sdk.store.payment.initiatePaymentSession(
      cart,
      data,
      {},
      headers
    )
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
    return resp
  } catch (sdkErr: any) {
    // Fallback via REST (version-agnostic)
    try {
      // Make sure we still have the latest payment_collection id
      cart = await refreshCart(cart.id, headers)
      if (!cart?.payment_collection?.id) {
        throw new Error("Cart still has no payment_collection after creation.")
      }

      const paymentCollectionId = cart.payment_collection.id
      const BASE = getStoreBaseUrl()
      const commonHeaders: Record<string, string> = {
        "content-type": "application/json",
        ...headers,
      }

      // Gather provider_ids to clean previous sessions (best effort)
      const providerIds = new Set<string>()

      try {
        const res = await fetch(
          `${BASE}/store/carts/${cart.id}/payment-sessions`,
          {
            method: "GET",
            headers: commonHeaders,
            cache: "no-store",
          }
        )
        if (res.ok) {
          const json = await res.json()
          for (const s of json.payment_sessions ?? []) {
            if (s?.provider_id) providerIds.add(s.provider_id)
          }
        }
      } catch {}

      try {
        const res = await fetch(
          `${BASE}/store/payment-collections/${paymentCollectionId}?expand=payment_sessions`,
          { method: "GET", headers: commonHeaders, cache: "no-store" }
        )
        if (res.ok) {
          const json = await res.json()
          for (const s of json.payment_collection?.payment_sessions ?? []) {
            if (s?.provider_id) providerIds.add(s.provider_id)
          }
        }
      } catch {}

      for (const pid of Array.from(providerIds)) {
        const delUrls = [
          `${BASE}/store/payment-collections/${paymentCollectionId}/payment-sessions/${pid}`,
          `${BASE}/store/payment-collections/${paymentCollectionId}/sessions/${pid}`,
          `${BASE}/store/carts/${cart.id}/payment-sessions/${pid}`,
        ]
        for (const url of delUrls) {
          try {
            await fetch(url, {
              method: "DELETE",
              headers: commonHeaders,
              cache: "no-store",
            })
          } catch {}
        }
      }

      // Primary (newer) route
      const urlSingle = `${BASE}/store/payment-collections/${paymentCollectionId}/payment-sessions`
      let res = await fetch(urlSingle, {
        method: "POST",
        headers: commonHeaders,
        cache: "no-store",
        body: JSON.stringify({
          provider_id: data.provider_id,
          data: data.data ?? {},
        }),
      })

      if (res.status === 404) {
        // Try batch
        let url = `${BASE}/store/payment-collections/${paymentCollectionId}/payment-sessions/batch`
        res = await fetch(url, {
          method: "POST",
          headers: commonHeaders,
          cache: "no-store",
          body: JSON.stringify({
            sessions: [
              { provider_id: data.provider_id, data: data.data ?? {} },
            ],
          }),
        })

        if (res.status === 404) {
          // Legacy aliases
          url = `${BASE}/store/payment-collections/${paymentCollectionId}/sessions`
          res = await fetch(url, {
            method: "POST",
            headers: commonHeaders,
            cache: "no-store",
            body: JSON.stringify({
              provider_id: data.provider_id,
              data: data.data ?? {},
            }),
          })

          if (res.status === 404) {
            url = `${BASE}/store/payment-collections/${paymentCollectionId}/sessions/batch`
            res = await fetch(url, {
              method: "POST",
              headers: commonHeaders,
              cache: "no-store",
              body: JSON.stringify({
                sessions: [
                  { provider_id: data.provider_id, data: data.data ?? {} },
                ],
              }),
            })
          }
        }
      }

      if (!res.ok) {
        let text = ""
        try {
          text = await res.text()
        } catch {}
        throw new Error(
          `fallback ${res.url.replace(BASE, "")} failed ${res.status} ${
            res.statusText
          } — ${text || "Unknown"}`
        )
      }

      const payload = await res.json()
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)
      return payload
    } catch (fallbackErr: any) {
      const msg =
        fallbackErr?.message ||
        sdkErr?.message ||
        "Failed to initiate payment session"
      throw new Error(msg)
    }
  }
}

export async function applyPromotions(codes: string[]) {
  const cartId = await getCartId()
  if (!cartId) throw new Error("No existing cart found")

  const headers = { ...(await getAuthHeaders()) }

  return sdk.store.cart
    .update(cartId, { promo_codes: codes }, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)
    })
    .catch(medusaError)
}

export async function applyGiftCard(code: string) {
  const cartId = await getCartId()
  if (!cartId) throw new Error("No existing cart found")

  const headers = { ...(await getAuthHeaders()) }

  // Retrieve existing gift cards so we don't overwrite them
  const cart = await sdk.store.cart
    .retrieve(cartId, {}, headers)
    .then(({ cart }) => cart)
  // @ts-ignore
  const codes = (cart?.gift_cards || [])
    .map((gc: any) => gc.code)
    .filter((c: string | undefined): c is string => !!c)
  codes.push(code)

  return (
    sdk.store.cart
      // @ts-ignore
      .update(cartId, { gift_cards: codes }, {}, headers)
      .then(async () => {
        const cartCacheTag = await getCacheTag("carts")
        revalidateTag(cartCacheTag)

        const fulfillmentCacheTag = await getCacheTag("fulfillment")
        revalidateTag(fulfillmentCacheTag)
      })
      .catch(medusaError)
  )
}

export async function removeDiscount(code: string) {
  const cart = await retrieveCart()
  if (!cart) throw new Error("No existing cart found")

  const codes = (cart.promotions || [])
    .filter((p: any) => p.code && p.code !== code)
    .map((p: any) => p.code as string)

  return applyPromotions(codes)
}

export async function removeGiftCard(codeToRemove: string, giftCards: any[]) {
  const cartId = await getCartId()
  if (!cartId) throw new Error("No existing cart found")

  const headers = { ...(await getAuthHeaders()) }

  const codes = (giftCards || [])
    .map((gc: any) => (typeof gc === "string" ? gc : gc.code))
    .filter((c: any) => !!c && c !== codeToRemove)

  return (
    sdk.store.cart
      // @ts-ignore
      .update(cartId, { gift_cards: codes }, {}, headers)
      .then(async () => {
        const cartCacheTag = await getCacheTag("carts")
        revalidateTag(cartCacheTag)

        const fulfillmentCacheTag = await getCacheTag("fulfillment")
        revalidateTag(fulfillmentCacheTag)
      })
      .catch(medusaError)
  )
}

export async function submitPromotionForm(
  currentState: unknown,
  formData: FormData
) {
  const code = formData.get("code") as string
  try {
    await applyPromotions([code])
  } catch (e: any) {
    return e.message
  }
}

export async function setAddresses(currentState: unknown, formData: FormData) {
  try {
    if (!formData) throw new Error("No form data found when setting addresses")

    const cartId = await getCartId()
    if (!cartId)
      throw new Error("No existing cart found when setting addresses")

    const data = {
      shipping_address: {
        first_name: formData.get("shipping_address.first_name"),
        last_name: formData.get("shipping_address.last_name"),
        address_1: formData.get("shipping_address.address_1"),
        address_2: "",
        company: formData.get("shipping_address.company"),
        postal_code: formData.get("shipping_address.postal_code"),
        city: formData.get("shipping_address.city"),
        country_code: formData.get("shipping_address.country_code"),
        province: formData.get("shipping_address.province"),
        phone: formData.get("shipping_address.phone"),
      },
      email: formData.get("email"),
    } as any

    const sameAsBilling = formData.get("same_as_billing")
    if (sameAsBilling === "on") data.billing_address = data.shipping_address

    if (sameAsBilling !== "on")
      data.billing_address = {
        first_name: formData.get("billing_address.first_name"),
        last_name: formData.get("billing_address.last_name"),
        address_1: formData.get("billing_address.address_1"),
        address_2: "",
        company: formData.get("billing_address.company"),
        postal_code: formData.get("billing_address.postal_code"),
        city: formData.get("billing_address.city"),
        country_code: formData.get("billing_address.country_code"),
        province: formData.get("billing_address.province"),
        phone: formData.get("billing_address.phone"),
      }

    await updateCart(data)
  } catch (e: any) {
    return e.message
  }

  redirect(
    `/${formData.get("shipping_address.country_code")}/checkout?step=delivery`
  )
}

/**
 * Updates the countrycode param and revalidates the regions cache
 */
export async function updateRegion(countryCode: string, currentPath: string) {
  const cartId = await getCartId()
  const region = await getRegion(countryCode)
  if (!region)
    throw new Error(`Region not found for country code: ${countryCode}`)

  if (cartId) {
    await updateCart({ region_id: region.id })
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
  }

  const regionCacheTag = await getCacheTag("regions")
  revalidateTag(regionCacheTag)

  const productsCacheTag = await getCacheTag("products")
  revalidateTag(productsCacheTag)

  redirect(`/${countryCode}${currentPath}`)
}

export async function listCartOptions() {
  const cartId = await getCartId()
  const headers = { ...(await getAuthHeaders()) }
  const next = { ...(await getCacheOptions("shippingOptions")) }

  return await sdk.client.fetch<{
    shipping_options: HttpTypes.StoreCartShippingOption[]
  }>("/store/shipping-options", {
    query: { cart_id: cartId },
    next,
    headers,
    cache: "force-cache",
  })
}
