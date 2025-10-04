"use client"

import { convertToLocale } from "@lib/util/money"
import React from "react"
import Spinner from "@modules/common/icons/spinner"

type CartTotalsProps = {
  totals: {
    total?: number | null
    subtotal?: number | null
    tax_total?: number | null
    shipping_total?: number | null
    discount_total?: number | null
    gift_card_total?: number | null
    currency_code: string
    shipping_subtotal?: number | null
  }
  isLoading?: boolean
}

const CartTotals: React.FC<CartTotalsProps> = ({
  totals,
  isLoading = false,
}) => {
  const {
    currency_code,
    total,
    subtotal,
    tax_total,
    discount_total,
    gift_card_total,
    shipping_subtotal,
  } = totals

  return (
    <div>
      <div className="flex flex-col gap-y-2 txt-medium text-ui-fg-subtle ">
        <div className="flex items-center justify-between">
          <span className="flex gap-x-1 items-center">
            Subtotal (excl. shipping and taxes)
          </span>
          <span
            className="flex items-center gap-x-2"
            data-testid="cart-subtotal"
            data-value={subtotal || 0}
          >
            {convertToLocale({ amount: subtotal ?? 0, currency_code })}
            {isLoading && <Spinner size={16} />}
          </span>
        </div>
        {!!discount_total && (
          <div className="flex items-center justify-between">
            <span>Discount</span>
            <span
              className="flex items-center gap-x-2 text-ui-fg-interactive"
              data-testid="cart-discount"
              data-value={discount_total || 0}
            >
              -{" "}
              {convertToLocale({ amount: discount_total ?? 0, currency_code })}
              {isLoading && <Spinner size={16} />}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span>Shipping</span>
          <span
            className="flex items-center gap-x-2"
            data-testid="cart-shipping"
            data-value={shipping_subtotal || 0}
          >
            {convertToLocale({ amount: shipping_subtotal ?? 0, currency_code })}
            {isLoading && <Spinner size={16} />}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="flex gap-x-1 items-center ">Taxes</span>
          <span
            className="flex items-center gap-x-2"
            data-testid="cart-taxes"
            data-value={tax_total || 0}
          >
            {convertToLocale({ amount: tax_total ?? 0, currency_code })}
            {isLoading && <Spinner size={16} />}
          </span>
        </div>
        {!!gift_card_total && (
          <div className="flex items-center justify-between">
            <span>Gift card</span>
            <span
              className="flex items-center gap-x-2 text-ui-fg-interactive"
              data-testid="cart-gift-card-amount"
              data-value={gift_card_total || 0}
            >
              -{" "}
              {convertToLocale({ amount: gift_card_total ?? 0, currency_code })}
              {isLoading && <Spinner size={16} />}
            </span>
          </div>
        )}
      </div>
      <div className="h-px w-full border-b border-gray-200 my-4" />
      <div className="flex items-center justify-between text-ui-fg-base mb-2 txt-medium ">
        <span>Total</span>
        <span
          className="txt-xlarge-plus flex items-center gap-x-2"
          data-testid="cart-total"
          data-value={total || 0}
        >
          {convertToLocale({ amount: total ?? 0, currency_code })}
          {isLoading && <Spinner size={16} />}
        </span>
      </div>
      <div className="h-px w-full border-b border-gray-200 mt-4" />
    </div>
  )
}

export default CartTotals
