// All comments in English. Breadcrumb logs included (A → J).
// This handler intentionally returns a lean JSON to avoid crashes caused by
// serializing very large/cyclic cart objects. Once stable, you can expand it.

/* eslint-disable no-console */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import {
  ggCalculatePrice,
  ggValidateSelections,
} from "../../../../lib/gg-pricing";
import type { GGSelections } from "../../../../lib/gg-pricing/types";

type Body = GGSelections & {
  fileName?: string;
  fileUrl?: string;
};

const PRODUCT_HANDLE = process.env.GG_PRODUCT_HANDLE || "design-your-own";
const VARIANT_TITLE = process.env.GG_VARIANT_TITLE || "Custom";

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    // A) Reached handler
    console.log("[gg:add] A: hit /store/designs/add");

    // B) Parse + basic validation
    const { size, material, color, qty, fileName, fileUrl } = (req.body ||
      {}) as Body;
    console.log("[gg:add] B: body", {
      size,
      material,
      color,
      qty,
      hasFileUrl: !!fileUrl,
    });

    const validation = ggValidateSelections({ size, material, color, qty });
    if (!validation.ok) {
      console.warn("[gg:add] C: invalid payload:", validation.reason);
      return res
        .status(400)
        .json({ code: "invalid_payload", message: validation.reason });
    }

    // C) Price in minor units (integer)
    const price = ggCalculatePrice({ size, material, color, qty });
    if (!Number.isInteger(price.unit_price)) {
      console.warn(
        "[gg:add] D: unit_price not integer, coercing:",
        price.unit_price,
      );
      price.unit_price = Math.round(Number(price.unit_price) || 0);
    }
    console.log("[gg:add] D: price", price);

    // D) Resolve modules once
    console.log("[gg:add] E: resolving modules");
    const productModule = req.scope.resolve(Modules.PRODUCT);
    const cartModule = req.scope.resolve(Modules.CART);
    const regionModule = req.scope.resolve(Modules.REGION);

    // E) Region (EUR)
    console.log("[gg:add] F: listRegions(currency=eur)");
    const eurRegions = await regionModule.listRegions({ currency_code: "eur" });
    if (!eurRegions?.length) {
      console.error("[gg:add] F!: no EUR region configured");
      return res
        .status(500)
        .json({ code: "no_region", message: "No EUR region configured." });
    }
    const region = eurRegions[0];
    console.log("[gg:add] F1: using region", region.id);

    // F) Product + variant
    console.log("[gg:add] G: listProducts(handle)", PRODUCT_HANDLE);
    const [product] = await productModule.listProducts(
      { handle: [PRODUCT_HANDLE] },
      { relations: ["variants"] }, // keep it lean; no heavy relations
    );
    if (!product) {
      console.error(
        "[gg:add] G!: product not found by handle:",
        PRODUCT_HANDLE,
      );
      return res.status(404).json({
        code: "product_not_found",
        message: "Design Your Own product not found.",
      });
    }
    const variant = product.variants?.find(
      (v: any) => v.title === VARIANT_TITLE,
    );
    if (!variant) {
      console.error("[gg:add] G!: variant not found by title:", VARIANT_TITLE);
      return res.status(500).json({
        code: "variant_not_found",
        message: "Custom variant not found.",
      });
    }
    const pKey: any = (req as any).publishable_key_context;
    const salesChannelId: string | undefined = pKey?.sales_channel_ids?.[0];
    console.log(
      "[gg:add] G1: product/variant/sales_channel",
      product.id,
      variant.id,
      salesChannelId,
    );

    // G) Reuse or create cart (guest flow)
    console.log("[gg:add] H: listCarts(region_id, sales_channel_id)");

    const existing = await cartModule.listCarts({
      region_id: region.id,
      ...(salesChannelId ? { sales_channel_id: salesChannelId } : {}),
      // @ts-ignore
      completed_at: null,
    });
    let cart = existing?.[0];
    if (!cart) {
      console.log("[gg:add] H1: createCarts(...)");
      const created = await cartModule.createCarts([
        {
          region_id: region.id,
          currency_code: "eur",
          ...(salesChannelId ? { sales_channel_id: salesChannelId } : {}),
        } as any,
      ]);
      cart = created[0];
      console.log("[gg:add] H2: created cart", cart.id);
    } else {
      console.log("[gg:add] H2: reused cart", cart.id);
    }

    // H) Add line item
    console.log("[gg:add] I: addLineItems");
    await cartModule.addLineItems(cart.id, [
      {
        title: "Custom", // keep stable title; UI shows composition separately
        product_id: product.id,
        variant_id: variant.id,
        quantity: qty || 1,
        unit_price: price.unit_price, // must be integer (minor units)
        is_custom_price: true,
        ...(salesChannelId ? { sales_channel_id: salesChannelId } : {}),
        metadata: {
          size,
          material,
          color,
          fileName,
          fileUrl,
          breakdown: price.breakdown,
        },
      } as any,
    ]);
    console.log("[gg:add] I1: line item added");

    // I) Return lean JSON (avoid serializing the full cart object)
    console.log("[gg:add] J: returning lean payload");
    return res.json({ ok: true, cart_id: cart.id });

    // — If you later want to return more data, prefer a lean mapping:
    // const updated = await cartModule.retrieveCart(cart.id)
    // const lean = {
    //   id: updated.id,
    //   currency_code: updated.currency_code,
    //   region_id: updated.region_id,
    //   items: (updated.items || []).map((i: any) => ({
    //     id: i.id,
    //     title: i.title,
    //     quantity: i.quantity,
    //     unit_price: i.unit_price,
    //     metadata: i.metadata,
    //   })),
    //   subtotal: (updated as any).subtotal,
    //   total: (updated as any).total,
    // }
    // return res.json(lean)
  } catch (e: any) {
    console.error("[gg:add] ERR:", e);
    return res.status(500).json({
      code: "server_error",
      message: e?.message || "Internal error",
      stack: process.env.NODE_ENV !== "production" ? e?.stack : undefined,
    });
  }
};
