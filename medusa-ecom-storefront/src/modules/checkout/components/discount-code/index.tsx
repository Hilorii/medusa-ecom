// File: modules/cart/components/discount-code/index.tsx
// Fixed types error (StoreCartPromotion vs StorePromotion) by using a PromotionLike
// helper type that captures only the fields we actually need. Also ensures correct
// money handling (Medusa uses MINOR UNITS) and keeps your gg-* class prefix.
// All comments are in English.

"use client"

import { Badge, Heading, Input, Label, Text } from "@medusajs/ui"
import React, { useActionState } from "react"

import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import Trash from "@modules/common/icons/trash"
import ErrorMessage from "../error-message"
import { SubmitButton } from "../submit-button"
import {
  applyPromotions,
  removeDiscount,
  submitPromotionForm,
} from "@lib/data/cart"
import "./discount-code.css"

type DiscountCodeProps = {
  cart: HttpTypes.StoreCart & {
    promotions: HttpTypes.StorePromotion[] | HttpTypes.StoreCartPromotion[]
  }
}

/** Narrow helper type to avoid mismatch between StorePromotion and StoreCartPromotion */
type PromotionLike = {
  id: string
  code?: string | null
  is_automatic?: boolean | null
  application_method?: {
    type?: "percentage" | "fixed" | string
    /** For percentage: a number like 10. For fixed: amount in MINOR UNITS. */
    value?: number | string | null
    /** Required when type === "fixed" */
    currency_code?: string | null
  } | null
}

const DiscountCode: React.FC<DiscountCodeProps> = ({ cart }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [message, formAction] = useActionState(submitPromotionForm, null)

  const promotions = (cart.promotions ?? []) as PromotionLike[]

  // Remove a promotion code on the server
  const removePromotionCode = async (code: string) => {
    await removeDiscount(code)
  }

  // Add a new promotion code and re-apply
  const addPromotionCode = async (formData: FormData) => {
    const code = formData.get("code")
    if (!code) return

    const input = document.getElementById(
      "promotion-input"
    ) as HTMLInputElement | null
    const codes = promotions.filter((p) => !!p.code).map((p) => p.code!)
    codes.push(String(code))

    await applyPromotions(codes)
    if (input) input.value = ""
  }

  /** Render the numeric/percentage value for a promotion in a safe, typed way */
  const renderPromotionValue = (promotion: PromotionLike) => {
    const am = promotion.application_method
    if (!am) return null

    if (am.type === "percentage") {
      const pct =
        typeof am.value === "number"
          ? am.value
          : Number.isFinite(Number(am.value))
          ? Number(am.value)
          : 0
      return <>{pct}%</>
    }

    if (am.type === "fixed" && am.currency_code) {
      // Medusa returns money amounts in MINOR UNITS (e.g., cents)
      const minor =
        typeof am.value === "number"
          ? am.value
          : Number.isFinite(Number(am.value))
          ? Number(am.value)
          : 0

      return (
        <>
          {convertToLocale({
            amount: minor,
            currency_code: am.currency_code,
          })}
        </>
      )
    }

    return null
  }

  return (
    <div className="gg-coupon gg-glass gg-elevate">
      {/* Header + toggle */}
      <div className="gg-coupon-head">
        <Label htmlFor="promotion-input" className="gg-coupon-label">
          Promotion code
        </Label>

        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="gg-coupon-toggle"
          data-testid="add-discount-button"
          aria-expanded={isOpen}
          aria-controls="gg-coupon-form"
        >
          {isOpen ? "Hide" : "Add code"}
        </button>
      </div>

      {/* Add code form */}
      {isOpen && (
        <form
          id="gg-coupon-form"
          action={(fd) => addPromotionCode(fd)}
          className="gg-coupon-form"
          noValidate
        >
          <Input
            id="promotion-input"
            name="code"
            type="text"
            autoFocus={false}
            data-testid="discount-input"
            placeholder="Enter promo code"
            className="gg-input"
          />
          <SubmitButton
            variant="secondary"
            data-testid="discount-apply-button"
            className="gg-apply-btn"
          >
            Apply
          </SubmitButton>

          <div className="gg-coupon-error">
            <ErrorMessage
              error={message}
              data-testid="discount-error-message"
            />
          </div>
        </form>
      )}

      {/* Applied promotions */}
      {promotions.length > 0 && (
        <div className="gg-promo-list-wrap">
          <Heading className="gg-promo-title">Promotion(s) applied</Heading>

          <ul className="gg-promo-list">
            {promotions.map((promotion) => {
              const am = promotion.application_method

              const showValue =
                !!am &&
                ((am.type === "percentage" &&
                  am.value !== undefined &&
                  am.value !== null) ||
                  (am.type === "fixed" &&
                    !!am.currency_code &&
                    am.value !== undefined &&
                    am.value !== null))

              return (
                <li
                  key={promotion.id}
                  className="gg-promo-row"
                  data-testid="discount-row"
                >
                  <div className="gg-promo-info">
                    <Badge
                      color={promotion.is_automatic ? "green" : "grey"}
                      size="small"
                      className="gg-badge"
                    >
                      {promotion.code ?? "automatic"}
                    </Badge>

                    {showValue && (
                      <Text className="gg-promo-amount" as="span">
                        ({renderPromotionValue(promotion)})
                      </Text>
                    )}
                  </div>

                  {!promotion.is_automatic && promotion.code && (
                    <button
                      className="gg-remove-btn"
                      onClick={() => removePromotionCode(promotion.code!)}
                      data-testid="remove-discount-button"
                      aria-label="Remove discount code from order"
                      title="Remove"
                      type="button"
                    >
                      <Trash size={14} />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

export default DiscountCode
