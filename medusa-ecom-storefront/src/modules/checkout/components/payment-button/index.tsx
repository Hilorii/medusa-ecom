"use client"

import { isManual, isStripe } from "@lib/constants"
// ⬇️ Import the client-safe placeOrder helper
import { placeOrder } from "@lib/client/cart"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import { useElements, useStripe } from "@stripe/react-stripe-js"
import React, { useState } from "react"
import ErrorMessage from "../error-message"
import { useRouter, useParams } from "next/navigation"
import { useCheckoutPayment } from "@modules/checkout/context/payment-context"

type PaymentButtonProps = {
  cart: HttpTypes.StoreCart
  "data-testid": string
}

const isStripeSessionReady = (status?: string | null) =>
  status === "pending" || status === "requires_more"

const PaymentButton: React.FC<PaymentButtonProps> = ({
  cart,
  "data-testid": dataTestId,
}) => {
  const notReady =
    !cart ||
    !cart.shipping_address ||
    !cart.billing_address ||
    !cart.email ||
    (cart.shipping_methods?.length ?? 0) < 1

  const paymentSession = cart.payment_collection?.payment_sessions?.[0]

  switch (true) {
    case isStripe(paymentSession?.provider_id):
      return (
        <StripePaymentButton
          notReady={notReady}
          cart={cart}
          data-testid={dataTestId}
        />
      )
    case isManual(paymentSession?.provider_id):
      // ⬇️ Pass cart so we can call placeOrder(cart.id)
      return (
        <ManualTestPaymentButton
          cart={cart}
          notReady={notReady}
          data-testid={dataTestId}
        />
      )
    default:
      return <Button disabled>Select a payment method</Button>
  }
}

const StripePaymentButton = ({
  cart,
  notReady,
  "data-testid": dataTestId,
}: {
  cart: HttpTypes.StoreCart
  notReady: boolean
  "data-testid"?: string
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }
  const { selectedPaymentMethod, blikCode, isBlikValid } = useCheckoutPayment()

  const onPaymentCompleted = async () => {
    // ⬇️ Use cart.id when placing the order
    await placeOrder(cart.id)
      .then((res) => {
        if (res.type === "order") {
          router.push(`/${countryCode}/order/${res.order.id}/confirmed`)
        } else {
          router.refresh()
        }
      })
      .catch((err) => {
        setErrorMessage(err.message)
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  const stripe = useStripe()
  const elements = useElements()
  const card = elements?.getElement("card")

  const session =
    cart.payment_collection?.payment_sessions?.find(
      (s) =>
        isStripeSessionReady(s.status) &&
        s.provider_id === selectedPaymentMethod
    ) ??
    cart.payment_collection?.payment_sessions?.find((s) =>
      isStripeSessionReady(s.status)
    )

  const disabled = !stripe || !elements ? true : false

  const billingDetails = {
    name:
      (
        (cart.billing_address?.first_name || "") +
        " " +
        (cart.billing_address?.last_name || "")
      ).trim() || undefined,
    address: {
      city: cart.billing_address?.city ?? undefined,
      country: cart.billing_address?.country_code?.toUpperCase() ?? undefined,
      line1: cart.billing_address?.address_1 ?? undefined,
      line2: cart.billing_address?.address_2 ?? undefined,
      postal_code: cart.billing_address?.postal_code ?? undefined,
      state: cart.billing_address?.province ?? undefined,
    },
    email: cart.email ?? undefined,
    phone: cart.billing_address?.phone ?? undefined,
  }

  const ensureClientSecret = () => {
    const secret = session?.data?.client_secret as string | undefined
    if (!secret) {
      throw new Error("Missing Stripe client secret for the payment session")
    }
    return secret
  }
  const handleCardPayment = async () => {
    if (!stripe || !elements || !card || !cart) {
      throw new Error("Stripe is not ready to process card payments")
    }

    const { error, paymentIntent } = await stripe.confirmCardPayment(
      ensureClientSecret(),
      {
        payment_method: {
          card: card,
          billing_details: billingDetails,
        },
      }
    )
    if (error) {
      const pi = error.payment_intent

      if (
        (pi && pi.status === "requires_capture") ||
        (pi && pi.status === "succeeded")
      ) {
        await onPaymentCompleted()
      }

      throw new Error(error.message || "Payment failed")
    }

    if (
      (paymentIntent && paymentIntent.status === "requires_capture") ||
      paymentIntent?.status === "succeeded"
    ) {
      await onPaymentCompleted()
    }
  }

  const handleBlikPayment = async () => {
    if (!stripe) {
      throw new Error("Stripe is not ready to process BLIK payments")
    }

    if (!isBlikValid) {
      throw new Error("Enter a valid 6-digit BLIK code")
    }

    const { error, paymentIntent } = await stripe.confirmBlikPayment(
      ensureClientSecret(),
      {
        payment_method: {
          billing_details: billingDetails,
        },
        payment_method_options: {
          blik: { code: blikCode },
        },
      }
    )

    if (error) {
      const pi = error.payment_intent
      if (
        (pi && pi.status === "requires_capture") ||
        (pi && pi.status === "succeeded")
      ) {
        await onPaymentCompleted()
      }
      throw new Error(error.message || "BLIK payment failed")
    }

    if (
      paymentIntent &&
      (paymentIntent.status === "requires_capture" ||
        paymentIntent.status === "succeeded")
    ) {
      await onPaymentCompleted()
    }
  }

  const handleP24Payment = async () => {
    if (!stripe) {
      throw new Error("Stripe is not ready to process Przelewy24 payments")
    }

    const returnUrl = `${window.location.origin}/${countryCode}/checkout?step=review`
    const { error, paymentIntent } = await stripe.confirmP24Payment(
      ensureClientSecret(),
      {
        payment_method: {
          // @ts-ignore
          billing_details: billingDetails,
        },
        payment_method_options: {
          p24: { tos_shown_and_accepted: true },
        },
        return_url: returnUrl,
      }
    )

    if (error) {
      const pi = error.payment_intent
      if (
        (pi && pi.status === "requires_capture") ||
        (pi && pi.status === "succeeded")
      ) {
        await onPaymentCompleted()
      }
      throw new Error(error.message || "Przelewy24 payment failed")
    }

    if (
      paymentIntent &&
      (paymentIntent.status === "requires_capture" ||
        paymentIntent.status === "succeeded")
    ) {
      await onPaymentCompleted()
    }
  }

  const handleStripePayPal = async () => {
    if (!stripe) {
      throw new Error("Stripe is not ready to process PayPal payments")
    }

    const returnUrl = `${window.location.origin}/${countryCode}/checkout?step=review`
    const { error, paymentIntent } = await stripe.confirmPayPalPayment(
      ensureClientSecret(),
      {
        return_url: returnUrl,
        payment_method: {
          billing_details: billingDetails,
        },
      }
    )

    if (error) {
      const pi = error.payment_intent
      if (
        (pi && pi.status === "requires_capture") ||
        (pi && pi.status === "succeeded")
      ) {
        await onPaymentCompleted()
      }
      throw new Error(error.message || "PayPal payment failed")
    }

    if (
      paymentIntent &&
      (paymentIntent.status === "requires_capture" ||
        paymentIntent.status === "succeeded")
    ) {
      await onPaymentCompleted()
    }
  }

  const handleWalletPayment = async (wallet: "apple" | "google") => {
    if (!stripe) {
      throw new Error("Stripe is not ready to process wallet payments")
    }
    // @ts-ignore
    const amount = cart.total ?? cart.total_amount ?? 0
    if (!amount) {
      throw new Error("Cart total is missing")
    }

    const country =
      cart.billing_address?.country_code ||
      cart.shipping_address?.country_code ||
      cart.region?.countries?.[0]?.iso_2 ||
      "US"

    const paymentRequest = stripe.paymentRequest({
      country: country.toUpperCase(),
      currency: cart.region?.currency_code ?? "usd",
      total: {
        label: "Total",
        amount,
      },
      requestPayerName: true,
      requestPayerEmail: true,
      requestShipping: false,
    })

    const canMakePayment = await paymentRequest.canMakePayment()

    if (!canMakePayment || (wallet === "apple" && !canMakePayment.applePay)) {
      throw new Error("Apple Pay is not available on this device")
    }

    if (wallet === "google" && !canMakePayment.googlePay) {
      throw new Error("Google Pay is not available on this device")
    }

    paymentRequest.on("paymentmethod", async (event) => {
      const { error: confirmError } = await stripe.confirmCardPayment(
        ensureClientSecret(),
        {
          payment_method: event.paymentMethod.id,
        },
        { handleActions: false }
      )

      if (confirmError) {
        event.complete("fail")
        setErrorMessage(confirmError.message || "Payment failed")
        setSubmitting(false)

        return
      }

      event.complete("success")

      const { error: nextError, paymentIntent } =
        await stripe.confirmCardPayment(ensureClientSecret())

      if (nextError) {
        setErrorMessage(nextError.message || "Payment failed")
        setSubmitting(false)
        return
      }

      if (
        paymentIntent &&
        (paymentIntent.status === "requires_capture" ||
          paymentIntent.status === "succeeded")
      ) {
        await onPaymentCompleted()
      }

      setSubmitting(false)
    })

    paymentRequest.on("cancel", () => {
      setSubmitting(false)
    })

    paymentRequest.show()
  }

  const handlePayment = async () => {
    setSubmitting(true)
    setErrorMessage(null)

    try {
      if (!session || !selectedPaymentMethod) {
        throw new Error("No payment session is available")
      }

      switch (selectedPaymentMethod) {
        case "pp_stripe_stripe":
          await handleCardPayment()
          break
        case "pp_stripe-blik_stripe":
          await handleBlikPayment()
          break
        case "pp_stripe-przelewy24_stripe":
          await handleP24Payment()
          break
        case "pp_stripe-apple-pay_stripe":
          await handleWalletPayment("apple")
          return
        case "pp_stripe-google-pay_stripe":
          await handleWalletPayment("google")
          return
        case "pp_stripe-paypal_stripe":
          await handleStripePayPal()
          break
        default:
          if (!stripe || !elements || !card) {
            throw new Error("Stripe is not ready to process this payment")
          }
          await handleCardPayment()
      }

      setSubmitting(false)
    } catch (err: any) {
      setErrorMessage(err.message || "Payment failed")
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button
        disabled={disabled || notReady}
        onClick={handlePayment}
        size="large"
        isLoading={submitting}
        data-testid={dataTestId}
      >
        Place order
      </Button>
      <ErrorMessage
        error={errorMessage}
        data-testid="stripe-payment-error-message"
      />
    </>
  )
}

const ManualTestPaymentButton = ({
  cart,
  notReady,
  "data-testid": dataTestId,
}: {
  cart: HttpTypes.StoreCart
  notReady: boolean
  "data-testid"?: string
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }

  const onPaymentCompleted = async () => {
    // ⬇️ Use cart.id when placing the order
    await placeOrder(cart.id)
      .then((res) => {
        if (res.type === "order") {
          router.push(`/${countryCode}/order/${res.order.id}/confirmed`)
        } else {
          router.refresh()
        }
      })
      .catch((err) => {
        setErrorMessage(err.message)
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  const handlePayment = () => {
    setSubmitting(true)
    onPaymentCompleted()
  }

  return (
    <>
      <Button
        disabled={notReady}
        isLoading={submitting}
        onClick={handlePayment}
        size="large"
        data-testid={dataTestId || "submit-order-button"}
      >
        Place order
      </Button>
      <ErrorMessage
        error={errorMessage}
        data-testid="manual-payment-error-message"
      />
    </>
  )
}

export default PaymentButton
