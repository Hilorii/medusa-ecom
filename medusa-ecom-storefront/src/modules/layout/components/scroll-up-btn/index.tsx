"use client"

import { useEffect, useState } from "react"
import "./scroll-up-btn.css"

const SHOW_AT_PX = 280 // Show the button after scrolling this many pixels

const ScrollUpButton = () => {
  const [visible, setVisible] = useState(false)

  // Toggle visibility on scroll with rAF to keep it smooth
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

    // Initialize and listen
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Scroll to top smoothly
  const handleClick = () => {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch {
      // Fallback for very old browsers
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
      {/* Icon: inline SVG to avoid extra deps */}
      <svg
        className="gg-scroll-up__icon"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M12 5l-6.5 6.5a1 1 0 0 0 1.4 1.4L12 8.3l5.6 4.6a1 1 0 0 0 1.3-1.5L12 5z" />
      </svg>
      <span className="gg-su-sr-only">Back to top</span>
    </button>
  )
}

export default ScrollUpButton
