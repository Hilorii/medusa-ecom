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
  // guard against floating point artifacts by rounding to the nearest cent
  return Math.round(value * 100);
}

/** Default FX rates used when env overrides are not provided. */
const DEFAULT_FX: Record<GGCurrency, number> = {
  EUR: 1,
  USD: 1.08,
  GBP: 0.86,
  PLN: 4.3,
};

/** Resolve runtime-configurable FX rate for converting EUR → currency. */
function resolveFxRate(currency: GGCurrency): number {
  if (currency === "EUR") {
    return 1;
  }

  const candidates = [
    `GG_FX_${currency}`,
    `GG_FX_RATE_${currency}`,
    `GG_EUR_TO_${currency}`,
  ];

  for (const key of candidates) {
    const raw = process.env[key];
    if (!raw) continue;

    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return DEFAULT_FX[currency] ?? 1;
}

/**
 * Convert the provided EUR amount to the target currency in minor units.
 * The amount is assumed to be expressed in whole euros, not cents.
 */
export function ggConvertEurToMinorUnits(
  eurAmount: number,
  currency: GGCurrency,
): number {
  const normalized = Number(eurAmount) || 0;
  const rate = resolveFxRate(currency);
  return eurToCents(normalized * rate);
}

/** Normalize incoming currency code (e.g., from regions) to GGCurrency. */
export function ggNormalizeCurrency(code?: string | null): GGCurrency | null {
  if (!code) {
    return null;
  }

  const upper = code.toUpperCase();
  if (upper === "EUR") return "EUR";
  if (upper === "USD") return "USD";
  if (upper === "GBP") return "GBP";
  if (upper === "PLN") return "PLN";
  return null;
}

/** Expose FX rate for diagnostic purposes (e.g., metadata). */
export function ggGetFxRate(currency: GGCurrency): number {
  return resolveFxRate(currency);
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
// MAKE SURE IT MATCHES const INCOMPATIBLE in design/page.tsx
//

export function ggValidateSelections(sel: GGSelections): {
  ok: boolean;
  reason?: string;
} {
  // Example rule placeholder: forbid 'iridescent' with 'brown'
  if (sel.material === "iridescent" && sel.color === "brown") {
    return {
      ok: false,
      reason: "Iridescent is not available with Brown color.",
    };
  }
  return { ok: true };
}
