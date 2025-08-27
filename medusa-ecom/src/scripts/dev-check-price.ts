import { ggCalculatePrice } from "../lib/gg-pricing";
import type { GGSelections } from "../lib/gg-pricing/types";

// npx ts-node dev-check-price.ts

const s: GGSelections = {
    size: "21x21",
    material: "shadow",
    color: "blue",
    qty: 2,
};

console.log(ggCalculatePrice(s));
