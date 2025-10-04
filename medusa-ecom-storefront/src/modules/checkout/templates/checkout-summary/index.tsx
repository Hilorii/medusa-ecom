"use client"

import { useEffect, useState } from "react"
import { Heading } from "@medusajs/ui"

import ItemsPreviewTemplate from "@modules/cart/templates/preview"
import DiscountCode from "@modules/checkout/components/discount-code"
import CartTotals from "@modules/common/components/cart-totals"
import Divider from "@modules/common/components/divider"
import { CHECKOUT_REGION_UPDATE_EVENT } from "@modules/checkout/constants"

const CheckoutSummary = ({ cart }: { cart: any }) => {
  const [isRegionUpdating, setIsRegionUpdating] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ isUpdating?: boolean }>).detail
      setIsRegionUpdating(Boolean(detail?.isUpdating))
    }

    window.addEventListener(CHECKOUT_REGION_UPDATE_EVENT, handler)

    return () => {
      window.removeEventListener(CHECKOUT_REGION_UPDATE_EVENT, handler)
    }
  }, [])
  return (
    <div className="sticky top-0 flex flex-col-reverse small:flex-col gap-y-8 py-8 small:py-0 ">
      <div className="w-full bg-white flex flex-col">
        <Divider className="my-6 small:hidden" />
        <Heading
          level="h2"
          className="flex flex-row text-3xl-regular items-baseline"
        >
          In your Cart
        </Heading>
        <Divider className="my-6" />
        <CartTotals totals={cart} isLoading={isRegionUpdating} />
        <ItemsPreviewTemplate cart={cart} isLoading={isRegionUpdating} />
        <div className="my-6">
          <DiscountCode cart={cart} />
        </div>
      </div>
    </div>
  )
}

export default CheckoutSummary
