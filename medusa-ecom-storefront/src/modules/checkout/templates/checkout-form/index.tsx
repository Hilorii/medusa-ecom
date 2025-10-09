import { listCartShippingMethods } from "@lib/data/fulfillment"
import { listCartPaymentMethods } from "@lib/data/payment"
import { HttpTypes } from "@medusajs/types"
import Addresses from "@modules/checkout/components/addresses"
import Payment from "@modules/checkout/components/payment"
import Review from "@modules/checkout/components/review"
import Shipping from "@modules/checkout/components/shipping"
import "./checkout-form.css"
import { CheckoutPaymentProvider } from "@modules/checkout/context/payment-context"
import { listRegions } from "@lib/data/regions"

const isSessionReady = (status?: string | null) =>
  status === "pending" || status === "requires_more"

export default async function CheckoutForm({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) {
  if (!cart) {
    return null
  }

  const [shippingMethods, paymentMethods, regionsResult] = await Promise.all([
    listCartShippingMethods(cart.id),
    listCartPaymentMethods(cart.region?.id ?? ""),
    listRegions(),
  ])
  const regions = regionsResult ?? []

  if (!shippingMethods || !paymentMethods) {
    return null
  }

  const activeSession = cart.payment_collection?.payment_sessions?.find(
    (session) => isSessionReady(session.status)
  )

  return (
    <CheckoutPaymentProvider initialMethod={activeSession?.provider_id}>
      <div className="gg-checkout-form w-full grid grid-cols-1 gap-y-8">
        <Addresses cart={cart} customer={customer} regions={regions} />

        <Shipping cart={cart} availableShippingMethods={shippingMethods} />

        <Payment cart={cart} availablePaymentMethods={paymentMethods} />

        <Review cart={cart} />
      </div>
    </CheckoutPaymentProvider>
  )
}
