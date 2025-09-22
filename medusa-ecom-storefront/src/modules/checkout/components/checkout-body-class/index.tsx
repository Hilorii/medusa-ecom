"use client"

import { useEffect } from "react"

const CHECKOUT_BODY_CLASS = "gg-body--checkout"

const CheckoutBodyClass = () => {
  useEffect(() => {
    const { body } = document

    if (!body.classList.contains(CHECKOUT_BODY_CLASS)) {
      body.classList.add(CHECKOUT_BODY_CLASS)
    }

    return () => {
      body.classList.remove(CHECKOUT_BODY_CLASS)
    }
  }, [])

  return null
}

export default CheckoutBodyClass
