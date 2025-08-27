import { Heading } from "@medusajs/ui"
import { cookies as nextCookies } from "next/headers"

import CartTotals from "@modules/common/components/cart-totals"
import Help from "@modules/order/components/help"
import Items from "@modules/order/components/items"
import OnboardingCta from "@modules/order/components/onboarding-cta"
import OrderDetails from "@modules/order/components/order-details"
import ShippingDetails from "@modules/order/components/shipping-details"
import PaymentDetails from "@modules/order/components/payment-details"
import { HttpTypes } from "@medusajs/types"

import "./order-completed.css"

type OrderCompletedTemplateProps = {
  order: HttpTypes.StoreOrder
}

export default async function OrderCompletedTemplate({
  order,
}: OrderCompletedTemplateProps) {
  const cookies = await nextCookies()
  const isOnboarding = cookies.get("_medusa_onboarding")?.value === "true"

  return (
    <div className="gg-order-complete-wrapper">
      <div className="content-container gg-container">
        {isOnboarding && (
          <div className="gg-glass gg-onboarding">
            <OnboardingCta orderId={order.id} />
          </div>
        )}

        {/* Header panel */}
        <section className="gg-glass gg-panel">
          <Heading
            level="h1"
            className="flex flex-col gap-y-2 text-ui-fg-base text-3xl md:text-4xl text-white"
          >
            <span>Thank you!</span>
            <span className="text-ui-fg-subtle text-base md:text-lg text-white">
              Your order was placed successfully.
            </span>
          </Heading>

          {/* Order meta in a subtle glass sub-panel for compactness on mobile */}
          <div className="gg-subpanel-up">
            <OrderDetails order={order} />
          </div>
        </section>

        {/* Summary grid – two columns on desktop, single column on small screens */}
        <section className="gg-grid">
          {/* Items + totals column */}
          <div className="gg-col">
            <div className="gg-glass gg-panel">
              <Heading level="h2" className="text-2xl md:text-3xl-regular">
                Summary
              </Heading>
              <Items order={order} />
              <div className="gg-subpanel">
                <CartTotals totals={order} />
              </div>
            </div>
          </div>

          {/* Shipping + payment column; collapsible on small screens via <details> */}
          <div className="gg-col">
            <details className="gg-glass gg-panel gg-details" open>
              <summary className="gg-summary">Shipping Details</summary>
              <div className="gg-details-content">
                <ShippingDetails order={order} />
              </div>
            </details>

            <details className="gg-glass gg-panel gg-details" open>
              <summary className="gg-summary">Payment Details</summary>
              <div className="gg-details-content">
                <PaymentDetails order={order} />
              </div>
            </details>

            <div className="gg-glass gg-panel gg-help">
              <Help />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
