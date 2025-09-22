"use client"

import { useEffect, useState } from "react"
import "./scroll-up-btn.css"

const SHOW_AT_PX = 240 // szybciej pojawia się na małych ekranach

const ScrollUpButton = () => {
  const [visible, setVisible] = useState(false)

  // Toggle visibility on scroll with rAF (płynnie i oszczędnie)
  useEffect(() => {
    let ticking = false

    const update = () => {
      setVisible(window.scrollY > SHOW_AT_PX)
      ticking = false
    }

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update)
        ticking = true
      }
    }

    // start + nasłuchiwanie
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Smooth scroll top
  const handleClick = () => {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch {
      window.scrollTo(0, 0)
    }
  }

  // Keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <button
      type="button"
      aria-label="Scroll to top"
      className={`gg-scroll-up${visible ? " gg-scroll-up--visible" : ""}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Ikona: minimalistyczna strzałka + kropka (nowoczesny akcent) */}
      <svg
        className="gg-scroll-up__icon"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M12 4.75a.9.9 0 0 1 .64.27l6.2 6.2a.9.9 0 1 1-1.27 1.27L12.9 7.69V18.5a.9.9 0 1 1-1.8 0V7.69l-4.67 4.8a.9.9 0 1 1-1.28-1.27l6.2-6.2a.9.9 0 0 1 .65-.27Z" />
        <circle cx="12" cy="20" r="1" />
      </svg>
      <span className="gg-su-sr-only">Back to top</span>
    </button>
  )
}

export default ScrollUpButton
