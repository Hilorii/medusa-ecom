// Comments in English
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function ggShipmentCreated({ event, container }) {
  if (event.data.no_notification) return;

  let logger;

  try {
    logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  } catch (e) {
    logger = console;
  }

  const fulfillmentModule = container.resolve(Modules.FULFILLMENT);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  let notificationModule:
    | { createNotifications: (...args: any[]) => Promise<unknown> }
    | undefined;

  try {
    notificationModule = container.resolve(Modules.NOTIFICATION);
  } catch (e) {
    logger?.warn?.(
      "Skipping shipment created email notification. Notification module is not registered.",
    );
    return;
  }

  if (!notificationModule) {
    return;
  }

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
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromEmail = process.env.RESEND_FROM_EMAIL;

  if (!resendApiKey || !resendFromEmail) {
    logger?.warn?.(
      "Skipping shipment created email notification. RESEND_API_KEY or RESEND_FROM_EMAIL is not configured.",
    );
    return;
  }

  try {
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

    logger?.info?.(
      {
        orderId: order.id,
        fulfillmentId: fulfillment.id,
      },
      "Queued shipment created email notification.",
    );
  } catch (e) {
    logger?.error?.(
      {
        err: e,
        orderId: order.id,
        fulfillmentId: fulfillment.id,
      },
      "Failed to send shipment created email notification.",
    );
  }
}

export const config = {
  event: "shipment.created",
  context: { subscriberId: "gg-shipment-created-handler" },
};
