// Live price preview for the configurator.
// Input: { size, material, color, qty }
// Output: { currency, unit_price, subtotal, qty, breakdown }
// All comments in English as requested.

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import {
  ggCalculatePrice,
  ggValidateSelections,
  ggNormalizeCurrency,
} from "../../../../lib/gg-pricing";
import type { GGSelections } from "../../../../lib/gg-pricing/types";

type Body = GGSelections & {
  cartId?: string;
  cart_id?: string;
  currency_code?: string;
};

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { size, material, color, qty, cartId, cart_id, currency_code } =
      req.body as Body;

    // Basic validation using the same helper as add-to-cart
    const validation = ggValidateSelections({ size, material, color, qty });
    if (!validation.ok) {
      return res
        .status(422)
        .json({ code: "invalid_payload", message: validation.reason });
    }

    // Start with the explicitly provided currency if present, otherwise default to EUR.
    let targetCurrency = ggNormalizeCurrency(currency_code) || "EUR";

    // If we have a cart id in the payload, align currency with that cart's region/currency.
    const candidateCartId = cartId || cart_id;
    if (candidateCartId) {
      try {
        const cartModule = req.scope.resolve(Modules.CART);
        const cart = await cartModule.retrieveCart(candidateCartId);
        const normalized = ggNormalizeCurrency(cart?.currency_code);
        if (normalized) {
          targetCurrency = normalized;
        }
      } catch (err) {
        console.warn("[gg:price] Failed to read cart currency", err);
      }
    } else {
      // If we don't have a cart id in the payload, try to infer it from the publishable key context.
      const pkContext: any = (req as any).publishable_key_context;
      const pkCartId = pkContext?.cart_id || pkContext?.cartId;
      if (pkCartId) {
        try {
          const cartModule = req.scope.resolve(Modules.CART);
          const cart = await cartModule.retrieveCart(pkCartId);
          const normalized = ggNormalizeCurrency(cart?.currency_code);
          if (normalized) {
            targetCurrency = normalized;
          }
        } catch (err) {
          console.warn("[gg:price] Failed to read PAK cart currency", err);
        }
      }
    }

    const price = ggCalculatePrice(
      { size, material, color, qty },
      targetCurrency,
    );
    return res.json(price); // { currency, unit_price, subtotal, qty, breakdown }
  } catch (e: any) {
    return res.status(500).json({
      code: "server_error",
      message: e?.message || "Failed to calculate price",
    });
  }
};
