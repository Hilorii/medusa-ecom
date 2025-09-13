import { render } from "@react-email/render";
import GgOrderPlacedEmail from "./emails/GgOrderPlaced";
import GgShipmentCreatedEmail from "./emails/GgShipmentCreated";

type RenderResult = { subject: string; html: string };

/**
 * Central router that renders email subject + HTML from template key.
 * Returns a Promise because @react-email/render may resolve asynchronously.
 */
export async function ggRenderEmail(
  template: string,
  data: Record<string, any>,
): Promise<RenderResult> {
  switch (template) {
    case "order-placed": {
      const subject = interpolate("Order #{{order_id}} confirmed", data);
      const html = await render(
        GgOrderPlacedEmail({
          order_id: String(data.order_id ?? ""),
          status_url: String(data.status_url ?? "#"),
          shop_name: String(process.env.GG_SHOP_NAME ?? "Your shop"),
        }),
      );
      return { subject, html };
    }

    case "shipment-created": {
      const subject = interpolate(
        "Your order #{{order_id}} is on the way",
        data,
      );
      const html = await render(
        GgShipmentCreatedEmail({
          order_id: String(data.order_id ?? ""),
          tracking_number: String(data.tracking_number ?? ""),
          tracking_url: String(data.tracking_url ?? "#"),
          shop_name: String(process.env.GG_SHOP_NAME ?? "Your shop"),
        }),
      );
      return { subject, html };
    }

    default: {
      const subject = "Notification";
      const html = "<p>Hello!</p>";
      return { subject, html };
    }
  }
}

/** Simple {{key}} interpolator for subject lines */
function interpolate(input: string, map: Record<string, any>) {
  return input.replace(/{{\s*([^}]+)\s*}}/g, (_, k) =>
    map?.[k] == null ? "" : String(map[k]),
  );
}
