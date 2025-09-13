// Comments in English
import { Modules } from "@medusajs/framework/utils";

export default async function ggOrderPlaced({ event, container }) {
  const orderModule = container.resolve(Modules.ORDER);
  const notificationModule = container.resolve(Modules.NOTIFICATION);

  const order = await orderModule.retrieveOrder(event.data.id);

  const statusUrl = `${process.env.STOREFRONT_URL ?? "http://localhost:8000"}/order/${order.display_id}`;

  await notificationModule.createNotifications({
    to: order.email,
    channel: "email",
    template: "order-placed",
    data: { order_id: order.display_id, status_url: statusUrl },
  });
}

export const config = {
  event: "order.placed",
  context: { subscriberId: "gg-order-placed-handler" },
};
