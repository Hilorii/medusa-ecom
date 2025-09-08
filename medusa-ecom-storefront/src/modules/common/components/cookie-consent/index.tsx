"use client"

import { useEffect, useState } from "react"
import "./cookie-consent.css"

const CookieConsent = () => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = document.cookie
      .split("; ")
      .find((row) => row.startsWith("cookie_consent="))
    if (!consent) {
      setVisible(true)
    }
  }, [])

  const setConsent = (value: string) => {
    const maxAge = 60 * 60 * 24 * 365 // 1 year
    document.cookie = `cookie_consent=${value}; path=/; max-age=${maxAge}`
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="cookie-banner">
      <span className="cookie-text">
        This site uses cookies to enhance your experience. Choose your
        preference:
      </span>
      <div className="cookie-buttons">
        {/*<button onClick={() => setConsent("all")} className="btn-primary">*/}
        {/*  Accept All*/}
        {/*</button>*/}
        <button
          onClick={() => setConsent("essential")}
          className="cookie-btn-primary"
        >
          Essential only
        </button>
        {/*<button*/}
        {/*  onClick={() => setConsent("essential")}*/}
        {/*  className="cookie-btn-secondary"*/}
        {/*>*/}
        {/*  Essential Only*/}
        {/*</button>*/}
      </div>
    </div>
  )
}

export default CookieConsent
