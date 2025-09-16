"use client"

import React, { useEffect, useRef } from "react"
import "./design-generate-component.css"

type Props = {
  open: boolean
  onClose: () => void
}

export default function DesignGenerateComponent({ open, onClose }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null)

  // Prevent body scroll while the sheet is open
  useEffect(() => {
    const prev = document.body.style.overflow
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = prev || ""
    }
    return () => {
      document.body.style.overflow = prev || ""
    }
  }, [open])

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (open) window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  // Close when clicking the dimmed backdrop (but not inner content)
  const onBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="gg-gen-overlay"
      role="presentation"
      onClick={onBackdropClick}
    >
      <div
        className="gg-gen-sheet gg-open"
        role="dialog"
        aria-modal="true"
        aria-label="Generate artwork"
        ref={sheetRef}
        // Stop any clicks/touches from bubbling to the overlay
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="gg-gen-close"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>

        {/* Empty canvas area for future generator UI */}
        <div className="gg-gen-body">
          {/* Intentionally left blank for your upcoming tools/UI */}
        </div>
      </div>
    </div>
  )
}
