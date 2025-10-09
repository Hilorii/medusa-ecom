"use client"

import { RadioGroup, Radio } from "@headlessui/react"
import { setShippingMethod } from "@lib/data/cart"
import { calculatePriceForShippingOption } from "@lib/data/fulfillment"
import { convertToLocale } from "@lib/util/money"
import { CheckCircleSolid, Loader } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Button, Heading, Text, clx } from "@medusajs/ui"
import ErrorMessage from "@modules/checkout/components/error-message"
import Divider from "@modules/common/components/divider"
import MedusaRadio from "@modules/common/components/radio"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { GgShippingEta } from "../delivery-time/index"

const PICKUP_OPTION_ON = "__PICKUP_ON"
const PICKUP_OPTION_OFF = "__PICKUP_OFF"

type ShippingOptionWithServiceZone = HttpTypes.StoreCartShippingOption & {
  service_zone?: {
    fulfillment_set?: {
      type?: string | null
      location?: {
        address?: {
          address_1?: string | null
          address_2?: string | null
          postal_code?: string | null
          city?: string | null
          country_code?: string | null
        } | null
      } | null
    } | null
  } | null
}

type ShippingProps = {
  cart: HttpTypes.StoreCart
  availableShippingMethods: ShippingOptionWithServiceZone[] | null
  initialCalculatedPrices?: Record<string, number> | undefined
}

function formatAddress(address: any) {
  if (!address) {
    return ""
  }

  let ret = ""

  if (address.address_1) {
    ret += ` ${address.address_1}`
  }

  if (address.address_2) {
    ret += `, ${address.address_2}`
  }

  if (address.postal_code) {
    ret += `, ${address.postal_code} ${address.city}`
  }

  if (address.country_code) {
    ret += `, ${address.country_code.toUpperCase()}`
  }

  return ret
}

const Shipping: React.FC<ShippingProps> = ({
  cart,
  availableShippingMethods,
  initialCalculatedPrices,
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPrices, setIsLoadingPrices] = useState(true)

  const [showPickupOptions, setShowPickupOptions] =
    useState<string>(PICKUP_OPTION_OFF)

  const [calculatedPricesMap, setCalculatedPricesMap] = useState<
    Record<string, number>
  >(() => ({ ...(initialCalculatedPrices ?? {}) }))

  const [error, setError] = useState<string | null>(null)

  // ✅ zawsze controlled: nigdy undefined
  const [shippingMethodId, setShippingMethodId] = useState<string | null>(
    cart.shipping_methods?.at(-1)?.shipping_option_id || null
  )

  const latestShippingMethod = cart.shipping_methods?.at(-1)

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "delivery"

  const { shippingMethods, pickupMethods } = useMemo(() => {
    const methods = availableShippingMethods ?? []

    return {
      shippingMethods: methods.filter(
        (sm) => sm.service_zone?.fulfillment_set?.type !== "pickup"
      ),
      pickupMethods: methods.filter(
        (sm) => sm.service_zone?.fulfillment_set?.type === "pickup"
      ),
    }
  }, [availableShippingMethods])

  const hasPickupOptions = pickupMethods.length > 0

  useEffect(() => {
    if (!pickupMethods.length) {
      return
    }

    if (pickupMethods.find((m) => m.id === shippingMethodId)) {
      setShowPickupOptions(PICKUP_OPTION_ON)
    }
  }, [pickupMethods, shippingMethodId])

  // Merge cen z propsa, jeśli przyszły po pierwszym renderze lub się zmieniły
  useEffect(() => {
    if (!initialCalculatedPrices) {
      return
    }

    setCalculatedPricesMap((prev) => {
      let didUpdate = false
      const next: Record<string, number> = { ...prev }

      Object.entries(initialCalculatedPrices).forEach(([id, amount]) => {
        if (typeof amount === "number" && next[id] !== amount) {
          didUpdate = true
          next[id] = amount
        }
      })

      return didUpdate ? next : prev
    })
  }, [initialCalculatedPrices])

  useEffect(() => {
    let cancelled = false

    if (!shippingMethods.length) {
      setCalculatedPricesMap((prev) => (Object.keys(prev).length ? {} : prev))
      setIsLoadingPrices((prev) => (prev ? false : prev))
      return
    }

    const calculatedOptions = shippingMethods.filter(
      (sm) => sm.price_type === "calculated"
    )

    if (!calculatedOptions.length) {
      setCalculatedPricesMap((prev) => (Object.keys(prev).length ? {} : prev))
      setIsLoadingPrices((prev) => (prev ? false : prev))
      return
    }

    // pobieramy tylko te kalkulowane opcje, których jeszcze nie mamy w mapie
    const missingCalculatedOptions = calculatedOptions.filter(
      (option) =>
        !Object.prototype.hasOwnProperty.call(calculatedPricesMap, option.id)
    )

    if (!missingCalculatedOptions.length) {
      setIsLoadingPrices((prev) => (prev ? false : prev))
      return
    }

    setIsLoadingPrices(true)

    Promise.allSettled(
      missingCalculatedOptions.map((sm) =>
        calculatePriceForShippingOption(sm.id, cart.id)
      )
    )
      .then((res) => {
        if (cancelled) return

        const pricesMap: Record<string, number> = {}
        res.forEach((result) => {
          if (
            result.status === "fulfilled" &&
            result.value?.id &&
            typeof result.value?.amount === "number"
          ) {
            pricesMap[result.value.id] = result.value.amount
          }
        })

        setCalculatedPricesMap((prev) => {
          if (!missingCalculatedOptions.length) {
            return prev
          }

          let didUpdate = false
          const next: Record<string, number> = { ...prev }

          missingCalculatedOptions.forEach((option) => {
            const amount = pricesMap[option.id]
            if (typeof amount === "number" && next[option.id] !== amount) {
              didUpdate = true
              next[option.id] = amount
            }
          })

          return didUpdate ? next : prev
        })
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPrices(false)
      })

    return () => {
      cancelled = true
    }
  }, [cart.id, shippingMethods, calculatedPricesMap])

  const handleEdit = () => {
    router.push(pathname + "?step=delivery", { scroll: false })
  }

  const handleSubmit = () => {
    router.push(pathname + "?step=payment", { scroll: false })
  }

  const handleSetShippingMethod = async (
    id: string,
    variant: "shipping" | "pickup"
  ) => {
    setError(null)

    if (variant === "pickup") {
      setShowPickupOptions(PICKUP_OPTION_ON)
    } else {
      setShowPickupOptions(PICKUP_OPTION_OFF)
    }

    if (id === shippingMethodId) {
      return
    }

    // ✅ trzymaj typ spójnie jako string | null
    let currentId: string | null = null
    setIsLoading(true)
    setShippingMethodId((prev) => {
      currentId = prev
      return id
    })

    await setShippingMethod({ cartId: cart.id, shippingMethodId: id })
      .catch((err) => {
        setShippingMethodId(currentId)
        setError(err.message)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  useEffect(() => {
    setError(null)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    router.prefetch(`${pathname}?step=payment`)
  }, [isOpen, pathname, router])

  // @ts-ignore
  // @ts-ignore
  return (
    <div className="bg-white">
      <div className="flex flex-row items-center justify-between mb-6">
        <Heading
          level="h2"
          className={clx(
            "flex flex-row text-3xl-regular gap-x-2 items-baseline",
            {
              "opacity-50 pointer-events-none select-none":
                !isOpen && cart.shipping_methods?.length === 0,
            }
          )}
        >
          Delivery
          {!isOpen && (cart.shipping_methods?.length ?? 0) > 0 && (
            <CheckCircleSolid />
          )}
        </Heading>
        {!isOpen &&
          cart?.shipping_address &&
          cart?.billing_address &&
          cart?.email && (
            <Text>
              <button
                onClick={handleEdit}
                className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
                data-testid="edit-delivery-button"
              >
                Edit
              </button>
            </Text>
          )}
      </div>
      {isOpen ? (
        <>
          <div className="grid">
            <div className="flex flex-col">
              <span className="font-medium txt-medium text-ui-fg-base">
                Shipping method
              </span>
              {/*<span className="mb-4 text-ui-fg-muted txt-medium">*/}
              {/*  How would you like you order delivered*/}
              {/*</span>*/}
              <GgShippingEta className="ml-1 mt-1 mb-3" />
            </div>
            <div data-testid="delivery-options-container">
              <div className="pb-8 md:pt-0 pt-2">
                {hasPickupOptions && (
                  <RadioGroup
                    value={showPickupOptions}
                    onChange={() => {
                      const id = pickupMethods.find(
                        (option) => !option.insufficient_inventory
                      )?.id
                      if (id) {
                        handleSetShippingMethod(id, "pickup")
                      }
                    }}
                  >
                    <Radio
                      value={PICKUP_OPTION_ON}
                      data-testid="delivery-option-radio"
                      className={clx(
                        "flex items-center justify-between text-small-regular cursor-pointer py-4 border rounded-rounded px-8 mb-2 hover:shadow-borders-interactive-with-active",
                        {
                          "border-ui-border-interactive":
                            showPickupOptions === PICKUP_OPTION_ON,
                        }
                      )}
                    >
                      <div className="flex items-center gap-x-4">
                        <MedusaRadio
                          checked={showPickupOptions === PICKUP_OPTION_ON}
                        />
                        <span className="text-base-regular">
                          Pick up your order
                        </span>
                      </div>
                      <span className="justify-self-end text-ui-fg-base">
                        -
                      </span>
                    </Radio>
                  </RadioGroup>
                )}

                {/* ✅ RadioGroup jest zawsze kontrolowane: value to string | null (nie undefined) */}
                <RadioGroup
                  value={shippingMethodId}
                  //@ts-ignore
                  onChange={(v) => handleSetShippingMethod(v, "shipping")}
                >
                  {shippingMethods?.map((option) => {
                    const isDisabled =
                      option.price_type === "calculated" &&
                      !isLoadingPrices &&
                      typeof calculatedPricesMap[option.id] !== "number"

                    return (
                      <Radio
                        key={option.id}
                        value={option.id}
                        data-testid="delivery-option-radio"
                        disabled={isDisabled}
                        className={clx(
                          "flex items-center justify-between text-small-regular cursor-pointer py-4 border rounded-rounded px-8 mb-2 hover:shadow-borders-interactive-with-active",
                          {
                            "border-ui-border-interactive":
                              option.id === shippingMethodId,
                            "hover:shadow-brders-none cursor-not-allowed":
                              isDisabled,
                          }
                        )}
                      >
                        <div className="flex items-center gap-x-4">
                          <MedusaRadio
                            checked={option.id === shippingMethodId}
                          />
                          <span className="text-base-regular">
                            {option.name}
                          </span>
                        </div>
                        <span className="justify-self-end text-ui-fg-base">
                          {option.price_type === "flat" ? (
                            convertToLocale({
                              amount: option.amount!,
                              currency_code: cart?.currency_code,
                            })
                          ) : calculatedPricesMap[option.id] ? (
                            convertToLocale({
                              amount: calculatedPricesMap[option.id],
                              currency_code: cart?.currency_code,
                            })
                          ) : isLoadingPrices ? (
                            <Loader />
                          ) : (
                            "-"
                          )}
                        </span>
                      </Radio>
                    )
                  })}
                </RadioGroup>
              </div>
            </div>
          </div>

          {showPickupOptions === PICKUP_OPTION_ON && (
            <div className="grid">
              <div className="flex flex-col">
                <span className="font-medium txt-medium text-ui-fg-base">
                  Store
                </span>
                <span className="mb-4 text-ui-fg-muted txt-medium">
                  Choose a store near you
                </span>
              </div>
              <div data-testid="delivery-options-container">
                <div className="pb-8 md:pt-0 pt-2">
                  <RadioGroup
                    value={shippingMethodId}
                    //@ts-ignore
                    onChange={(v) => handleSetShippingMethod(v, "pickup")}
                  >
                    {pickupMethods?.map((option) => {
                      return (
                        <Radio
                          key={option.id}
                          value={option.id}
                          disabled={option.insufficient_inventory}
                          data-testid="delivery-option-radio"
                          className={clx(
                            "flex items-center justify-between text-small-regular cursor-pointer py-4 border rounded-rounded px-8 mb-2 hover:shadow-borders-interactive-with-active",
                            {
                              "border-ui-border-interactive":
                                option.id === shippingMethodId,
                              "hover:shadow-brders-none cursor-not-allowed":
                                option.insufficient_inventory,
                            }
                          )}
                        >
                          <div className="flex items-start gap-x-4">
                            <MedusaRadio
                              checked={option.id === shippingMethodId}
                            />
                            <div className="flex flex-col">
                              <span className="text-base-regular">
                                {option.name}
                              </span>
                              <span className="text-base-regular text-ui-fg-muted">
                                {formatAddress(
                                  option.service_zone?.fulfillment_set?.location
                                    ?.address
                                )}
                              </span>
                            </div>
                          </div>
                          <span className="justify-self-end text-ui-fg-base">
                            {convertToLocale({
                              amount: option.amount!,
                              currency_code: cart?.currency_code,
                            })}
                          </span>
                        </Radio>
                      )
                    })}
                  </RadioGroup>
                </div>
              </div>
            </div>
          )}

          <div>
            <ErrorMessage
              error={error}
              data-testid="delivery-option-error-message"
            />
            <Button
              size="large"
              className="mt"
              onClick={handleSubmit}
              isLoading={isLoading}
              disabled={isLoading || !shippingMethodId}
              data-testid="submit-delivery-option-button"
            >
              Continue to payment
            </Button>
          </div>
        </>
      ) : (
        <div>
          <div className="text-small-regular">
            {cart &&
              (cart.shipping_methods?.length ?? 0) > 0 &&
              latestShippingMethod && (
                <div className="flex flex-col w-1/3">
                  <Text className="txt-medium-plus text-ui-fg-base mb-1">
                    Method
                  </Text>
                  <Text className="txt-medium text-ui-fg-subtle">
                    {latestShippingMethod.name}{" "}
                    {convertToLocale({
                      amount: latestShippingMethod.amount ?? 0,
                      currency_code: cart?.currency_code,
                    })}
                  </Text>
                </div>
              )}
          </div>
        </div>
      )}
      <Divider className="mt-8" />
    </div>
  )
}

export default Shipping
