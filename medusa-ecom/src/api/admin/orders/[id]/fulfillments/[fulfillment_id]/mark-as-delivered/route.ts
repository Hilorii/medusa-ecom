import { refetchEntity } from "@medusajs/framework/http";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ggMarkOrderFulfillmentAsDeliveredWorkflow } from "../../../../../../../workflows/gg-mark-order-fulfillment-as-delivered";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id: orderId, fulfillment_id: fulfillmentId } = req.params;

  await ggMarkOrderFulfillmentAsDeliveredWorkflow(req.scope).run({
    input: { orderId, fulfillmentId },
  });

  const order = await refetchEntity(
    "order",
    orderId,
    req.scope,
    req.queryConfig.fields,
  );

  res.status(200).json({ order });
}
