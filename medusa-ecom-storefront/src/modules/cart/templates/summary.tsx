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
    <div className="rrc-summary">
      <Heading level="h2" className="rrc-summary-title">
        Summary
      </Heading>

      {/* Kupon w „glass” z dashed border */}
      <div className="rrc-coupon rrc-glass rrc-elevate">
        <DiscountCode cart={cart} />
      </div>

      <div className="rrc-divider" />

      {/* Totals – zostawiamy logikę, dopieszczamy wygląd kontenera */}
      <div className="rrc-totals">
        <CartTotals totals={cart} />
      </div>

      <LocalizedClientLink
        href={"/checkout?step=" + step}
        data-testid="checkout-button"
      >
        <Button className="rrc-cta">Go to checkout</Button>
      </LocalizedClientLink>
    </div>
  )
}

export default Summary
