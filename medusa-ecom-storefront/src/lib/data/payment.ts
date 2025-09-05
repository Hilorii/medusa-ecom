"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders } from "./cookies"
import type { HttpTypes } from "@medusajs/types"

/**
 * Lists payment providers for a given region using the raw client.fetch,
 * so we can pass headers (publishable key, sales channel) explicitly.
 */
export const listCartPaymentMethods = async (regionId: string) => {
  if (!regionId) return []

  const headers = {
    ...(await getAuthHeaders()), // includes x-publishable-api-key (+ channel if you add it there)
  }

  const { payment_providers } =
    await sdk.client.fetch<HttpTypes.StorePaymentProviderListResponse>(
      "/store/payment-providers",
      {
        method: "GET",
        query: { region_id: regionId },
        headers,
        cache: "no-store",
      }
    )

  return (payment_providers ?? []).sort((a, b) => (a.id > b.id ? 1 : -1))
}
