export type GGCurrency = "EUR" | "USD" | "GBP" | "PLN"; // easy to extend later

export type GGSize = "21x21" | "36x14" | "36x21";

export type GGMaterial =
  | "clear"
  | "shadow"
  | "aurora"
  | "iridescent"
  | "galaxy";

export type GGColor =
  | "black"
  | "grey"
  | "white"
  | "red"
  | "green"
  | "blue"
  | "brown";

export type GGSelections = {
  size: GGSize;
  material: GGMaterial;
  color: GGColor;
  qty?: number; // default 1
};

export type GGPricingTable = {
  currency: GGCurrency;
  sizes: Record<GGSize, number>; // euro
  materials: Record<GGMaterial, number>; // euro
  colors: Record<GGColor, number>; // euro
  qty: { min: number; max: number };
};

export type GGPriceResult = {
  currency: GGCurrency;
  unit_price: number; // major units (rounded to currency precision)
  unit_price_minor: number; // helper in minor units (integer)
  subtotal: number; // unit_price * qty (major units)
  subtotal_minor: number; // helper in minor units
  qty: number;
  fx_rate: number; // EUR -> currency multiplier used for this calculation
  breakdown: {
    base_eur: number;
    material_eur: number;
    color_eur: number;
    total_eur: number;
  };
};
