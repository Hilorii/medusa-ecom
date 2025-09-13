// Comments in English
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function ggShipmentCreated({ event, container }) {
  if (event.data.no_notification) return;

  const fulfillmentModule = container.resolve(Modules.FULFILLMENT);
  const notificationModule = container.resolve(Modules.NOTIFICATION);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const fulfillment = await fulfillmentModule.retrieveFulfillment(
    event.data.id,
  );

  const {
    data: [order],
  } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "email"],
    filters: { fulfillments: { id: fulfillment.id } },
  });

  const trackingNumber =
    fulfillment.tracking_numbers?.[0] ??
    fulfillment.labels?.[0]?.value ??
    "N/A";

  const carrierUrl =
    fulfillment.tracking_links?.[0]?.url ??
    `${process.env.DEFAULT_TRACK_URL ?? "https://www.17track.net/en#nums="}${trackingNumber}`;

  await notificationModule.createNotifications({
    to: order.email,
    channel: "email",
    template: "shipment-created",
    data: {
      order_id: order.display_id,
      tracking_number: trackingNumber,
      tracking_url: carrierUrl,
    },
  });
}

export const config = {
  event: "shipment.created",
  context: { subscriberId: "gg-shipment-created-handler" },
};
