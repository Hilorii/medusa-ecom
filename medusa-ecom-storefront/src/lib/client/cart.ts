// Client-safe cart utilities used from client components (e.g., checkout button).
// This file talks directly to Medusa Store API using publishable key headers.

export type CompleteCartResponse =
  | { type: "order"; order: any }
  | { type: "cart"; cart: any }

type StoreShippingOption = {
  id: string
  profile_id: string
  // Price fields vary by provider/version; keep it permissive.
  calculated_price?: { calculated_amount?: number; amount?: number }
  amount?: number
}

type StoreCart = {
  id: string
  total?: number
  total_amount?: number
  region_id?: string
  shipping_address?: { country_code?: string | null } | null
  shipping_methods?: Array<{
    shipping_option_id?: string
    shipping_option?: { id: string }
  }>
}

// ----------------------- shared helpers -----------------------

function baseUrl() {
  // Reads the backend URL from a NEXT_PUBLIC_ env so it's embedded client-side.
  return (
    process.env.NEXT_PUBLIC_MEDUSA_URL ||
    process.env.MEDUSA_BACKEND_URL ||
    "http://127.0.0.1:9000"
  ).replace(/\/+$/, "")
}

function storeHeaders(): Record<string, string> {
  // Always include the publishable key on /store requests.
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  const pak = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
  if (pak) headers["x-publishable-api-key"] = pak
  return headers
}

function optionPrice(o: StoreShippingOption) {
  // Try multiple fields without relying on a strict schema.
  return (
    o.calculated_price?.calculated_amount ??
    o.calculated_price?.amount ??
    o.amount ??
    Number.MAX_SAFE_INTEGER
  )
}

// ----------------------- cart fetchers -----------------------

async function getCart(cartId: string): Promise<StoreCart> {
  const res = await fetch(`${baseUrl()}/store/carts/${cartId}`, {
    method: "GET",
    headers: storeHeaders(),
    credentials: "include",
  })
  if (!res.ok) {
    const t = await res.text().catch(() => "")
    throw new Error(`Retrieve cart failed: ${res.status}${t ? " - " + t : ""}`)
  }
  const { cart } = (await res.json()) as { cart: StoreCart }
  return cart
}

async function listShippingOptions(
  cartId: string
): Promise<StoreShippingOption[]> {
  const res = await fetch(
    `${baseUrl()}/store/shipping-options?cart_id=${cartId}`,
    {
      method: "GET",
      headers: storeHeaders(),
      credentials: "include",
    }
  )
  if (!res.ok) {
    const t = await res.text().catch(() => "")
    throw new Error(
      `List shipping options failed: ${res.status}${t ? " - " + t : ""}`
    )
  }
  const data = await res.json()
  return (data.shipping_options ?? data) as StoreShippingOption[]
}

async function addShippingMethod(cartId: string, optionId: string, data?: any) {
  const res = await fetch(
    `${baseUrl()}/store/carts/${cartId}/shipping-methods`,
    {
      method: "POST",
      headers: storeHeaders(),
      credentials: "include",
      body: JSON.stringify({ option_id: optionId, data: data ?? {} }),
    }
  )
  if (!res.ok) {
    const t = await res.text().catch(() => "")
    throw new Error(
      `Add shipping method failed: ${res.status}${t ? " - " + t : ""}`
    )
  }
}

// Public helper for quick diagnostics in dev tools.
export async function debugCartShipping(cartId: string) {
  const cart = await getCart(cartId)
  const options = await listShippingOptions(cartId)

  const requiredProfiles = Array.from(new Set(options.map((o) => o.profile_id)))
  const optionProfileById = new Map(options.map((o) => [o.id, o.profile_id]))

  const covered = new Set<string>()
  for (const m of cart.shipping_methods ?? []) {
    const sid = m.shipping_option_id ?? m.shipping_option?.id
    const pid = sid ? optionProfileById.get(sid) : undefined
    if (pid) covered.add(pid)
  }

  return {
    region_id: cart.region_id,
    shipping_address_country: cart.shipping_address?.country_code,
    requiredProfiles,
    coveredProfiles: Array.from(covered),
    missingProfiles: requiredProfiles.filter((p) => !covered.has(p)),
    optionsPerProfile: requiredProfiles.reduce<Record<string, number>>(
      (acc, p) => {
        acc[p] = options.filter((o) => o.profile_id === p).length
        return acc
      },
      {}
    ),
  }
}

// Ensure at least one shipping method is attached for every shipping profile.
async function ensureMethodsForAllProfiles(cartId: string) {
  const cart = await getCart(cartId)

  // Shipping options depend on the shipping address (at least country).
  if (!cart.shipping_address?.country_code) {
    throw new Error(
      "Shipping address (with country_code) is required before placing the order."
    )
  }

  const options = await listShippingOptions(cartId)
  if (!options.length) {
    throw new Error(
      "No shipping options available for this cart. Check region, country_code, and Shipping Options in the Admin."
    )
  }

  // Group options by profile_id
  const byProfile = new Map<string, StoreShippingOption[]>()
  for (const o of options) {
    const list = byProfile.get(o.profile_id) ?? []
    list.push(o)
    byProfile.set(o.profile_id, list)
  }

  // Mark already covered profiles using current shipping methods
  const optionProfileById = new Map(options.map((o) => [o.id, o.profile_id]))
  const covered = new Set<string>()
  for (const m of cart.shipping_methods ?? []) {
    const sid = m.shipping_option_id ?? m.shipping_option?.id
    const pid = sid ? optionProfileById.get(sid) : undefined
    if (pid) covered.add(pid)
  }

  // Add the cheapest option for each uncovered profile
  const missingWithoutOptions: string[] = []
  // @ts-ignore
  for (const [profileId, opts] of byProfile.entries()) {
    if (covered.has(profileId)) continue
    if (!opts.length) {
      missingWithoutOptions.push(profileId)
      continue
    }
    const cheapest = [...opts].sort(
      (a, b) => optionPrice(a) - optionPrice(b)
    )[0]
    await addShippingMethod(cartId, cheapest.id)
  }

  if (missingWithoutOptions.length) {
    throw new Error(
      `Some shipping profiles have no options in this region: ${missingWithoutOptions.join(
        ", "
      )}. Add Shipping Options for these profiles or adjust the region/country.`
    )
  }
}

// ----------------------- public API -----------------------

/**
 * Completes the cart safely:
 * - ensures a shipping method exists for every shipping profile,
 *  * - completes the cart (places order or returns updated cart).
 */
export async function placeOrder(
  cartId: string
): Promise<CompleteCartResponse> {
  if (!cartId) throw new Error("Missing cart id for placing the order")

  // 1) Shipping coverage
  await ensureMethodsForAllProfiles(cartId)

  // 2) Complete
  const res = await fetch(`${baseUrl()}/store/carts/${cartId}/complete`, {
    method: "POST",
    headers: storeHeaders(),
    credentials: "include",
  })

  if (!res.ok) {
    let msg = `Complete cart failed: ${res.status}`
    try {
      const text = await res.text()
      if (text) msg += ` - ${text}`
    } catch {}
    throw new Error(msg)
  }

  const data = (await res.json()) as CompleteCartResponse

  if (data.type === "order") {
    try {
      await fetch("/api/gg/cart/reset", { method: "POST" })
    } catch {
      /* ignore cookie reset failures */
    }
  }

  return data
}
