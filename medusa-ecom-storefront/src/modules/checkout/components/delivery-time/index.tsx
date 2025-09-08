"use client"

import { useEffect, useState } from "react"

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
    <span className={`gg-shipping-eta text-sm text-neutral-600 ${className}`}>
      {/* Keep the message in English as requested */}
      Due to popular demand shipping time: {weeks} weeks
    </span>
  )
}
