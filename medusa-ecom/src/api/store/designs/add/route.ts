// All comments in English. Breadcrumb logs included (A → J).
// This handler intentionally returns a lean JSON to avoid crashes caused by
// serializing very large/cyclic cart objects. Once stable, you can expand it.

/* eslint-disable no-console */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import {
  ggCalculatePrice,
  ggValidateSelections,
  ggNormalizeCurrency,
} from "../../../../lib/gg-pricing";
import type { GGSelections } from "../../../../lib/gg-pricing/types";
import { ggFinalizeIncomingFile } from "../../../../lib/gg-incoming";

type Body = GGSelections & {
  fileName?: string;
  fileUrl?: string;
  cartId?: string;
};

const PRODUCT_HANDLE = process.env.GG_PRODUCT_HANDLE || "design-your-own";
const VARIANT_TITLE = process.env.GG_VARIANT_TITLE || "Custom";

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    // A) Reached handler
    console.log("[gg:add] A: hit /store/designs/add");

    // B) Parse + basic validation
    const { size, material, color, qty, fileName, fileUrl, cartId } =
      (req.body || {}) as Body;
    console.log("[gg:add] B: body", {
      size,
      material,
      color,
      qty,
      hasFileUrl: !!fileUrl,
      hasCartId: !!cartId,
    });

    const validation = ggValidateSelections({ size, material, color, qty });
    if (!validation.ok) {
      console.warn("[gg:add] B1: invalid payload:", validation.reason);
      return res
        .status(400)
        .json({ code: "invalid_payload", message: validation.reason });
    }

    // C) Resolve modules once
    console.log("[gg:add] C: resolving modules");
    const productModule = req.scope.resolve(Modules.PRODUCT);
    const cartModule = req.scope.resolve(Modules.CART);
    const regionModule = req.scope.resolve(Modules.REGION);

    // D) Reuse provided cart if possible
    let cart: any | undefined;
    if (cartId) {
      console.log("[gg:add] D: retrieveCart(cartId)", cartId);
      try {
        const retrieved = await cartModule.retrieveCart(cartId);
        if (retrieved?.completed_at) {
          console.warn("[gg:add] D1: provided cart completed", cartId);
        } else if (retrieved) {
          cart = retrieved;
          console.log("[gg:add] D2: using provided cart", cart.id);
        } else {
          console.warn("[gg:add] D1: provided cart not found", cartId);
        }
      } catch (err) {
        console.warn("[gg:add] D!: failed to retrieve provided cart", err);
      }
    }

    // E) Region (EUR) only if we don't already have a cart
    let region: any | undefined;
    if (!cart) {
      console.log("[gg:add] E: listRegions(currency=eur)");
      const eurRegions = await regionModule.listRegions({
        currency_code: "eur",
      });
      if (!eurRegions?.length) {
        console.error("[gg:add] E!: no EUR region configured");
        return res.status(500).json({
          code: "no_region",
          message: "No EUR region configured.",
        });
      }
      region = eurRegions[0];
      console.log("[gg:add] E1: using region", region.id);
    }

    // F) Determine currency & calculate price (after cart/region resolved)
    const cartCurrency = ggNormalizeCurrency((cart as any)?.currency_code);
    const regionCurrency = ggNormalizeCurrency((region as any)?.currency_code);
    const targetCurrency = cartCurrency || regionCurrency || "EUR";

    const price = ggCalculatePrice(
      { size, material, color, qty },
      targetCurrency,
    );

    console.log("[gg:add] F1: price", price);

    const unitPrice =
      typeof price.unit_price === "number" && Number.isFinite(price.unit_price)
        ? price.unit_price
        : 0;

    const metadata: Record<string, unknown> = {
      size,
      material,
      color,
      fileName,
      fileUrl,
      currency: price.currency,
      fx_rate: price.fx_rate,
      breakdown: price.breakdown,
    };

    if (
      typeof price.unit_price_minor === "number" &&
      Number.isFinite(price.unit_price_minor)
    ) {
      metadata.unit_price_minor = Math.round(price.unit_price_minor);
    }

    if (
      typeof price.subtotal_minor === "number" &&
      Number.isFinite(price.subtotal_minor)
    ) {
      metadata.subtotal_minor = Math.round(price.subtotal_minor);
    }

    // G) Product + variant
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

    // H) Reuse or create cart (guest flow) if not already resolved
    if (!cart) {
      console.log("[gg:add] H: listCarts(region_id, sales_channel_id)");
      const existing = await cartModule.listCarts({
        region_id: region!.id,
        ...(salesChannelId ? { sales_channel_id: salesChannelId } : {}),
        // @ts-ignore
        completed_at: null,
      });
      cart = existing?.[0];
      if (!cart) {
        console.log("[gg:add] H1: createCarts(...)");
        const created = await cartModule.createCarts([
          {
            region_id: region!.id,
            currency_code: targetCurrency.toLowerCase(),
            ...(salesChannelId ? { sales_channel_id: salesChannelId } : {}),
          } as any,
        ]);
        cart = created[0];
        console.log("[gg:add] H2: created cart", cart.id);
      } else {
        console.log("[gg:add] H2: reused cart", cart.id);
      }
    }
    console.log("[gg:add] H3: final cart", cart?.id);

    if (!cart) {
      console.error("[gg:add] H!: failed to resolve cart");
      return res
        .status(500)
        .json({ code: "cart_unavailable", message: "Unable to resolve cart." });
    }

    // I) Add line item
    console.log("[gg:add] I: addLineItems");
    await cartModule.addLineItems(cart.id, [
      {
        title: "Custom LED Panel", // keep stable title; UI shows composition separately
        product_id: product.id,
        product_title: product.title,
        subtitle: product.subtitle,
        thumbnail: product.thumbnail,
        variant_id: variant.id,
        quantity: qty || 1,
        unit_price: unitPrice,
        is_custom_price: true,
        ...(salesChannelId ? { sales_channel_id: salesChannelId } : {}),
        metadata,
      } as any,
    ]);
    console.log("[gg:add] I1: line item added");

    let addedLineItemId: string | undefined;
    let finalizedFileUrl: string | undefined;
    let finalizedFileName: string | undefined;

    if (fileUrl && fileUrl.startsWith("/static/incoming/")) {
      try {
        console.log("[gg:add] I2: resolving line item for", fileUrl);
        const refreshed = await cartModule.retrieveCart(cart.id, {
          relations: ["items"],
        });
        const matched = (refreshed?.items || []).find(
          (it: any) => (it?.metadata || {}).fileUrl === fileUrl,
        );
        if (matched?.id) {
          addedLineItemId = matched.id;
          const finalized = await ggFinalizeIncomingFile({
            currentUrl: fileUrl,
            lineItemId: matched.id,
          });
          if (finalized) {
            finalizedFileUrl = finalized.urlPath;
            finalizedFileName = finalized.fileName;
            const nextMeta = { ...(matched.metadata || {}) };
            nextMeta.fileUrl = finalized.urlPath;
            nextMeta.fileName = finalized.fileName;
            nextMeta.cart_line_item_id = matched.id;
            nextMeta.relativePath = finalized.relativePath;
            await cartModule.updateLineItems([
              {
                id: matched.id,
                metadata: nextMeta,
              } as any,
            ]);
            console.log("[gg:add] I3: finalized incoming file", {
              line_item_id: matched.id,
              to: finalized.urlPath,
            });
          }
        }
      } catch (err) {
        console.warn("[gg:add] I!: failed to finalize incoming file", err);
      }
    }

    // J) Return lean JSON (avoid serializing the full cart object)
    console.log("[gg:add] J: returning lean payload");
    return res.json({
      ok: true,
      cart_id: cart.id,
      line_item_id: addedLineItemId || null,
      fileUrl: finalizedFileUrl || fileUrl || null,
      fileName: finalizedFileName || fileName || null,
    });

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
