"use client"

import { Badge, Heading, Input, Label, Text } from "@medusajs/ui"
import React, { useActionState } from "react"

import { applyPromotions, submitPromotionForm } from "@lib/data/cart"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import Trash from "@modules/common/icons/trash"
import ErrorMessage from "../error-message"
import { SubmitButton } from "../submit-button"

import "./discount-code.css"

type DiscountCodeProps = {
  cart: HttpTypes.StoreCart & {
    promotions: HttpTypes.StorePromotion[]
  }
}

const DiscountCode: React.FC<DiscountCodeProps> = ({ cart }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [message, formAction] = useActionState(submitPromotionForm, null)

  const { promotions = [] } = cart

  const removePromotionCode = async (code: string) => {
    const validPromotions = promotions.filter((p) => p.code !== code)
    await applyPromotions(
      validPromotions.filter((p) => p.code === undefined).map((p) => p.code!)
    )
  }

  const addPromotionCode = async (formData: FormData) => {
    const code = formData.get("code")
    if (!code) return

    const input = document.getElementById("promotion-input") as HTMLInputElement
    const codes = promotions
      .filter((p) => p.code === undefined)
      .map((p) => p.code!)
    codes.push(code.toString())

    await applyPromotions(codes)
    if (input) input.value = ""
  }

  return (
    <div className="rrc-coupon rrc-glass rrc-elevate">
      {/* Nagłówek + toggle */}
      <div className="rrc-coupon-head">
        <Label htmlFor="promotion-input" className="rrc-coupon-label">
          Promotion code
        </Label>

        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="rrc-coupon-toggle"
          data-testid="add-discount-button"
          aria-expanded={isOpen}
          aria-controls="rrc-coupon-form"
        >
          {isOpen ? "Hide" : "Add code"}
        </button>
      </div>

      {/* Formularz dodawania kodu */}
      {isOpen && (
        <form
          id="rrc-coupon-form"
          action={(fd) => addPromotionCode(fd)}
          className="rrc-coupon-form"
          noValidate
        >
          <Input
            id="promotion-input"
            name="code"
            type="text"
            autoFocus={false}
            data-testid="discount-input"
            placeholder="Enter promo code"
            className="rrc-input"
          />
          <SubmitButton
            variant="secondary"
            data-testid="discount-apply-button"
            className="rrc-apply-btn"
          >
            Apply
          </SubmitButton>

          <div className="rrc-coupon-error">
            <ErrorMessage
              error={message}
              data-testid="discount-error-message"
            />
          </div>
        </form>
      )}

      {/* Lista zastosowanych promocji */}
      {promotions.length > 0 && (
        <div className="rrc-promo-list-wrap">
          <Heading className="rrc-promo-title">Promotion(s) applied</Heading>

          <ul className="rrc-promo-list">
            {promotions.map((promotion) => {
              const showValue =
                promotion.application_method?.value !== undefined &&
                promotion.application_method?.currency_code !== undefined
              return (
                <li
                  key={promotion.id}
                  className="rrc-promo-row"
                  data-testid="discount-row"
                >
                  <div className="rrc-promo-info">
                    <Badge
                      color={promotion.is_automatic ? "green" : "grey"}
                      size="small"
                      className="rrc-badge"
                    >
                      {promotion.code}
                    </Badge>

                    {showValue && (
                      <Text className="rrc-promo-amount" as="span">
                        (
                        {promotion.application_method!.type === "percentage"
                          ? `${promotion.application_method!.value}%`
                          : convertToLocale({
                              amount: promotion.application_method!.value!,
                              currency_code:
                                promotion.application_method!.currency_code!,
                            })}
                        )
                      </Text>
                    )}
                  </div>

                  {!promotion.is_automatic && (
                    <button
                      className="rrc-remove-btn"
                      onClick={() => {
                        if (!promotion.code) return
                        removePromotionCode(promotion.code)
                      }}
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
