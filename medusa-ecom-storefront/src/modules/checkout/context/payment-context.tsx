"use client"

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

export type CheckoutPaymentContextValue = {
  selectedPaymentMethod: string
  setSelectedPaymentMethod: (method: string) => void
  cardBrand: string | null
  setCardBrand: (brand: string | null) => void
  isCardComplete: boolean
  setIsCardComplete: (complete: boolean) => void
  blikCode: string
  setBlikCode: (code: string) => void
  isBlikValid: boolean
  setIsBlikValid: (valid: boolean) => void
}

const CheckoutPaymentContext =
  createContext<CheckoutPaymentContextValue | null>(null)

type CheckoutPaymentProviderProps = {
  initialMethod?: string
  children: React.ReactNode
}

export const CheckoutPaymentProvider = ({
  initialMethod = "",
  children,
}: CheckoutPaymentProviderProps) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState(initialMethod)
  const [cardBrand, setCardBrand] = useState<string | null>(null)
  const [isCardComplete, setIsCardComplete] = useState(false)
  const [blikCode, setBlikCode] = useState("")
  const [isBlikValid, setIsBlikValid] = useState(false)

  useEffect(() => {
    if (initialMethod) {
      setSelectedPaymentMethod(initialMethod)
    }
  }, [initialMethod])

  const value = useMemo(
    () => ({
      selectedPaymentMethod,
      setSelectedPaymentMethod,
      cardBrand,
      setCardBrand,
      isCardComplete,
      setIsCardComplete,
      blikCode,
      setBlikCode,
      isBlikValid,
      setIsBlikValid,
    }),
    [selectedPaymentMethod, cardBrand, isCardComplete, blikCode, isBlikValid]
  )

  return (
    <CheckoutPaymentContext.Provider value={value}>
      {children}
    </CheckoutPaymentContext.Provider>
  )
}

export const useCheckoutPayment = () => {
  const context = useContext(CheckoutPaymentContext)
  if (!context) {
    throw new Error(
      "useCheckoutPayment must be used within a CheckoutPaymentProvider"
    )
  }
  return context
}
