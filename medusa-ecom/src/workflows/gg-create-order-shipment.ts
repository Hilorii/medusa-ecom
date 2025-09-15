import type {
  AdditionalData,
  OrderDTO,
  OrderWorkflow,
} from "@medusajs/framework/types";
import {
  FulfillmentWorkflowEvents,
  MathBN,
  Modules,
} from "@medusajs/framework/utils";
import {
  WorkflowResponse,
  createHook,
  createWorkflow,
  parallelize,
  transform,
} from "@medusajs/framework/workflows-sdk";
import {
  createShipmentValidateOrder,
  createShipmentWorkflow,
  emitEventStep,
  registerOrderShipmentStep,
  useRemoteQueryStep,
} from "@medusajs/core-flows";

type WorkflowInput = OrderWorkflow.CreateOrderShipmentWorkflowInput &
  AdditionalData;

type OrderForShipment = OrderDTO & {
  fulfillments: Array<{
    id: string;
    items: Array<{
      id?: string;
      line_item_id?: string | null;
      quantity: unknown;
      inventory_item_id?: string | null;
    }>;
  }>;
  items?: Array<
    {
      id?: string;
      variant?: {
        inventory_items?: Array<{
          inventory: { id: string };
          required_quantity?: unknown;
        }>;
      };
    } & Record<string, unknown>
  >;
};

type PrepareRegisterShipmentDataInput = {
  order: OrderForShipment;
  input: OrderWorkflow.CreateOrderShipmentWorkflowInput;
};

const prepareRegisterShipmentData = ({
  order,
  input,
}: PrepareRegisterShipmentDataInput) => {
  const fulfillmentId = input.fulfillment_id;
  const fulfillment = order.fulfillments.find((f) => f.id === fulfillmentId);

  if (!fulfillment) {
    throw new Error(
      `Fulfillment with id ${fulfillmentId} not found in the order`,
    );
  }

  const lineItemIds: string[] = Array.from(
    new Set(
      fulfillment.items
        .map((item) => item.line_item_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  );

  const items = lineItemIds.map((lineItemId) => {
    const orderItem = order.items?.find((item) => item.id === lineItemId);
    const fulfillmentItem = fulfillment.items.find(
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
    reference_id: fulfillment.id,
    created_by: input.created_by,
    items,
  };
};

export const ggCreateOrderShipmentWorkflowId = "gg-create-order-shipment";

export const ggCreateOrderShipmentWorkflow = createWorkflow(
  ggCreateOrderShipmentWorkflowId,
  (input: WorkflowInput) => {
    const order = useRemoteQueryStep({
      entry_point: "orders",
      fields: [
        "id",
        "status",
        "region_id",
        "currency_code",
        "items.id",
        "items.quantity",
        "items.variant.manage_inventory",
        "items.variant.inventory_items.inventory.id",
        "items.variant.inventory_items.required_quantity",
        "fulfillments.*",
        "fulfillments.items.id",
        "fulfillments.items.quantity",
        "fulfillments.items.line_item_id",
        "fulfillments.items.inventory_item_id",
      ],
      variables: { id: input.order_id },
      list: false,
      throw_if_key_not_found: true,
    });

    createShipmentValidateOrder({ order, input });

    const fulfillmentData = transform({ input }, ({ input }) => ({
      id: input.fulfillment_id,
      labels: input.labels ?? [],
    }));

    const shipmentData = transform({ order, input }, ({ order, input }) =>
      prepareRegisterShipmentData({ order, input }),
    ) as any;

    const [shipment] = parallelize(
      createShipmentWorkflow.runAsStep({ input: fulfillmentData }),
      registerOrderShipmentStep(shipmentData),
    );

    emitEventStep({
      eventName: FulfillmentWorkflowEvents.SHIPMENT_CREATED,
      data: { id: shipment.id, no_notification: input.no_notification },
    });

    const shipmentCreated = createHook("shipmentCreated", {
      shipment,
      additional_data: input.additional_data,
    });

    return new WorkflowResponse(void 0, {
      hooks: [shipmentCreated],
    });
  },
);

export default ggCreateOrderShipmentWorkflow;
