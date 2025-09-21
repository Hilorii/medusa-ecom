import { updateCartWorkflow } from "@medusajs/core-flows";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError, Modules, validateEmail } from "@medusajs/framework/utils";
import { refetchCart } from "@medusajs/medusa/api/store/carts/helpers";
import type { StoreUpdateCartType } from "@medusajs/medusa/api/store/carts/validators";
import type { CustomerDTO } from "@medusajs/types";
import {
  ggConvertEurToCurrencyAmount,
  ggConvertEurToMinorUnits,
  ggGetFxRate,
  ggNormalizeCurrency,
} from "../../../../lib/gg-pricing";

type StoreUpdateCartRequestBody = StoreUpdateCartType & {
  additional_data?: Record<string, unknown>;
};

const DUPLICATE_GUEST_FRAGMENT = "has_account: false";

type CustomLineItemSnapshot = {
  id: string;
  title: string;
  quantity: number;
  unit_price: number | null;
  metadata: Record<string, unknown> | null;
  product_id?: string | null;
  product_title?: string | null;
  product_description?: string | null;
  product_subtitle?: string | null;
  subtitle?: string | null;
  thumbnail?: string | null;
  variant_id?: string | null;
  variant_title?: string | null;
  variant_sku?: string | null;
  requires_shipping?: boolean | null;
  sales_channel_id?: string | null;
};

type ShippingAddressSnapshot = Record<string, unknown> | null;

const SHIPPING_ADDRESS_FIELDS: Array<string> = [
  "first_name",
  "last_name",
  "company",
  "address_1",
  "address_2",
  "postal_code",
  "city",
  "province",
  "phone",
  "country_code",
  "metadata",
];

async function prepareCustomItemsForRegionChange({
  cartModule,
  items,
}: {
  cartModule: any;
  items: CustomLineItemSnapshot[];
}) {
  const updates = items
    .filter((item) => item?.id)
    .map((item) => {
      const update: Record<string, unknown> = {
        id: item.id,
        is_custom_price: false,
      };

      if (item?.variant_id) {
        update.variant_id = null;
      }

      return update;
    });

  if (!updates.length) {
    return;
  }

  await cartModule.updateLineItems(updates as any);
}

async function restoreCustomItemsFromSnapshots({
  cartModule,
  snapshots,
  reattachVariants = true,
}: {
  cartModule: any;
  snapshots: CustomLineItemSnapshot[];
  reattachVariants?: boolean;
}) {
  const updates = snapshots
    .filter((item) => item?.id)
    .map((item) => {
      const update: Record<string, unknown> = {
        id: item.id,
        is_custom_price: true,
      };

      if (reattachVariants && typeof item.variant_id === "string") {
        update.variant_id = item.variant_id;
      }

      if (
        typeof item.unit_price === "number" &&
        Number.isFinite(item.unit_price)
      ) {
        update.unit_price = item.unit_price;
      }

      if (item.metadata) {
        update.metadata = cloneMetadata(item.metadata);
      }

      return update;
    });

  if (!updates.length) {
    return;
  }

  try {
    await cartModule.updateLineItems(updates as any);
  } catch {
    // If restoring fails there's nothing else we can do.
  }
}

function isGuestEmailConflictError(error: unknown): error is MedusaError {
  if (!MedusaError.isMedusaError(error)) {
    return false;
  }

  if (error.type !== MedusaError.Types.INVALID_DATA) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("customer with email") &&
    message.includes(DUPLICATE_GUEST_FRAGMENT)
  );
}

async function resolveGuestEmailConflict(
  error: unknown,
  req: MedusaRequest,
  email?: string,
): Promise<boolean> {
  if (!isGuestEmailConflictError(error) || !email) {
    return false;
  }

  const customerModule = req.scope.resolve(Modules.CUSTOMER) as {
    listCustomers: (
      selector: Record<string, unknown>,
    ) => Promise<CustomerDTO[]>;
  };

  const customers = await customerModule.listCustomers({ email });
  const guest = customers.find((customer) => !customer.has_account);

  if (!guest) {
    return false;
  }

  const cartModule = req.scope.resolve(Modules.CART) as {
    updateCarts: (
      data: Array<{ id: string; customer_id: string; email: string }>,
    ) => Promise<unknown>;
  };

  await cartModule.updateCarts([
    {
      id: req.params.id,
      customer_id: guest.id,
      email,
    },
  ]);

  return true;
}

function isVariantPriceMissingError(error: unknown): boolean {
  const message = (() => {
    if (MedusaError.isMedusaError(error)) {
      return error.message;
    }

    if (error && typeof error === "object" && "message" in error) {
      return String((error as Record<string, unknown>).message ?? "");
    }

    if (typeof error === "string") {
      return error;
    }

    return "";
  })()
    .toString()
    .toLowerCase();

  if (!message) {
    return false;
  }

  return (
    message.includes("do not have a price") ||
    message.includes("does not have a price")
  );
}

async function resolveVariantPricingError({
  error,
  cartModule,
  snapshots,
}: {
  error: unknown;
  cartModule: any;
  snapshots: CustomLineItemSnapshot[];
}): Promise<boolean> {
  if (!isVariantPriceMissingError(error)) {
    return false;
  }

  const updates = snapshots
    .filter((item) => item?.id && typeof item.variant_id === "string")
    .map((item) => {
      const metadata = cloneMetadata(item.metadata);

      if (metadata && typeof item.variant_id === "string") {
        const metadataRecord = metadata as Record<string, unknown>;
        if (typeof metadataRecord.variant_id !== "string") {
          metadataRecord.variant_id = item.variant_id;
        }
      }

      return {
        id: item.id,
        variant_id: null,
        is_custom_price: true,
        ...(metadata ? { metadata } : {}),
      };
    });

  if (!updates.length) {
    return false;
  }

  try {
    await cartModule.updateLineItems(updates as any);
  } catch {
    return false;
  }

  return true;
}

function cloneMetadata(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(metadata));
  } catch {
    return { ...(metadata as Record<string, unknown>) };
  }
}

// gg: Re-attach custom item variants after region change, keeping metadata in sync
async function reattachCustomItemVariants({
  cartId,
  cart,
  snapshots,
  cartModule,
  scope,
  fields,
}: {
  cartId: string;
  cart: any;
  snapshots: CustomLineItemSnapshot[];
  cartModule: any;
  scope: MedusaRequest["scope"];
  fields: any;
}) {
  if (!snapshots?.length) {
    return cart;
  }

  const effectiveCartId = cart?.id ?? cartId;
  if (!effectiveCartId) {
    return cart;
  }

  const desiredVariants = new Map<string, string>();
  for (const snapshot of snapshots) {
    if (!snapshot?.id || typeof snapshot.variant_id !== "string") {
      continue;
    }
    desiredVariants.set(snapshot.id, snapshot.variant_id);
  }

  if (!desiredVariants.size) {
    return cart;
  }

  const updates: Array<Record<string, unknown>> = [];

  for (const item of cart?.items ?? []) {
    if (!item?.id) {
      continue;
    }

    const desiredVariantId = desiredVariants.get(item.id);
    if (!desiredVariantId) {
      // gg: If custom line has no variant, ensure shipping is skipped
      const update: Record<string, unknown> = { id: item.id };
      const md = cloneMetadata(item.metadata) || {};
      if (typeof (md as any).requires_shipping !== "boolean") {
        (md as any).requires_shipping = false;
        update.metadata = md;
        updates.push(update);
      }
      continue;
    }

    let needsUpdate = false;
    const update: Record<string, unknown> = { id: item.id };

    if (item.variant_id !== desiredVariantId) {
      update.variant_id = desiredVariantId;
      needsUpdate = true;
    }

    if (item.is_custom_price !== true) {
      update.is_custom_price = true;
      needsUpdate = true;
    }

    const metadata = cloneMetadata(item.metadata);
    if (!metadata) {
      update.metadata = { variant_id: desiredVariantId };
      needsUpdate = true;
    } else {
      const metadataRecord = metadata as Record<string, unknown>;
      const currentVariant =
        typeof metadataRecord["variant_id"] === "string"
          ? (metadataRecord["variant_id"] as string)
          : undefined;

      if (currentVariant !== desiredVariantId) {
        update.metadata = { ...metadataRecord, variant_id: desiredVariantId };
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      updates.push(update);
    }
  }

  if (!updates.length) {
    return cart;
  }

  try {
    await cartModule.updateLineItems(updates as any);
  } catch {
    return cart;
  }

  const refreshed = await refetchCart(effectiveCartId, scope, fields);
  return refreshed ?? cart;
}

function cloneShippingAddress(address: unknown): ShippingAddressSnapshot {
  if (!address || typeof address !== "object") {
    return null;
  }

  const source = address as Record<string, unknown>;
  const snapshot: Record<string, unknown> = {};

  for (const field of SHIPPING_ADDRESS_FIELDS) {
    if (!(field in source)) {
      continue;
    }

    if (field === "metadata") {
      const metadata = cloneMetadata(source[field]);
      if (metadata) {
        snapshot[field] = metadata;
      }
      continue;
    }

    const value = source[field];
    if (typeof value === "undefined") {
      continue;
    }

    if (typeof value === "string") {
      snapshot[field] = value;
      continue;
    }

    snapshot[field] = value === null ? null : value;
  }

  return Object.keys(snapshot).length ? snapshot : null;
}

function mergeShippingAddressSnapshots(
  previous: ShippingAddressSnapshot,
  next: ShippingAddressSnapshot,
  options?: { skipFields?: string[] },
): { merged: ShippingAddressSnapshot; changed: boolean } {
  if (!previous && !next) {
    return { merged: null, changed: false };
  }

  if (!next) {
    if (!previous) {
      return { merged: null, changed: false };
    }

    return { merged: { ...previous }, changed: true };
  }

  const merged: Record<string, unknown> = { ...next };
  let changed = false;

  const skip = new Set(options?.skipFields ?? []);

  if (previous) {
    for (const field of SHIPPING_ADDRESS_FIELDS) {
      if (skip.has(field)) {
        continue;
      }

      if (!(field in previous)) {
        continue;
      }

      if (field === "metadata") {
        if (!merged[field] && previous[field]) {
          const metadata = cloneMetadata(previous[field]);
          if (metadata) {
            merged[field] = metadata;
            changed = true;
          }
        }
        continue;
      }

      const nextValue = merged[field];
      if (
        typeof nextValue === "undefined" ||
        nextValue === null ||
        (typeof nextValue === "string" && nextValue.trim() === "")
      ) {
        const previousValue = previous[field];
        if (
          typeof previousValue !== "undefined" &&
          previousValue !== null &&
          !(typeof previousValue === "string" && previousValue.trim() === "")
        ) {
          merged[field] = previousValue;
          changed = true;
        }
      }
    }
  }

  return { merged, changed };
}

function snapshotCustomLineItems(cart: any): CustomLineItemSnapshot[] {
  if (!cart?.items?.length) {
    return [];
  }

  const snapshots: CustomLineItemSnapshot[] = [];

  for (const item of cart.items) {
    if (!item?.id || !item.is_custom_price) {
      continue;
    }

    const quantity = Number(item.quantity);
    snapshots.push({
      id: item.id,
      title: typeof item.title === "string" ? item.title : "Custom item",
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      unit_price:
        typeof item.unit_price === "number" && Number.isFinite(item.unit_price)
          ? item.unit_price
          : null,
      metadata: cloneMetadata(item.metadata),
      product_id: item.product_id ?? null,
      product_title: item.product_title ?? null,
      product_description: item.product_description ?? null,
      product_subtitle: item.product_subtitle ?? null,
      subtitle: item.subtitle ?? null,
      thumbnail: item.thumbnail ?? null,
      variant_id: item.variant_id ?? null,
      variant_title: item.variant_title ?? null,
      variant_sku: item.variant_sku ?? null,
      requires_shipping:
        typeof item.requires_shipping === "boolean"
          ? item.requires_shipping
          : null,
      sales_channel_id: item.sales_channel_id ?? null,
    });
  }

  return snapshots;
}

async function restoreCustomItemsForRegionChange({
  cartId,
  cart,
  targetRegionId,
  snapshots,
  cartModule,
  regionModule,
  scope,
  fields,
}: {
  cartId: string;
  cart: any;
  targetRegionId?: string;
  snapshots: CustomLineItemSnapshot[];
  cartModule: any;
  regionModule: any;
  scope: MedusaRequest["scope"];
  fields: any;
}): Promise<any> {
  if (!snapshots?.length) {
    return cart;
  }

  const effectiveCartId = cart?.id ?? cartId;
  if (!effectiveCartId) {
    return cart;
  }

  const regionId = targetRegionId ?? cart?.region_id;
  if (!regionId) {
    return cart;
  }

  let region: any;
  try {
    region = await regionModule.retrieveRegion(regionId);
  } catch {
    return cart;
  }

  const currency = ggNormalizeCurrency(region?.currency_code);
  if (!currency) {
    return cart;
  }

  const rate = ggGetFxRate(currency);
  const existingItemIds = new Set<string>(
    (cart?.items ?? [])
      .map((item: any) =>
        item?.id && typeof item.id === "string" ? item.id : undefined,
      )
      .filter((id): id is string => typeof id === "string"),
  );
  const updates: Array<any> = [];

  for (const snapshot of snapshots) {
    if (!snapshot?.id || !existingItemIds.has(snapshot.id)) {
      continue;
    }

    const metadataSource: Record<string, unknown> = snapshot.metadata
      ? { ...snapshot.metadata }
      : {};
    const breakdown: any = (metadataSource as any)?.breakdown;

    let totalEur: number | null = null;
    const breakdownTotal = breakdown?.total_eur;
    if (typeof breakdownTotal === "number" && Number.isFinite(breakdownTotal)) {
      totalEur = breakdownTotal;
    } else if (
      typeof snapshot.unit_price === "number" &&
      Number.isFinite(snapshot.unit_price)
    ) {
      const previousCurrency = metadataSource["currency"];
      if (
        typeof previousCurrency === "string" &&
        previousCurrency.toUpperCase() === "EUR"
      ) {
        totalEur = snapshot.unit_price;
      }
    }

    const metadata: Record<string, unknown> = {
      ...metadataSource,
      currency,
      fx_rate: rate,
    };

    if (
      typeof snapshot.variant_id === "string" &&
      typeof (metadata as any).variant_id !== "string"
    ) {
      (metadata as any).variant_id = snapshot.variant_id;
    }

    if (!("breakdown" in metadata) && totalEur !== null) {
      (metadata as any)["breakdown"] = { total_eur: totalEur };
    } else if (
      (metadata as any)["breakdown"] &&
      typeof (metadata as any)["breakdown"] === "object" &&
      totalEur !== null
    ) {
      ((metadata as any)["breakdown"] as Record<string, unknown>)["total_eur"] =
        totalEur;
    }

    const update: Record<string, unknown> = {
      id: snapshot.id,
      is_custom_price: true,
      metadata,
    };

    // gg: Re-attach variant if snapshot had it
    if (typeof snapshot.variant_id === "string") {
      update.variant_id = snapshot.variant_id;
    }

    if (totalEur !== null) {
      const convertedUnit = ggConvertEurToCurrencyAmount(totalEur, currency);
      const unitMinor = ggConvertEurToMinorUnits(totalEur, currency);
      const qtyForMinor =
        typeof snapshot.quantity === "number" &&
        Number.isFinite(snapshot.quantity)
          ? snapshot.quantity
          : 1;

      update.unit_price = convertedUnit;
      metadata.unit_price_minor = unitMinor;
      metadata.subtotal_minor = unitMinor * qtyForMinor;
    } else if (
      typeof snapshot.unit_price === "number" &&
      Number.isFinite(snapshot.unit_price)
    ) {
      update.unit_price = snapshot.unit_price;
    }

    // gg: If this is a pure custom line (no variant), make sure shipping is skipped
    if (typeof snapshot.variant_id !== "string") {
      const md = (update.metadata as Record<string, unknown>) || {};
      if (typeof (md as any).requires_shipping !== "boolean") {
        (md as any).requires_shipping = false;
      }
      update.metadata = md;
    }

    updates.push(update);
  }

  if (!updates.length) {
    await restoreCustomItemsFromSnapshots({
      cartModule,
      snapshots,
      reattachVariants: false,
    });
    const refreshedFallback = await refetchCart(effectiveCartId, scope, fields);
    return refreshedFallback ?? cart;
  }

  try {
    await cartModule.updateLineItems(updates as any);
  } catch (error) {
    const handledVariantPricing = await resolveVariantPricingError({
      error,
      cartModule,
      snapshots,
    });

    if (!handledVariantPricing) {
      throw error;
    }
  }

  const refreshed = await refetchCart(effectiveCartId, scope, fields);
  return refreshed ?? cart;
}

async function repriceCustomItemsForRegion({
  cart,
  cartModule,
  regionModule,
  scope,
  fields,
}: {
  cart: any;
  cartModule: any;
  regionModule: any;
  scope: MedusaRequest["scope"];
  fields: any;
}) {
  if (!cart?.id || !cart.region_id) {
    return cart;
  }

  let region: any;
  try {
    region = await regionModule.retrieveRegion(cart.region_id);
  } catch {
    return cart;
  }

  const currency = ggNormalizeCurrency(region?.currency_code);
  if (!currency) {
    return cart;
  }

  const rate = ggGetFxRate(currency);
  const updates: Array<any> = [];

  for (const item of cart.items ?? []) {
    if (!item?.id || !item.is_custom_price) {
      continue;
    }

    const metadata = { ...(item.metadata || {}) };
    const breakdown: any = (metadata as any).breakdown;
    const totalEur = breakdown?.total_eur;
    if (typeof totalEur !== "number" || !Number.isFinite(totalEur)) {
      // gg: If custom line has no breakdown and also no variant, ensure shipping is skipped
      if (!item.variant_id) {
        const md = { ...(item.metadata || {}) };
        if (typeof (md as any).requires_shipping !== "boolean") {
          (md as any).requires_shipping = false;
          updates.push({
            id: item.id,
            is_custom_price: true,
            metadata: md,
          });
        }
      }
      continue;
    }

    const nextUnitPrice = ggConvertEurToCurrencyAmount(totalEur, currency);
    const nextUnitMinor = ggConvertEurToMinorUnits(totalEur, currency);
    const currentCurrency =
      typeof (metadata as any).currency === "string"
        ? (metadata as any).currency.toUpperCase()
        : undefined;

    if (nextUnitPrice === item.unit_price && currentCurrency === currency) {
      // gg: still ensure requires_shipping=false for pure custom
      if (!item.variant_id) {
        const md = { ...(item.metadata || {}) };
        if (typeof (md as any).requires_shipping !== "boolean") {
          (md as any).requires_shipping = false;
          updates.push({
            id: item.id,
            is_custom_price: true,
            metadata: md,
          });
        }
      }
      continue;
    }

    if (
      typeof item.variant_id === "string" &&
      typeof (metadata as any).variant_id !== "string"
    ) {
      (metadata as any).variant_id = item.variant_id;
    }

    const update: Record<string, unknown> = {
      id: item.id,
      unit_price: nextUnitPrice,
      is_custom_price: true,
      metadata: {
        ...metadata,
        currency,
        fx_rate: rate,
      },
    };

    const metadataRecord = update.metadata as Record<string, unknown>;
    metadataRecord.unit_price_minor = nextUnitMinor;
    metadataRecord.subtotal_minor =
      nextUnitMinor * (Number(item.quantity) || 1);

    if (typeof item.variant_id === "string") {
      update.variant_id = item.variant_id;
    } else {
      // gg: Explicitly mark non-variant customs as non-shippable
      const md = (update.metadata as Record<string, unknown>) || {};
      if (typeof (md as any).requires_shipping !== "boolean") {
        (md as any).requires_shipping = false;
      }
      update.metadata = md;
    }

    updates.push(update);
  }

  if (!updates.length) {
    return cart;
  }

  await cartModule.updateLineItems(updates as any);

  const refreshed = await refetchCart(cart.id, scope, fields);
  return refreshed ?? cart;
}

async function restoreShippingAddressAfterRegionChange({
  cart,
  cartModule,
  previousShippingAddress,
  scope,
  fields,
}: {
  cart: any;
  cartModule: any;
  previousShippingAddress: ShippingAddressSnapshot;
  scope: MedusaRequest["scope"];
  fields: any;
}) {
  if (!cart?.id || !previousShippingAddress) {
    return cart;
  }

  const currentSnapshot = cloneShippingAddress(cart.shipping_address);
  const { merged, changed } = mergeShippingAddressSnapshots(
    previousShippingAddress,
    currentSnapshot,
    { skipFields: ["country_code", "province"] },
  );

  if (!changed || !merged) {
    return cart;
  }

  try {
    await cartModule.updateCarts([
      {
        id: cart.id,
        shipping_address: merged,
      },
    ]);
  } catch {
    return cart;
  }

  const refreshed = await refetchCart(cart.id, scope, fields);
  return refreshed ?? { ...cart, shipping_address: merged };
}

// gg: Force-hydrate cart with all relations required by shipping validation
async function ggHydrateCartWithRelations({
  cartId,
  cartModule,
}: {
  cartId: string;
  cartModule: any;
}) {
  try {
    const hydrated = await cartModule.retrieveCart(cartId, {
      relations: [
        "region",
        "billing_address",
        "shipping_address",
        "items",
        "items.variant",
        "items.variant.product", // critical for validate-shipping
        "items.adjustments",
        "shipping_methods",
        "payment_collection",
      ],
    });
    return hydrated;
  } catch {
    return null;
  }
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const cart = await refetchCart(
    req.params.id,
    req.scope,
    req.queryConfig.fields,
  );

  res.json({ cart });
};

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = req.validatedBody as StoreUpdateCartRequestBody;
  const normalizedEmail =
    typeof body.email === "string" ? validateEmail(body.email) : body.email;

  const cartModule = req.scope.resolve(Modules.CART);
  const regionModule = req.scope.resolve(Modules.REGION);

  let previousRegionId: string | undefined;
  let previousCustomItems: CustomLineItemSnapshot[] = [];
  let previousShippingAddress: ShippingAddressSnapshot = null;
  try {
    const existing = await cartModule.retrieveCart(req.params.id, {
      relations: ["items", "shipping_address"],
    });
    previousRegionId = existing?.region_id;
    previousCustomItems = snapshotCustomLineItems(existing);
    previousShippingAddress = cloneShippingAddress(existing?.shipping_address);
  } catch {
    previousRegionId = undefined;
    previousCustomItems = [];
    previousShippingAddress = null;
  }

  const workflowInput = {
    ...body,
    ...(typeof normalizedEmail !== "undefined"
      ? { email: normalizedEmail }
      : {}),
    id: req.params.id,
  };

  const runUpdateCart = () =>
    updateCartWorkflow(req.scope).run({
      // @ts-ignore
      input: workflowInput,
    });

  const requestedRegionId =
    typeof body.region_id === "string" ? body.region_id : undefined;
  const regionWillChange =
    typeof requestedRegionId === "string" &&
    (!!previousRegionId ? requestedRegionId !== previousRegionId : true);

  if (regionWillChange && previousCustomItems.length) {
    await prepareCustomItemsForRegionChange({
      cartModule,
      items: previousCustomItems,
    });
  }

  let updateSuccessful = false;
  let lastError: unknown = null;

  try {
    let attempts = 0;
    const maxAttempts = 3 + previousCustomItems.length;

    while (attempts < maxAttempts && !updateSuccessful) {
      attempts += 1;

      try {
        await runUpdateCart();
        updateSuccessful = true;
      } catch (error) {
        lastError = error;

        const handledGuest = await resolveGuestEmailConflict(
          error,
          req,
          typeof normalizedEmail === "string" ? normalizedEmail : undefined,
        );

        if (handledGuest) {
          continue;
        }

        const handledVariantPricing = await resolveVariantPricingError({
          error,
          cartModule,
          snapshots: previousCustomItems,
        });

        if (handledVariantPricing) {
          continue;
        }

        throw error;
      }
    }

    if (!updateSuccessful) {
      throw lastError ?? new Error("Failed to update cart");
    }
  } finally {
    if (!updateSuccessful && regionWillChange && previousCustomItems.length) {
      await restoreCustomItemsFromSnapshots({
        cartModule,
        snapshots: previousCustomItems,
      });
    }
  }

  let cart = await refetchCart(
    req.params.id,
    req.scope,
    req.queryConfig.fields,
  );

  const regionChanged =
    typeof body.region_id === "string" &&
    (!!previousRegionId ? body.region_id !== previousRegionId : true);

  if (regionChanged) {
    if (previousCustomItems.length) {
      cart = await restoreCustomItemsForRegionChange({
        cartId: req.params.id,
        cart,
        targetRegionId:
          typeof body.region_id === "string" ? body.region_id : undefined,
        snapshots: previousCustomItems,
        cartModule,
        regionModule,
        scope: req.scope,
        fields: req.queryConfig.fields,
      });
    }

    if (cart?.items?.length) {
      cart = await repriceCustomItemsForRegion({
        cart,
        cartModule,
        regionModule,
        scope: req.scope,
        fields: req.queryConfig.fields,
      });
    }

    if (previousShippingAddress) {
      cart = await restoreShippingAddressAfterRegionChange({
        cart,
        cartModule,
        previousShippingAddress,
        scope: req.scope,
        fields: req.queryConfig.fields,
      });
    }
  }

  if (previousCustomItems.length) {
    cart = await reattachCustomItemVariants({
      cartId: req.params.id,
      cart,
      snapshots: previousCustomItems,
      cartModule,
      scope: req.scope,
      fields: req.queryConfig.fields,
    });
  }

  // gg: Final hydration to ensure variant.product is present for shipping validation
  try {
    const hydrated = await ggHydrateCartWithRelations({
      cartId: req.params.id,
      cartModule,
    });
    if (hydrated) {
      cart = hydrated;
    }
  } catch {
    // ignore; cart still valid with defensive flags on custom lines
  }

  res.status(200).json({ cart });
};
