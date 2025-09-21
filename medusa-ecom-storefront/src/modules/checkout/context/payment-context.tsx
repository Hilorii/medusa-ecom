"use client"

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

const BLIK_CODE_STORAGE_KEY = "checkout-blik-code"

const normalizeBlikCode = (value: string | null) =>
  value && /^\d{1,6}$/.test(value) ? value : ""

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
  const storedBlikCodeRef = useRef<string | null>(null)

  const loadStoredBlikCode = () => {
    if (storedBlikCodeRef.current !== null) {
      return storedBlikCodeRef.current
    }

    if (typeof window === "undefined") {
      storedBlikCodeRef.current = ""
      return ""
    }

    const stored = window.sessionStorage.getItem(BLIK_CODE_STORAGE_KEY)
    const normalized = normalizeBlikCode(stored)
    storedBlikCodeRef.current = normalized
    return normalized
  }
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState(initialMethod)
  const [cardBrand, setCardBrand] = useState<string | null>(null)
  const [isCardComplete, setIsCardComplete] = useState(false)
  const [blikCode, setBlikCode] = useState(() => loadStoredBlikCode())
  const [isBlikValid, setIsBlikValid] = useState(
    () => loadStoredBlikCode().length === 6
  )

  useEffect(() => {
    if (initialMethod) {
      setSelectedPaymentMethod(initialMethod)
    }
  }, [initialMethod])

  useEffect(() => {
    storedBlikCodeRef.current = blikCode

    if (typeof window === "undefined") {
      return
    }

    if (blikCode) {
      window.sessionStorage.setItem(BLIK_CODE_STORAGE_KEY, blikCode)
    } else {
      window.sessionStorage.removeItem(BLIK_CODE_STORAGE_KEY)
    }
  }, [blikCode])

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
