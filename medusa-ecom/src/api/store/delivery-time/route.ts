// src/api/store/delivery-time/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

// Tiny helpers for safe JSON shape
type LeadTimeMeta = {
  backlog_count: number;
  z: number;
  base: number;
  divisor: number;
  mode: "count" | "scan";
};

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { count, mode } = await ggCountNotFulfilled(req);

    const base = Number(process.env.LEAD_TIME_BASE_WEEKS ?? 2);
    const divisor = Number(process.env.LEAD_TIME_DIVISOR ?? 10);
    const rounding = (process.env.LEAD_TIME_ROUNDING ?? "ceil") as
      | "ceil"
      | "floor"
      | "round";

    const raw = divisor > 0 ? count / divisor : 0;
    const z =
      rounding === "floor"
        ? Math.floor(raw)
        : rounding === "round"
          ? Math.round(raw)
          : Math.ceil(raw);

    let weeks = base + z;
    if (process.env.LEAD_TIME_MAX_WEEKS) {
      weeks = Math.min(weeks, Number(process.env.LEAD_TIME_MAX_WEEKS));
    }

    const meta: LeadTimeMeta = { backlog_count: count, z, base, divisor, mode };
    return res.json({ weeks, meta });
  } catch (e: any) {
    try {
      // @ts-ignore
      req.scope.resolve("logger")?.error({ err: e }, "gg-delivery-time failed");
    } catch {}
    return res.status(500).json({
      code: "gg_lead_time_failed",
      message: e?.message || "Lead time computation failed",
      stack: process.env.NODE_ENV !== "production" ? e?.stack : undefined,
    });
  }
};

/**
 * Counts "not fulfilled" orders. Two-step approach:
 * 1) Fast path: use module's countOrders with fulfillment_status filter (if supported).
 * 2) Fallback: list orders (no risky filters) and detect non-fulfilled in memory using
 *    fulfillment_status if present; only if missing, try items/fulfillments heuristic.
 */
async function ggCountNotFulfilled(
  req: MedusaRequest,
): Promise<{ count: number; mode: "count" | "scan" }> {
  // Correct way to resolve the Order module in Medusa v2
  const orderModule = req.scope.resolve(Modules.ORDER) as any;

  // ---- Fast path: countOrders with fulfillment_status filter
  try {
    if (typeof orderModule?.countOrders === "function") {
      const filters = {
        fulfillment_status: ["not_fulfilled", "partially_fulfilled"],
        // canceled_at: null, // uncomment if your schema exposes it
      };
      const counted = await orderModule.countOrders(filters);
      if (typeof counted === "number") {
        return { count: counted, mode: "count" };
      }
    }
  } catch {
    // ignore and fallback
  }

  // ---- Fallback scan: list orders with minimal config (avoid exotic options that may break)
  // Some installations return a plain array, others an object with "data".
  // Keep it simple and avoid 'order' or too many relations to prevent adapter bugs.
  let listed: any;
  try {
    if (typeof orderModule?.listOrders === "function") {
      listed = await orderModule.listOrders(
        {},
        {
          take: 2000,
          // Ask for items/fulfillments if your adapter supports relations;
          // if not, the code will still work using fulfillment_status field when present.
          relations: ["items", "fulfillments", "fulfillments.items"],
        },
      );
    } else if (typeof orderModule?.listAndCountOrders === "function") {
      const [arr] = await orderModule.listAndCountOrders(
        {},
        {
          take: 2000,
          relations: ["items", "fulfillments", "fulfillments.items"],
        },
      );
      listed = arr;
    }
  } catch (e) {
    // As a last resort, try listing with *no* relations at all
    if (typeof orderModule?.listOrders === "function") {
      listed = await orderModule.listOrders({}, { take: 2000 });
    } else {
      throw new Error(
        // @ts-ignore
        "Failed to list orders for fallback scan. " + (e as any)?.message ?? "",
      );
    }
  }

  const orders: any[] = Array.isArray(listed) ? listed : listed?.data || [];

  let notFulfilled = 0;
  for (const o of orders) {
    // If DTO exposes fulfillment_status, prefer that (no heavy logic needed)
    const fs = (o as any)?.fulfillment_status;
    if (typeof fs === "string") {
      if (fs !== "fulfilled") notFulfilled++;
      continue;
    }
    // Otherwise use a safe heuristic via items/fulfillments if present
    const fully = ggIsFullyFulfilled(o);
    if (!fully) notFulfilled++;
  }

  return { count: notFulfilled, mode: "scan" };
}

/**
 * Heuristic: consider order fully fulfilled if every item.quantity is covered by
 * fulfilled_quantity OR by summing fulfillment items (ignoring canceled fulfillments).
 */
function ggIsFullyFulfilled(order: any): boolean {
  const items: any[] = Array.isArray(order?.items) ? order.items : [];

  // Path A: use fulfilled_quantity if available
  const hasFulfilledQty = items.some(
    (it) => typeof it?.fulfilled_quantity === "number",
  );
  if (hasFulfilledQty) {
    for (const it of items) {
      const need = Number(it?.quantity ?? 0);
      const done = Number(it?.fulfilled_quantity ?? 0);
      if (done < need) return false;
    }
    return true;
  }

  // Path B: sum fulfillment items if we have fulfillments
  const fulfillments: any[] = Array.isArray(order?.fulfillments)
    ? order.fulfillments
    : [];
  if (!fulfillments.length) {
    // No info: be conservative and treat as not fulfilled
    return false;
  }

  const sumByItem = new Map<string, number>();
  for (const f of fulfillments) {
    if (f?.canceled_at) continue;
    const fItems: any[] = Array.isArray(f?.items) ? f.items : [];
    for (const fi of fItems) {
      const itemId = fi?.item_id || fi?.line_item_id || fi?.order_item_id;
      const qty = Number(fi?.quantity ?? 0);
      if (!itemId) continue;
      sumByItem.set(itemId, (sumByItem.get(itemId) ?? 0) + qty);
    }
  }

  for (const it of items) {
    const id =
      it?.id || it?.item_id || it?.line_item_id || it?.order_item_id || "";
    const need = Number(it?.quantity ?? 0);
    const done = sumByItem.get(id) ?? 0;
    if (done < need) return false;
  }
  return true;
}
