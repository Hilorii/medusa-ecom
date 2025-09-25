"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import "./design.css"
import {
  getDesignConfig,
  previewPrice,
  uploadArtwork,
  addDesignToCart,
  setCartCookie,
} from "@lib/client/gg-store"

// Bottom-sheet component
import DesignGenerateComponent from "./design-generate-component"

/**
 * Medusa v2 integrations:
 * - GET /store/designs/config
 * - POST /store/designs/price
 * - POST /store/designs/upload
 * - POST /store/designs/add
 * - POST /api/gg/cart/set (cookies persist)
 *
 * Key points:
 * - Colors are disabled based on the selected material (flavor).
 * - Materials are never disabled.
 * - On material pick, color is reset to force a valid combo.
 * - Disabled colors show a tooltip.
 */

// ---------------- Types ----------------
type StepId = "size" | "artwork" | "flavor" | "color" | "summary"

type Artwork =
  | { source: "upload"; name: string; dataUrl: string }
  | {
      source: "example"
      name: "example1.png" | "example2.png"
      dataUrl: string
    }

type Selections = {
  art?: Artwork
  size?: string
  flavor?: string // maps to backend "material"
  color?: string
}

type OptionCommon = { id: string; label: string }
type SizeDef = OptionCommon & { wCm: number; hCm: number; basePriceEur: number }
type FlavorDef = OptionCommon & {
  priceDeltaEur: number
  intensity?: number
}
type ColorDef = OptionCommon & {
  swatch: string
  hue: number
  priceDeltaEur: number
}

type CurrencyCode = "EUR" | "USD" | "GBP" | "PLN"

const FALLBACK_CURRENCY: CurrencyCode = "EUR"
const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  PLN: "zł",
}

function normalizeCurrencyCode(raw?: string | null): CurrencyCode {
  if (!raw) return FALLBACK_CURRENCY
  const value = String(raw).trim()
  if (!value) return FALLBACK_CURRENCY

  const upper = value.toUpperCase()
  if (upper === "EUR" || value === "€") return "EUR"
  if (upper === "USD" || value === "$") return "USD"
  if (upper === "GBP" || value === "£") return "GBP"
  if (upper === "PLN" || upper === "ZŁ" || value.toLowerCase() === "zł")
    return "PLN"

  return FALLBACK_CURRENCY
}

function symbolForCurrency(code: CurrencyCode): string {
  return CURRENCY_SYMBOLS[code] || code
}

// ---------------- Incompatibility map ----------------
const INCOMPATIBLE: Record<string, string[]> = {
  galaxy: ["white"],
}

// ---------------- Utils ----------------
const STORAGE_KEY = "design-your-own-v4"
function cx(...c: (string | false | undefined)[]) {
  return c.filter(Boolean).join(" ")
}
/** Returns true if a given color is blocked by the selected flavor. */
function isColorBlockedByFlavor(flavorId?: string, colorId?: string) {
  if (!flavorId || !colorId) return false
  const dis = INCOMPATIBLE[flavorId]
  return Array.isArray(dis) && dis.includes(colorId)
}
/** Extracts a cart id from various server response shapes. */
function extractCartId(resp: any): string | undefined {
  if (resp?.cart_id) return String(resp.cart_id)
  if (resp?.id) return String(resp.id)
  if (resp?.cart?.id) return String(resp.cart.id)
  if (resp?.data?.id) return String(resp.data.id)
  return undefined
}

// ---------------- Component ----------------
export default function DesignPage() {
  const router = useRouter()

  // Modal open state
  const [genOpen, setGenOpen] = useState(false)

  // Config from backend
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>("EUR")
  const [fxRate, setFxRate] = useState(1)
  const fxRateRef = useRef(1)
  const currencySymbol = symbolForCurrency(currencyCode)
  const [sizes, setSizes] = useState<Record<string, SizeDef>>({})
  const [flavors, setFlavors] = useState<Record<string, FlavorDef>>({})
  const [colors, setColors] = useState<Record<string, ColorDef>>({})

  // Steps & selection
  const [active, setActive] = useState<StepId>("size")
  const [sel, setSel] = useState<Selections>({})
  const [artError, setArtError] = useState<string | null>(null)
  const [cartId, setCartId] = useState<string | null>(null)

  useEffect(() => {
    fxRateRef.current = fxRate
  }, [fxRate])

  const convertEurToDisplay = (value: number) =>
    Math.round((Number(value) || 0) * fxRate)

  // Load config once
  useEffect(() => {
    ;(async () => {
      try {
        const cfg = await getDesignConfig()
        setCurrencyCode(normalizeCurrencyCode(cfg.currency))

        // Build size map; prefix with 's' to keep UI ids (e.g. "s21x21")
        const sizeMap: Record<string, SizeDef> = {}
        cfg.options.size.forEach((s: any) => {
          const [w, h] = s.id.split("x")
          sizeMap[`s${s.id}`] = {
            id: `s${s.id}`,
            label: s.label || s.id.replace("x", " × "),
            wCm: Number(w) || 16,
            hCm: Number(h) || 9,
            basePriceEur: s.price_eur,
          }
        })
        setSizes(sizeMap)

        // Materials -> flavors in UI
        const flMap: Record<string, FlavorDef> = {}
        cfg.options.material.forEach((m: any) => {
          flMap[m.id] = {
            id: m.id,
            label: m.label,
            priceDeltaEur: m.surcharge_eur,
            intensity:
              m.id === "shadow" ? 0.45 : m.id === "galaxy" ? 1.0 : 0.55,
          }
        })
        setFlavors(flMap)

        // Colors
        const colMap: Record<string, ColorDef> = {}
        cfg.options.color.forEach((c: any) => {
          colMap[c.id] = {
            id: c.id,
            label: c.label,
            swatch:
              c.id === "black"
                ? "#0b0b0c"
                : c.id === "white"
                ? "#fafafa"
                : c.id === "grey"
                ? "#8e9aa6"
                : c.id === "green"
                ? "#31d67b"
                : c.id === "red"
                ? "#ff3b58"
                : c.id === "brown"
                ? "#7b4b2a"
                : "#2fa7ff",
            hue:
              c.id === "blue"
                ? 205
                : c.id === "green"
                ? 140
                : c.id === "red"
                ? 350
                : c.id === "grey"
                ? 220
                : c.id === "brown"
                ? 25
                : c.id === "white"
                ? 0
                : 270,
            priceDeltaEur: c.surcharge_eur,
          }
        })
        setColors(colMap)
      } catch (e) {
        console.error("Failed to load design config", e)
      }
    })()
  }, [])

  // Persist selections locally
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setSel(JSON.parse(raw))
    } catch {}
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sel))
    } catch {}
  }, [sel])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const res = await fetch("/api/gg/cart/id", { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        const value =
          typeof data?.cart_id === "string" && data.cart_id.length
            ? data.cart_id
            : null
        setCartId(value)
      } catch (err) {
        console.warn("[gg] Failed to read cart id", err)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  // Selected option objects
  const size = sel.size ? sizes[sel.size] : undefined
  const flavor = sel.flavor ? flavors[sel.flavor] : undefined
  const color = sel.color ? colors[sel.color] : undefined
  const art = sel.art
  const isExampleArt = art?.source === "example"
  const isUploadArt = art?.source === "upload"

  // Live price from backend (only when we have all required selections)
  const derivedTotalEur = useMemo(() => {
    return (
      (size?.basePriceEur || 0) +
      (flavor?.priceDeltaEur || 0) +
      (color?.priceDeltaEur || 0)
    )
  }, [size?.basePriceEur, flavor?.priceDeltaEur, color?.priceDeltaEur])
  const derivedDisplayPrice = useMemo(
    () => convertEurToDisplay(derivedTotalEur),
    [derivedTotalEur, fxRate]
  )

  const [livePriceDisplay, setLivePriceDisplay] = useState<number | null>(null)
  const displayPrice = livePriceDisplay ?? derivedDisplayPrice

  useEffect(() => {
    ;(async () => {
      if (!size || !flavor || !color) {
        setLivePriceDisplay(null)
        return
      }
      setLivePriceDisplay(null)
      try {
        const backendSize = size.id.replace(/^s/, "") // "s21x21" -> "21x21"
        const p = await previewPrice({
          size: backendSize,
          material: flavor.id, // flavor -> material
          color: color.id,
          qty: 1,
          cartId: cartId || undefined,
        })
        const nextCurrency = normalizeCurrencyCode(p.currency)
        const nextRate =
          Number.isFinite(p.fx_rate) && Number(p.fx_rate) > 0
            ? Number(p.fx_rate)
            : 1

        fxRateRef.current = nextRate
        setCurrencyCode(nextCurrency)
        setFxRate((prev) =>
          Math.abs(prev - nextRate) < 0.0001 ? prev : nextRate
        )
        setLivePriceDisplay(Math.round((p.breakdown.total_eur || 0) * nextRate))
      } catch {
        const fallbackEur =
          (size?.basePriceEur || 0) +
          (flavor?.priceDeltaEur || 0) +
          (color?.priceDeltaEur || 0)
        setLivePriceDisplay(Math.round(fallbackEur * fxRateRef.current))
      }
    })()
  }, [size?.id, flavor?.id, color?.id, cartId])

  // Steps nav / progress
  const order: StepId[] = ["size", "artwork", "flavor", "color", "summary"]
  const canNext =
    (active === "size" && !!sel.size) ||
    (active === "artwork" && !!sel.art) ||
    (active === "flavor" && !!sel.flavor) ||
    (active === "color" && !!sel.color) ||
    active === "summary"
  const goNext = () =>
    setActive(order[Math.min(order.length - 1, order.indexOf(active) + 1)])
  const goPrev = () => setActive(order[Math.max(0, order.indexOf(active) - 1)])

  // CSS variables for preview
  const previewVars: React.CSSProperties = useMemo(() => {
    const hue = color?.hue ?? 205
    const intensity = flavor?.intensity ?? 0.55
    const aspect = size ? `${size.wCm} / ${size.hCm}` : "16 / 9"
    return {
      ["--dy-hue" as any]: String(hue),
      ["--dy-intensity" as any]: String(intensity),
      ["--dy-aspect" as any]: aspect,
    }
  }, [size, flavor, color])

  // Selection helpers
  function pickSize(nextId: string) {
    setSel((prev) => ({ ...prev, size: nextId }))
  }
  function pickFlavor(nextId: string) {
    // Reset color on flavor change to avoid illegal combos
    setSel((prev) => ({ ...prev, flavor: nextId, color: undefined }))
  }
  function pickColor(nextId: string) {
    // Guard: if blocked, ignore (should be disabled anyway)
    if (isColorBlockedByFlavor(sel.flavor, nextId)) return
    setSel((prev) => ({ ...prev, color: nextId }))
  }
  function resetAll() {
    setSel({})
    setActive("size")
    setArtError(null)
  }

  // Artwork handling
  const ACCEPT = ".png,.jpg,.jpeg,.webp,.svg"
  const MAX_MB = 6
  function onPickExample(name: "example1.png" | "example2.png") {
    setArtError(null)
    const url = `/${name}` // asset in /public
    setSel((prev) => ({
      ...prev,
      art: { source: "example", name, dataUrl: url },
    }))
  }
  function onUploadFile(file?: File | null) {
    setArtError(null)
    if (!file) return
    const okExt = ACCEPT.split(",").some((ext) =>
      file.name.toLowerCase().endsWith(ext.trim())
    )
    if (!okExt) {
      setArtError("Accepted formats: .png, .jpg, .jpeg, .webp, .svg")
      return
    }
    const maxBytes = MAX_MB * 1024 * 1024
    if (file.size > maxBytes) {
      setArtError(`Max file size is ${MAX_MB} MB`)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || "")
      setSel((prev) => ({
        ...prev,
        art: { source: "upload", name: file.name, dataUrl },
      }))
    }
    reader.onerror = () => setArtError("Failed to read the file")
    reader.readAsDataURL(file)
  }

  // Add to cart flow
  const [adding, setAdding] = useState(false)
  const canSubmitDesign = Boolean(
    size && flavor && color && art && !isExampleArt
  )
  const disableAddButton = adding || !canSubmitDesign

  async function addToCart() {
    // Strong runtime/type guard so TS knows these are defined below
    if (!size || !flavor || !color || !art) return
    if (isExampleArt) return

    setAdding(true)
    try {
      // 1) Upload artwork if needed
      let fileUrl: string | undefined
      let fileName: string | undefined
      if (art.source === "upload") {
        const up = await uploadArtwork({
          file_base64: art.dataUrl,
          originalName: art.name,
        })
        fileUrl = up.fileUrl
        fileName = up.fileName
      } else {
        // @ts-ignore
        fileUrl = art.dataUrl // example asset
        // @ts-ignore
        fileName = art.name
      }

      // 2) Add to cart in Medusa
      const cartResp = await addDesignToCart({
        size: size.id.replace(/^s/, ""),
        material: flavor.id,
        color: color.id,
        qty: 1,
        fileName,
        fileUrl,
        cartId: cartId || undefined,
      })

      // 3) Persist cart cookie and navigate
      const nextCartId = extractCartId(cartResp)
      if (nextCartId) {
        setCartId(nextCartId)
        await setCartCookie(nextCartId)
        router.refresh()
        router.push("/cart")
      } else {
        console.warn(
          "[gg] No cart id returned from /store/designs/add",
          cartResp
        )
      }
    } catch (e: any) {
      alert(`Failed: ${e?.message || "Error adding to cart"}`)
    } finally {
      setAdding(false)
    }
  }

  // Options
  const sizeOptions = Object.values(sizes)
  const flavorOptions = Object.values(flavors)
  const colorOptions = Object.values(colors)
  const doneCount =
    Number(!!sel.size) +
    Number(!!sel.art) +
    Number(!!sel.flavor) +
    Number(!!sel.color)

  // ---------------- Render ----------------
  return (
    <main className="dy-wrap">
      <div className="dy-content">
        {/* Stepper */}
        <nav className="dy-stepper" aria-label="Steps">
          {[
            { id: "size" as StepId, title: "Size" },
            { id: "artwork" as StepId, title: "Artwork" },
            { id: "flavor" as StepId, title: "Finish" },
            { id: "color" as StepId, title: "Color" },
            { id: "summary" as StepId, title: "Summary" },
          ].map((step, i) => {
            const done =
              (step.id === "size" && !!sel.size) ||
              (step.id === "artwork" && !!sel.art) ||
              (step.id === "flavor" && !!sel.flavor) ||
              (step.id === "color" && !!sel.color) ||
              step.id === "summary"
            return (
              <button
                key={step.id}
                className={cx(
                  "dy-step",
                  active === step.id && "is-active",
                  done && "is-done"
                )}
                onClick={() => setActive(step.id)}
                aria-current={active === step.id ? "step" : undefined}
              >
                <span className="dy-step-index">{i + 1}</span>
                <span className="dy-step-label">{step.title}</span>
              </button>
            )
          })}
          <div
            className="dy-stepper-progress"
            style={{ ["--dy-progress" as any]: (doneCount / 4) * 100 + "%" }}
          />
        </nav>

        <section className="dy-grid">
          {/* LEFT column — stage */}
          <div className="dy-col">
            <div className="dy-stage" style={previewVars}>
              {/* STEP 1 — SIZE */}
              {active === "size" && (
                <article className="dy-card">
                  <header className="dy-card-header">
                    <h2>Choose a size</h2>
                  </header>
                  <div className="dy-options">
                    {sizeOptions.map((opt) => {
                      const checked = sel.size === opt.id
                      return (
                        <label
                          key={opt.id}
                          className={cx("dy-option", checked && "is-selected")}
                        >
                          <input
                            type="radio"
                            name="dy-size"
                            value={opt.id}
                            checked={checked}
                            onChange={() => pickSize(opt.id)}
                          />
                          <span className="dy-bullet" aria-hidden />
                          <span className="dy-option-text">{opt.label}</span>
                          <span className="dy-price">
                            {currencySymbol}{" "}
                            {convertEurToDisplay(opt.basePriceEur)}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </article>
              )}

              {/* STEP 2 — ARTWORK */}
              {active === "artwork" && (
                <article className="dy-card">
                  <header className="dy-card-header">
                    <h2>Add artwork</h2>
                    <p className="dy-subtle">Choose one of the options below</p>
                  </header>

                  <div className="dy-art dy-art-inline">
                    {/* Upload */}
                    <div className="dy-upload">
                      <div className="dy-upload-inner">
                        <div className="dy-upload-title">Upload a file</div>
                        <p className="dy-subtle">
                          Accepted: PNG, JPG, WEBP, SVG (max 6MB)
                        </p>

                        <label className="dy-upload-btn">
                          <input
                            type="file"
                            accept=".png,.jpg,.jpeg,.webp,.svg"
                            onChange={(e) =>
                              onUploadFile(e.target.files?.[0] || null)
                            }
                          />
                          <span>Choose file</span>
                        </label>

                        {artError && <p className="dy-error">{artError}</p>}

                        {/* Safe checks to satisfy TS */}
                        {isUploadArt && art?.dataUrl && (
                          <div className="dy-upload-preview">
                            <img
                              src={art.dataUrl}
                              alt={art.name}
                              loading="lazy"
                            />
                            <div className="dy-upload-name" title={art.name}>
                              {art.name}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Examples */}
                    <div className="dy-examples">
                      <div className="dy-examples-title">Pick an example</div>
                      <div className="dy-examples-grid">
                        {(["example1.png", "example2.png"] as const).map(
                          (name) => {
                            const selected =
                              art?.source === "example" && art?.name === name
                            return (
                              <button
                                type="button"
                                key={name}
                                className={cx(
                                  "dy-example-card",
                                  selected && "is-selected"
                                )}
                                onClick={() => onPickExample(name)}
                                aria-pressed={selected}
                              >
                                <span className="dy-example-thumb">
                                  <img src={`/${name}`} alt={name} />
                                </span>
                              </button>
                            )
                          }
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Generate */}
                  <div className="dy-generate">
                    <div className="dy-generate-title">Generate artwork</div>
                    <p className="dy-subtle">
                      Prototype only — not implemented yet.
                    </p>

                    <button
                      type="button"
                      className="dy-btn dy-btn-generate"
                      onClick={() => setGenOpen(true)}
                      aria-label="Generate artwork"
                    >
                      Generate
                    </button>
                  </div>
                </article>
              )}

              {/* STEP 3 — FINISH (Flavor → Material). Materials are never disabled. */}
              {active === "flavor" && (
                <article className="dy-card">
                  <header className="dy-card-header">
                    <h2>Choose a finish</h2>
                    <p className="dy-subtle">Surface and effect</p>
                  </header>
                  <div className="dy-options">
                    {flavorOptions.map((opt) => {
                      const checked = sel.flavor === opt.id
                      return (
                        <label
                          key={opt.id}
                          className={cx("dy-option", checked && "is-selected")}
                        >
                          <input
                            type="radio"
                            name="dy-flavor"
                            value={opt.id}
                            checked={checked}
                            onChange={() => pickFlavor(opt.id)}
                          />
                          <span className="dy-bullet" aria-hidden />
                          <span className="dy-option-text">{opt.label}</span>
                          {opt.priceDeltaEur ? (
                            <span className="dy-price">
                              +{currencySymbol}{" "}
                              {convertEurToDisplay(opt.priceDeltaEur)}
                            </span>
                          ) : (
                            <span className="dy-price">Included</span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                </article>
              )}

              {/* STEP 4 — COLOR. Disabled based on current flavor selection. */}
              {active === "color" && (
                <article className="dy-card">
                  <header className="dy-card-header">
                    <h2>Choose a color</h2>
                    <p className="dy-subtle">LED accent color</p>
                  </header>
                  <div className="dy-options dy-options-color">
                    {colorOptions.map((opt) => {
                      const disabled = isColorBlockedByFlavor(
                        sel.flavor,
                        opt.id
                      )
                      const checked = sel.color === opt.id
                      return (
                        <label
                          key={opt.id}
                          className={cx(
                            "dy-option",
                            "dy-option-color",
                            checked && "is-selected",
                            disabled && "is-disabled"
                          )}
                          aria-disabled={disabled}
                          title={
                            disabled
                              ? "Can't use that color with that material"
                              : undefined
                          }
                          data-tooltip={
                            disabled
                              ? "Can't use that color with that material"
                              : undefined
                          }
                        >
                          <input
                            type="radio"
                            name="dy-color"
                            value={opt.id}
                            disabled={disabled}
                            checked={checked}
                            onChange={() => pickColor(opt.id)}
                            aria-label={opt.label}
                          />
                          <span
                            className="dy-color-dot"
                            style={{ backgroundColor: opt.swatch }}
                            aria-hidden
                          />
                          <span className="dy-option-text">{opt.label}</span>
                          {opt.priceDeltaEur ? (
                            <span className="dy-price">
                              +{currencySymbol}{" "}
                              {convertEurToDisplay(opt.priceDeltaEur)}
                            </span>
                          ) : (
                            <span className="dy-price">Included</span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                </article>
              )}

              {/* STEP 5 — SUMMARY */}
              {active === "summary" && (
                <article className="dy-card">
                  <header className="dy-card-header">
                    <h2>Summary</h2>
                  </header>

                  <dl className="dy-summary" aria-live="polite">
                    <div>
                      <dt>Artwork</dt>
                      <dd>
                        {art
                          ? art.source === "upload"
                            ? `File: ${art.name}`
                            : `Example: ${art.name}`
                          : "-"}
                      </dd>
                    </div>
                    <div>
                      <dt>Size</dt>
                      <dd>{size?.label || "-"}</dd>
                    </div>
                    <div>
                      <dt>Finish</dt>
                      <dd>{flavor?.label || "-"}</dd>
                    </div>
                    <div>
                      <dt>Color</dt>
                      <dd>{color?.label || "-"}</dd>
                    </div>
                    <div className="dy-summary-total">
                      <dt>Total</dt>
                      <dd>
                        {currencySymbol} {displayPrice || 0}
                      </dd>
                    </div>
                  </dl>

                  {isExampleArt && (
                    <p className="dy-note" role="status">
                      Sample images are for inspiration only. Please upload your
                      own artwork to complete your design.
                    </p>
                  )}

                  <div className="dy-actions">
                    <button
                      className="dy-btn dy-btn-secondary"
                      onClick={resetAll}
                    >
                      Reset
                    </button>
                    <button
                      className="dy-btn"
                      onClick={addToCart}
                      disabled={disableAddButton}
                    >
                      {adding ? "Adding..." : "Add to cart"}
                    </button>
                  </div>
                </article>
              )}
            </div>

            {/* Navigation below the stage */}
            <div className="dy-nav">
              <button
                className="dy-btn dy-btn-secondary"
                onClick={goPrev}
                disabled={active === "size"}
              >
                Back
              </button>
              <button
                className="dy-btn"
                onClick={goNext}
                disabled={!canNext || active === "summary"}
              >
                Next
              </button>
            </div>
          </div>

          {/* RIGHT column — live preview */}
          <div className="dy-col">
            <aside className="dy-preview" style={previewVars}>
              <div
                className={cx("dy-preview-glow", sel.flavor ? "is-on" : "")}
              />
              <div className="dy-preview-panel">
                <div className="dy-preview-title">Live preview</div>

                <div className="dy-preview-slab">
                  {art?.dataUrl && (
                    <img
                      className="dy-preview-art"
                      src={art.dataUrl}
                      alt="Artwork preview"
                      loading="lazy"
                    />
                  )}
                  <span className="dy-preview-slab-glass" />
                  <span className="dy-preview-slab-edge" />
                </div>

                <ul className="dy-preview-meta">
                  <li>{size?.label || "Choose a size"}</li>
                  <li>
                    {art
                      ? art.source === "upload"
                        ? art.name
                        : art.name
                      : "Add artwork (step: Artwork)"}
                  </li>
                  <li>{flavor?.label || "Choose a finish"}</li>
                  <li>{color?.label || "Choose a color"}</li>
                </ul>

                <div className="dy-preview-total" aria-live="polite">
                  <span className="dy-preview-total-label">Total</span>
                  <span className="dy-preview-total-value">
                    {currencySymbol} {displayPrice || 0}
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>

      {/* Bottom sheet portal */}
      <DesignGenerateComponent
        open={genOpen}
        onClose={() => setGenOpen(false)}
      />
    </main>
  )
}
