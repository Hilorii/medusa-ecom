import { retrieveOrder } from "@lib/data/orders"
import OrderCompletedTemplate from "@modules/order/templates/order-completed-template"
import { Metadata } from "next"
import { notFound } from "next/navigation"
import { finalizeDesign } from "@lib/client/gg-store"

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
    await finalizeDesign({ order_id: order.id }).catch(() => {})
  } catch {
    // swallow finalize errors – we still show the thank-you page
  }

  return <OrderCompletedTemplate order={order} />
}
