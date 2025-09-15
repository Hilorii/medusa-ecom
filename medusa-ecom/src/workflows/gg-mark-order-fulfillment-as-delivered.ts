import type { FulfillmentDTO, OrderDTO } from "@medusajs/framework/types";
import {
  FulfillmentWorkflowEvents,
  MathBN,
  Modules,
} from "@medusajs/framework/utils";
import {
  WorkflowResponse,
  createWorkflow,
  parallelize,
  transform,
} from "@medusajs/framework/workflows-sdk";
import {
  emitEventStep,
  markFulfillmentAsDeliveredWorkflow,
  orderFulfillmentDeliverablilityValidationStep,
  registerOrderDeliveryStep,
  useRemoteQueryStep,
} from "@medusajs/core-flows";

export type MarkOrderFulfillmentAsDeliveredInput = {
  orderId: string;
  fulfillmentId: string;
};

type OrderForDelivery = OrderDTO & {
  fulfillments: Array<
    FulfillmentDTO & {
      items: Array<{
        id?: string;
        quantity: unknown;
        line_item_id?: string | null;
        inventory_item_id?: string | null;
      }>;
    }
  >;
  items?: Array<
    {
      id?: string;
      quantity?: unknown;
      variant?: {
        inventory_items?: Array<{
          inventory: { id: string };
          required_quantity?: unknown;
        }>;
      };
    } & Record<string, unknown>
  >;
};

type PrepareRegisterDeliveryDataInput = {
  order: OrderForDelivery;
  fulfillment: FulfillmentDTO;
};

const prepareRegisterDeliveryData = ({
  order,
  fulfillment,
}: PrepareRegisterDeliveryDataInput) => {
  const orderFulfillment = order.fulfillments.find(
    (f) => f.id === fulfillment.id,
  );

  if (!orderFulfillment) {
    throw new Error(
      `Fulfillment with id ${fulfillment.id} not found in the order`,
    );
  }

  const lineItemIds: string[] = Array.from(
    new Set(
      orderFulfillment.items
        .map((item) => item.line_item_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  );

  const items = lineItemIds.map((lineItemId) => {
    const orderItem = order.items?.find((item) => item.id === lineItemId);
    const fulfillmentItem = orderFulfillment.items.find(
      (item) => item.line_item_id === lineItemId,
    );

    let quantity: any = fulfillmentItem?.quantity ?? 0;

    const inventoryItems = (orderItem as any)?.variant?.inventory_items as
      | Array<{
          inventory: { id: string };
          required_quantity?: unknown;
        }>
      | undefined;

    if (inventoryItems?.length && fulfillmentItem?.inventory_item_id) {
      const matchingInventoryItem = inventoryItems.find(
        (inventoryItem) =>
          inventoryItem.inventory.id === fulfillmentItem.inventory_item_id,
      );

      if (matchingInventoryItem?.required_quantity) {
        quantity = MathBN.div(
          quantity,
          matchingInventoryItem.required_quantity as any,
        );
      }
    }

    return {
      id: lineItemId,
      quantity,
    };
  });

  return {
    order_id: order.id,
    reference: Modules.FULFILLMENT,
    reference_id: orderFulfillment.id,
    items,
  };
};

export const ggMarkOrderFulfillmentAsDeliveredWorkflowId =
  "gg-mark-order-fulfillment-as-delivered";

export const ggMarkOrderFulfillmentAsDeliveredWorkflow = createWorkflow(
  ggMarkOrderFulfillmentAsDeliveredWorkflowId,
  (input: MarkOrderFulfillmentAsDeliveredInput) => {
    const { orderId, fulfillmentId } = input;

    const fulfillment = useRemoteQueryStep({
      entry_point: "fulfillment",
      fields: ["id"],
      variables: { id: fulfillmentId },
      throw_if_key_not_found: true,
      list: false,
    });

    const order = useRemoteQueryStep({
      entry_point: "order",
      fields: [
        "id",
        "summary",
        "currency_code",
        "region_id",
        "fulfillments.id",
        "fulfillments.items.id",
        "fulfillments.items.quantity",
        "fulfillments.items.line_item_id",
        "fulfillments.items.inventory_item_id",
        "items.id",
        "items.quantity",
        "items.variant.manage_inventory",
        "items.variant.inventory_items.inventory.id",
        "items.variant.inventory_items.required_quantity",
      ],
      variables: { id: orderId },
      throw_if_key_not_found: true,
      list: false,
    }).config({ name: "order-query" });

    orderFulfillmentDeliverablilityValidationStep({ order, fulfillment });

    const deliveryData = transform(
      { order, fulfillment },
      ({ order, fulfillment }) =>
        prepareRegisterDeliveryData({
          order: order as OrderForDelivery,
          fulfillment,
        }),
    );

    const [deliveredFulfillment] = parallelize(
      markFulfillmentAsDeliveredWorkflow.runAsStep({
        input: { id: fulfillment.id },
      }),
      registerOrderDeliveryStep(deliveryData),
    );

    emitEventStep({
      eventName: FulfillmentWorkflowEvents.DELIVERY_CREATED,
      data: { id: deliveredFulfillment.id },
    });

    return new WorkflowResponse(void 0);
  },
);

export default ggMarkOrderFulfillmentAsDeliveredWorkflow;
