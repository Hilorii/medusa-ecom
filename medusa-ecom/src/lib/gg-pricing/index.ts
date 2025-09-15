import fs from "node:fs";
import path from "node:path";
import type {
  GGSelections,
  GGPriceResult,
  GGPricingTable,
  GGCurrency,
} from "./types";

/** Resolve path to the JSON pricing table relative to project root. */
function resolvePricingPath(): string {
  // __dirname = src/lib/gg-pricing
  // we want to go back to src/data/gg-pricing.json
  return path.resolve(__dirname, "../../data/gg-pricing.json");
}

/** Load and parse the pricing JSON (sync for simplicity; tiny file). */
export function ggLoadPricing(): GGPricingTable {
  const p = resolvePricingPath();
  const raw = fs.readFileSync(p, "utf-8");
  const data = JSON.parse(raw) as GGPricingTable;
  return data;
}

/** Convert euro value to minor units (cents). */
function eurToCents(value: number): number {
  // guard against floating point artifacts
  // value * 100 here if needed for Medusa
  return Math.round(value);
}

/** Clamp helper. */
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Calculate price (minor units) based on user's selections.
 * - Prices are defined in EUR in the JSON table.
 * - Returns unit_price in cents (Medusa-compatible).
 * - Later: add multi-currency by table-per-currency or fx conversion.
 */
export function ggCalculatePrice(
  selections: GGSelections,
  currency: GGCurrency = "EUR",
): GGPriceResult {
  const table = ggLoadPricing();

  if (table.currency !== "EUR") {
    // For MVP we assume EUR in the table.
    // If you switch to multi-currency tables later, extend this logic.
  }

  const { size, material, color } = selections;
  const qty = clamp(
    selections.qty ?? 1,
    table.qty?.min ?? 1,
    table.qty?.max ?? 10,
  );

  // Validate keys exist in the pricing table
  if (!(size in table.sizes)) {
    throw new Error(`Unknown size: ${size}`);
  }
  if (!(material in table.materials)) {
    throw new Error(`Unknown material: ${material}`);
  }
  if (!(color in table.colors)) {
    throw new Error(`Unknown color: ${color}`);
  }

  // Compute in EUR first for clarity
  const base = table.sizes[size];
  const mat = table.materials[material];
  const col = table.colors[color];
  const totalEur = base + mat + col;

  const unit_price = eurToCents(totalEur);
  const subtotal = unit_price * qty;

  return {
    currency,
    unit_price,
    subtotal,
    qty,
    breakdown: {
      base_eur: base,
      material_eur: mat,
      color_eur: col,
      total_eur: totalEur,
    },
  };
}

/** Quick helper to check if a combination is allowed. Extend with rules later. */

//
// Const INCOMPATIBLE in design/page.tsx is now responsible for incompatible selections
//

// export function ggValidateSelections(sel: GGSelections): {
//   ok: boolean;
//   reason?: string;
// } {
//   // Example rule placeholder: forbid 'iridescent' with 'brown'
//   if (sel.material === "iridescent" && sel.color === "brown") {
//     return {
//       ok: false,
//       reason: "Iridescent is not available with Brown color.",
//     };
//   }
//   return { ok: true };
// }
