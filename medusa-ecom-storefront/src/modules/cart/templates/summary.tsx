"use client"

import { Button, Heading } from "@medusajs/ui"

import CartTotals from "@modules/common/components/cart-totals"
import DiscountCode from "@modules/checkout/components/discount-code"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

import "./summary.css"

type SummaryProps = {
  cart: HttpTypes.StoreCart & {
    promotions: HttpTypes.StorePromotion[]
  }
}

function getCheckoutStep(cart: HttpTypes.StoreCart) {
  if (!cart?.shipping_address?.address_1 || !cart.email) {
    return "address"
  } else if (cart?.shipping_methods?.length === 0) {
    return "delivery"
  } else {
    return "payment"
  }
}

const Summary = ({ cart }: SummaryProps) => {
  const step = getCheckoutStep(cart)

  return (
    <section
      className="rrc-summary rrc-glass rrc-elevate"
      aria-label="Order summary"
    >
      <header className="rrc-summary-head">
        <Heading level="h2" className="rrc-summary-title">
          Summary
        </Heading>
      </header>

      <div className="rrc-coupon" aria-label="Promotion code">
        <DiscountCode cart={cart} />
      </div>

      <div className="rrc-divider" />

      <div className="rrc-totals" aria-label="Totals">
        <CartTotals totals={cart} />
      </div>

      <LocalizedClientLink
        href={"/checkout?step=" + step}
        data-testid="checkout-button"
        className="rrc-cta-link"
      >
        <Button className="rrc-cta">Go to checkout</Button>
      </LocalizedClientLink>

      <p className="rrc-footnote">
        Secure checkout • Free returns within 30 days
      </p>
    </section>
  )
}

export default Summary
