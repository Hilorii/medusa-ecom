import { updateCartWorkflow } from "@medusajs/core-flows";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError, Modules, validateEmail } from "@medusajs/framework/utils";
import { refetchCart } from "@medusajs/medusa/api/store/carts/helpers";
import type { StoreUpdateCartType } from "@medusajs/medusa/api/store/carts/validators";
import type { CustomerDTO } from "@medusajs/types";
import {
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
  const itemsToAdd: Array<any> = [];

  for (const snapshot of snapshots) {
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
        totalEur = snapshot.unit_price / 100;
      }
    }

    if (totalEur === null) {
      continue;
    }

    const unitPrice = ggConvertEurToMinorUnits(totalEur, currency);
    const quantity = snapshot.quantity > 0 ? snapshot.quantity : 1;
    const metadata: Record<string, unknown> = {
      ...metadataSource,
      currency,
      fx_rate: rate,
    };

    if (!("breakdown" in metadata) && totalEur !== null) {
      metadata["breakdown"] = { total_eur: totalEur };
    } else if (
      metadata["breakdown"] &&
      typeof metadata["breakdown"] === "object" &&
      totalEur !== null
    ) {
      (metadata["breakdown"] as Record<string, unknown>)["total_eur"] =
        totalEur;
    }

    if (snapshot.id) {
      metadata["previous_line_item_id"] = snapshot.id;
    }

    itemsToAdd.push({
      title: snapshot.title || "Custom item",
      quantity,
      unit_price: unitPrice,
      is_custom_price: true,
      metadata,
      ...(snapshot.subtitle ? { subtitle: snapshot.subtitle } : {}),
      ...(snapshot.thumbnail ? { thumbnail: snapshot.thumbnail } : {}),
      ...(snapshot.product_id ? { product_id: snapshot.product_id } : {}),
      ...(snapshot.product_title
        ? { product_title: snapshot.product_title }
        : {}),
      ...(snapshot.product_description
        ? { product_description: snapshot.product_description }
        : {}),
      ...(snapshot.product_subtitle
        ? { product_subtitle: snapshot.product_subtitle }
        : {}),
      ...(snapshot.variant_id ? { variant_id: snapshot.variant_id } : {}),
      ...(snapshot.variant_title
        ? { variant_title: snapshot.variant_title }
        : {}),
      ...(snapshot.variant_sku ? { variant_sku: snapshot.variant_sku } : {}),
      ...(typeof snapshot.requires_shipping === "boolean"
        ? { requires_shipping: snapshot.requires_shipping }
        : {}),
      ...(snapshot.sales_channel_id
        ? { sales_channel_id: snapshot.sales_channel_id }
        : {}),
    });
  }

  if (!itemsToAdd.length) {
    return cart;
  }

  await cartModule.addLineItems(effectiveCartId, itemsToAdd as any);

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
    const breakdown: any = metadata.breakdown;
    const totalEur = breakdown?.total_eur;
    if (typeof totalEur !== "number" || !Number.isFinite(totalEur)) {
      continue;
    }

    const nextUnitPrice = ggConvertEurToMinorUnits(totalEur, currency);
    const currentCurrency =
      typeof metadata.currency === "string"
        ? metadata.currency.toUpperCase()
        : undefined;

    if (nextUnitPrice === item.unit_price && currentCurrency === currency) {
      continue;
    }

    updates.push({
      id: item.id,
      unit_price: nextUnitPrice,
      is_custom_price: true,
      metadata: {
        ...metadata,
        currency,
        fx_rate: rate,
      },
    });
  }

  if (!updates.length) {
    return cart;
  }

  await cartModule.updateLineItems(updates as any);

  const refreshed = await refetchCart(cart.id, scope, fields);
  return refreshed ?? cart;
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
  try {
    const existing = await cartModule.retrieveCart(req.params.id, {
      relations: ["items"],
    });
    previousRegionId = existing?.region_id;
    previousCustomItems = snapshotCustomLineItems(existing);
  } catch {
    previousRegionId = undefined;
    previousCustomItems = [];
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

  try {
    await runUpdateCart();
  } catch (error) {
    const handled = await resolveGuestEmailConflict(
      error,
      req,
      typeof normalizedEmail === "string" ? normalizedEmail : undefined,
    );

    if (!handled) {
      throw error;
    }

    await runUpdateCart();
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
  }

  res.status(200).json({ cart });
};
