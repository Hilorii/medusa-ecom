// Used in navbar
"use client"

import { useRouter } from "next/navigation"
import { useRef, useState, useEffect } from "react"
import { FaShoppingCart } from "react-icons/fa"
import "./cart-bubble.css"

/** Six snap targets that match the CSS-friendly anchors. */
const positions = {
  "bottom-left": { bottom: 16, left: 16 },
  "bottom-right": { bottom: 16, right: 16 },
  "middle-left": { top: "50%", left: 16, transform: "translateY(-50%)" },
  "middle-right": { top: "50%", right: 16, transform: "translateY(-50%)" },
  "top-left": { top: 16, left: 16 },
  "top-right": { top: 16, right: 16 },
} as const

type PositionKey = keyof typeof positions
const STORAGE_KEY = "gg_cart_bubble_position"

const CartBubble = () => {
  const router = useRouter()

  // Persisted snap position ("top-left" | ...).
  const [position, setPosition] = useState<PositionKey>("bottom-right")

  // Drag state with absolute pixel coords while dragging.
  const [dragging, setDragging] = useState(false)
  const [tempPos, setTempPos] = useState<{ top: number; left: number } | null>(
    null
  )

  // Pointer offset within the bubble at grab moment (prevents jump).
  const offsetRef = useRef<{ dx: number; dy: number }>({ dx: 28, dy: 28 })

  // Load saved position on mount.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(
        STORAGE_KEY
      ) as PositionKey | null
      if (saved && positions[saved]) setPosition(saved)
    } catch {
      // Ignore storage errors (private mode, etc.)
    }
  }, [])

  // Save snap position on change.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, position)
    } catch {
      // Ignore storage errors
    }
  }, [position])

  /** Start dragging and remember pointer offset inside the bubble. */
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    // Keep the grabbed point under the cursor
    offsetRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top }
    el.setPointerCapture(e.pointerId)
    setDragging(true)
    setTempPos({
      top: e.clientY - offsetRef.current.dy,
      left: e.clientX - offsetRef.current.dx,
    })
  }

  /** Update dragged position while moving. */
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    setTempPos({
      top: e.clientY - offsetRef.current.dy,
      left: e.clientX - offsetRef.current.dx,
    })
  }

  /** End dragging and snap to one of six anchors. */
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    setDragging(false)
    setTempPos(null)

    const w = window.innerWidth
    const h = window.innerHeight
    const x = e.clientX
    const y = e.clientY

    const horiz: "left" | "right" = x < w / 2 ? "left" : "right"
    let vert: "top" | "middle" | "bottom"
    if (y < h / 3) vert = "top"
    else if (y < (h * 2) / 3) vert = "middle"
    else vert = "bottom"

    const key = `${vert}-${horiz}` as PositionKey
    setPosition(key)
  }

  /** Navigate to cart when not dragging. */
  const handleClick = () => {
    if (!dragging) router.push("/cart")
  }

  /** Inline style for fixed positioning (drag vs snap). */
  const style =
    dragging && tempPos
      ? { top: tempPos.top, left: tempPos.left }
      : positions[position]

  return (
    <div
      role="button"
      aria-label="Open cart"
      className={`gg-cart-bubble${dragging ? " is-dragging" : ""}`}
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
    >
      <FaShoppingCart className="gg-cart-bubble__icon" />
    </div>
  )
}

export default CartBubble
