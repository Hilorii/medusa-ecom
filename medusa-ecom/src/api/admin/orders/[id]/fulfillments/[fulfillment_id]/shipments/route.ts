import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { HttpTypes } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils";
import { ggCreateOrderShipmentWorkflow } from "../../../../../../../workflows/gg-create-order-shipment";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY);

  const body = req.validatedBody as HttpTypes.AdminCreateOrderShipment;

  const input = {
    ...body,
    order_id: req.params.id,
    fulfillment_id: req.params.fulfillment_id,
    labels: body.labels ?? [],
  };

  await ggCreateOrderShipmentWorkflow(req.scope).run({
    input,
  });

  const queryObject = remoteQueryObjectFromString({
    entryPoint: "order",
    variables: { id: req.params.id },
    fields: req.queryConfig.fields,
  });

  const [order] = await remoteQuery(queryObject);

  res.status(200).json({ order });
}
