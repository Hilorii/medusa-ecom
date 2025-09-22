"use client"

import {
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react"
import { HiOutlineQuestionMarkCircle } from "react-icons/hi2"

type LeadTimeResponse = {
  weeks: number
  meta?: {
    backlog_count?: number
    z?: number
    base?: number
    divisor?: number
    mode?: string
  }
}

export function GgShippingEta({ className = "" }: { className?: string }) {
  // Keep UI state simple: null until loaded
  const [weeks, setWeeks] = useState<number | null>(null)

  useEffect(() => {
    // Resolve backend base URL once and normalize it
    const RAW =
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
      process.env.NEXT_PUBLIC_MEDUSA_URL ||
      "http://localhost:9000"
    const BASE = RAW.trim().replace(/\/+$/, "")

    // Build headers; include PAK if your store routes require it
    const headers: Record<string, string> = { Accept: "application/json" }
    const pak =
      process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_MEDUSA_PAK
    if (pak) headers["x-publishable-api-key"] = pak

    // Fetch lead time; keep logic on backend
    fetch(`${BASE}/store/delivery-time`, {
      headers,
      credentials: "include", // safe even if not needed
    })
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))
      )
      .then((data: LeadTimeResponse) => setWeeks(data.weeks))
      .catch(() => {
        // Optional: silent fail or set a fallback
        setWeeks(null)
      })
  }, [])

  if (weeks == null) return null

  return (
    <span
      className={`gg-shipping-eta inline-flex items-center gap-1 text-sm text-neutral-600 ${className}`}
    >
      {/* Keep the message in English as requested */}
      <span>Due to popular demand shipping time: {weeks} weeks</span>
      <InfoTooltip message="Delivery time depends on the volume of orders because each piece is handmade from start to finish. Thank you for understanding." />
    </span>
  )
}

function InfoTooltip({ message }: { message: string }) {
  const [open, setOpen] = useState(false)
  const tooltipId = useId()
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const pointerTypeRef = useRef<string | null>(null)

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
    }
  }, [open])

  const show = () => setOpen(true)
  const hide = () => setOpen(false)
  const toggle = () => setOpen((prev) => !prev)

  const handleFocus = () => {
    pointerTypeRef.current = "keyboard"
    show()
  }

  const handleBlur = () => {
    pointerTypeRef.current = null
    hide()
  }

  const handlePointerEnter = (event: ReactPointerEvent<HTMLButtonElement>) => {
    pointerTypeRef.current = event.pointerType

    if (event.pointerType === "mouse") show()
  }

  const handlePointerLeave = (event: ReactPointerEvent<HTMLButtonElement>) => {
    pointerTypeRef.current = event.pointerType

    if (event.pointerType === "mouse") hide()
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    pointerTypeRef.current = event.pointerType
  }

  const handleClick = () => {
    if (
      pointerTypeRef.current === "mouse" ||
      pointerTypeRef.current === "keyboard"
    ) {
      return
    }

    toggle()
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape") {
      hide()
      event.currentTarget.blur()
    }
  }

  return (
    <span ref={wrapperRef} className="relative inline-flex">
      <button
        type="button"
        aria-label="Learn why delivery time may vary"
        aria-describedby={open ? tooltipId : undefined}
        className="inline-flex h-5 w-5 items-center justify-center text-neutral-400 transition-colors hover:text-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-300"
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <HiOutlineQuestionMarkCircle aria-hidden className="h-4 w-4" />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className={`absolute bottom-[calc(100%+0.5rem)] left-1/2 z-20 w-64 max-w-xs -translate-x-1/2 rounded-md bg-neutral-900 px-3 py-2 text-left text-xs leading-snug text-white shadow-lg transition-all duration-150 ease-out after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-neutral-900 ${
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-1 opacity-0"
        }`}
      >
        {message}
      </span>
    </span>
  )
}
