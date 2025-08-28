import { retrieveOrder } from "@lib/data/orders"
import OrderCompletedTemplate from "@modules/order/templates/order-completed-template"
import { Metadata } from "next"
import { notFound } from "next/navigation"

type Props = {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: "Order Confirmed",
  description: "Your purchase was successful",
}

export default async function OrderConfirmedPage(props: Props) {
  const params = await props.params
  const order = await retrieveOrder(params.id).catch(() => null)

  if (!order) {
    return notFound()
  }

  // comments in English:
  // Call finalize so uploaded artwork is moved from /uploads/tmp to /uploads/orders/{display_id}
  try {
    const MEDUSA_URL =
      process.env.NEXT_PUBLIC_MEDUSA_URL || "http://localhost:9000"
    const PAK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

    await fetch(`${MEDUSA_URL}/store/designs/finalize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PAK,
      },
      // order.id is the internal id, backend resolves display_id internally
      body: JSON.stringify({ order_id: order.id }),
      // finalize is idempotent on our side; we don't cache
      cache: "no-store",
    }).catch(() => {})
  } catch {
    // swallow finalize errors – we still show the thank-you page
  }

  return <OrderCompletedTemplate order={order} />
}
