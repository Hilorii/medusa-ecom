"use client"

import React, { useEffect, useMemo, useState } from "react"
import "./design.css"

/**
 * Product configurator:
 * - Single source of truth in CONFIG (sizes, finishes, colors, rules, prices)
 * - Incompatibility rules (e.g., flavor X can't be combined with color Y)
 * - LIVE preview with dynamic aspect ratio based on size
 * - Persistence in localStorage
 * - Clear comments (kept mostly in Polish for context)
 */

/** Types */
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
  flavor?: string
  color?: string
}

type OptionCommon = { id: string; label: string }
type SizeDef = OptionCommon & { wCm: number; hCm: number; basePrice: number }
type FlavorDef = OptionCommon & { priceDelta: number; intensity?: number }
type ColorDef = OptionCommon & { swatch: string; hue: number }

/**
 * CONFIG — tu edytujesz warianty, ceny i reguły.
 * - Dodaj rozmiar: CONFIG.sizes
 * - Dodaj flavor: CONFIG.flavors
 * - Dodaj kolor: CONFIG.colors
 * - Dodaj regułę kompatybilności: CONFIG.rules
 */
const CONFIG = {
  currency: "€",

  /** Sizes control price and aspect ratio in preview */
  sizes: {
    s21x21: {
      id: "s21x21",
      label: "21 × 21 cm",
      wCm: 21,
      hCm: 21,
      basePrice: 59,
    },
    s36x14: {
      id: "s36x14",
      label: "36 × 14 cm",
      wCm: 36,
      hCm: 14,
      basePrice: 69,
    },
    s36x21: {
      id: "s36x21",
      label: "36 × 21 cm",
      wCm: 36,
      hCm: 21,
      basePrice: 89,
    },
  } satisfies Record<string, SizeDef>,

  /** Flavors (finishes) modify the effect and can change glow intensity */
  flavors: {
    clear: { id: "clear", label: "Clear", priceDelta: 0, intensity: 0.55 },
    shadow: { id: "shadow", label: "Shadow", priceDelta: 5, intensity: 0.45 },
    aurora: { id: "aurora", label: "Aurora", priceDelta: 12, intensity: 0.75 },
    iridescent: {
      id: "iridescent",
      label: "Iridescent",
      priceDelta: 15,
      intensity: 0.85,
    },
    galaxy: { id: "galaxy", label: "Galaxy", priceDelta: 18, intensity: 1.0 },
  } satisfies Record<string, FlavorDef>,

  /** Colors define the LED accent (swatch + hue for CSS glow) */
  colors: {
    black: { id: "black", label: "Black", swatch: "#0b0b0c", hue: 270 },
    grey: { id: "grey", label: "Grey", swatch: "#8e9aa6", hue: 220 },
    white: { id: "white", label: "White", swatch: "#fafafa", hue: 0 },
    red: { id: "red", label: "Red", swatch: "#ff3b58", hue: 350 },
    green: { id: "green", label: "Green", swatch: "#31d67b", hue: 140 },
    blue: { id: "blue", label: "Blue", swatch: "#2fa7ff", hue: 205 },
    brown: { id: "brown", label: "Brown", swatch: "#7b4b2a", hue: 25 },
  } satisfies Record<string, ColorDef>,

  /**
   * Compatibility rules:
   * Each rule: when <facet=value> then disallow <otherFacet=[values...]>
   */
  rules: [
    { when: { flavor: "galaxy" }, disallow: { color: ["white"] } },
    { when: { color: "white" }, disallow: { flavor: ["galaxy"] } },
  ] as const,

  /** Wizard steps (labels; options are rendered from maps) */
  steps: [
    { id: "size" as StepId, title: "Size" },
    { id: "artwork" as StepId, title: "Artwork" },
    { id: "flavor" as StepId, title: "Finish" },
    { id: "color" as StepId, title: "Color" },
    { id: "summary" as StepId, title: "Summary" },
  ],
} as const

const STORAGE_KEY = "design-your-own-v4"

/** Utility: join classes */
function cx(...c: (string | false | undefined)[]) {
  return c.filter(Boolean).join(" ")
}

/** Is the option disabled by rules? */
function isOptionDisabled(stepId: StepId, optionId: string, sel: Selections) {
  for (const rule of CONFIG.rules) {
    const whenKey = Object.keys(rule.when)[0] as keyof typeof rule.when
    const whenVal = (rule.when as any)[whenKey]
    const matches =
      (whenKey === "flavor" && sel.flavor === whenVal) ||
      (whenKey === "color" && sel.color === whenVal) ||
      (whenKey === "size" && sel.size === whenVal)

    if (!matches) continue

    const disallow = rule.disallow as unknown as Record<string, string[]>
    const blocked = disallow[stepId]?.includes(optionId)
    if (blocked) return true
  }
  return false
}

export default function DesignPage() {
  const [active, setActive] = useState<StepId>("size")
  const [sel, setSel] = useState<Selections>({})
  const [artError, setArtError] = useState<string | null>(null)

  /** Load/save selections */
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

  // @ts-ignore
  const size = sel.size ? CONFIG.sizes[sel.size] : undefined
  // @ts-ignore
  const flavor = sel.flavor ? CONFIG.flavors[sel.flavor] : undefined
  // @ts-ignore
  const color = sel.color ? CONFIG.colors[sel.color] : undefined

  /** Price = base (from size) + finish delta */
  const price = useMemo(() => {
    const base = size?.basePrice ?? 0
    const flavorDelta = flavor?.priceDelta ?? 0
    return base + flavorDelta
  }, [size, flavor])

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

  /**
   * CSS vars for preview:
   * - --dy-hue from selected color (fallback = Blue)
   * - --dy-intensity from finish (fallback = .55)
   * - --dy-aspect as string "w / h" (fallback = "16 / 9")
   */
  const previewVars: React.CSSProperties = useMemo(() => {
    const hue = color?.hue ?? CONFIG.colors.blue.hue
    const intensity = flavor?.intensity ?? 0.55
    const aspect = size ? `${size.wCm} / ${size.hCm}` : "16 / 9"
    return {
      ["--dy-hue" as any]: String(hue),
      ["--dy-intensity" as any]: String(intensity),
      ["--dy-aspect" as any]: aspect,
    }
  }, [size, flavor, color])

  /** Update selections */
  function pick(step: "flavor" | "color", value: string) {
    setSel((prev) => ({ ...prev, [step]: value }))
  }

  /** Pick size (doesn't clear artwork) */
  function pickSize(nextId: string) {
    setSel((prev) => ({ ...prev, size: nextId }))
  }

  /** Reset */
  function resetAll() {
    setSel({})
    setActive("size")
    setArtError(null)
  }

  /** Demo "Add to cart" */
  async function addToCart() {
    alert(
      `Added to cart:\n${JSON.stringify(
        {
          ...sel,
          total: { price, currency: CONFIG.currency },
        },
        null,
        2
      )}`
    )
  }

  // --- ARTWORK HANDLING (step 2) ---
  const ACCEPT = ".png,.jpg,.jpeg,.webp"
  const MAX_MB = 6

  function onPickExample(name: "example1.png" | "example2.png") {
    setArtError(null)
    const url = `/${name}` // files in /public
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
      setArtError("Allowed formats: .png, .jpg, .jpeg, .webp")
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

  /** Render helpers */
  const sizeOptions = Object.values(CONFIG.sizes)
  const flavorOptions = Object.values(CONFIG.flavors)
  const colorOptions = Object.values(CONFIG.colors)

  /** Progress (4 “blocking” steps: size, artwork, flavor, color) */
  const doneCount =
    Number(!!sel.size) +
    Number(!!sel.art) +
    Number(!!sel.flavor) +
    Number(!!sel.color)

  return (
    <main className="dy-wrap">
      <div className="dy-content">
        {/* Stepper */}
        <nav className="dy-stepper" aria-label="Steps">
          {CONFIG.steps.map((step, i) => {
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
            style={{
              ["--dy-progress" as any]: (doneCount / 4) * 100 + "%",
            }}
          />
        </nav>

        <section className="dy-grid">
          {/* LEFT column — single slot with the scene */}
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
                            {CONFIG.currency}
                            {opt.basePrice}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </article>
              )}

              {/* STEP 2 — ARTWORK (separate options: Upload | Examples | Generate) */}
              {active === "artwork" && (
                <article className="dy-card">
                  <header className="dy-card-header">
                    <h2>Add artwork</h2>
                    <p className="dy-subtle">Choose one of the options below</p>
                  </header>

                  <div className="dy-art dy-art-inline">
                    {/* OPTION 1 — Upload a file */}
                    <div className="dy-upload">
                      <div className="dy-upload-inner">
                        <div className="dy-upload-title">Upload a file</div>
                        <p className="dy-subtle">
                          Accepted: PNG, JPG, WEBP (max {MAX_MB}MB)
                        </p>
                        <label className="dy-upload-btn">
                          <input
                            type="file"
                            accept={ACCEPT}
                            onChange={(e) => onUploadFile(e.target.files?.[0])}
                          />
                          <span>Choose file</span>
                        </label>

                        {artError && <p className="dy-error">{artError}</p>}

                        {sel.art?.dataUrl && sel.art.source === "upload" && (
                          <div className="dy-upload-preview">
                            <img
                              src={sel.art.dataUrl}
                              alt={sel.art.name}
                              loading="lazy"
                            />
                            <div
                              className="dy-upload-name"
                              title={sel.art.name}
                            >
                              {sel.art.name}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* OPTION 2 — Pick an example */}
                    <div className="dy-examples">
                      <div className="dy-examples-title">Pick an example</div>
                      <div className="dy-examples-grid">
                        {(["example1.png", "example2.png"] as const).map(
                          (name) => {
                            const selected =
                              sel.art?.source === "example" &&
                              sel.art.name === name
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
                                <span className="dy-example-name">{name}</span>
                              </button>
                            )
                          }
                        )}
                      </div>
                    </div>
                  </div>

                  {/* OPTION 3 — Generate (separate block) */}
                  <div className="dy-generate">
                    <div className="dy-generate-title">Generate artwork</div>
                    <p className="dy-subtle">
                      This option can create an image from a description
                      (placeholder).
                    </p>
                    <button
                      type="button"
                      className="dy-btn dy-btn-generate"
                      onClick={() => {
                        /* placeholder – no action */
                        alert("The generation feature is a placeholder 🙂")
                      }}
                      aria-label="Generate artwork"
                    >
                      Generate
                    </button>
                  </div>
                </article>
              )}

              {/* STEP 3 — FINISH (Flavor) */}
              {active === "flavor" && (
                <article className="dy-card">
                  <header className="dy-card-header">
                    <h2>Choose a finish</h2>
                    <p className="dy-subtle">Surface and effect</p>
                  </header>
                  <div className="dy-options">
                    {flavorOptions.map((opt) => {
                      const disabled = isOptionDisabled("flavor", opt.id, sel)
                      const checked = sel.flavor === opt.id
                      return (
                        <label
                          key={opt.id}
                          className={cx(
                            "dy-option",
                            checked && "is-selected",
                            disabled && "is-disabled"
                          )}
                          aria-disabled={disabled}
                        >
                          <input
                            type="radio"
                            name="dy-flavor"
                            value={opt.id}
                            disabled={disabled}
                            checked={checked}
                            onChange={() => pick("flavor", opt.id)}
                          />
                          <span className="dy-bullet" aria-hidden />
                          <span className="dy-option-text">{opt.label}</span>
                          {opt.priceDelta ? (
                            <span className="dy-price">
                              +{CONFIG.currency}
                              {opt.priceDelta}
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

              {/* STEP 4 — COLOR */}
              {active === "color" && (
                <article className="dy-card">
                  <header className="dy-card-header">
                    <h2>Choose a color</h2>
                    <p className="dy-subtle">LED accent color</p>
                  </header>
                  <div className="dy-swatches">
                    {colorOptions.map((opt) => {
                      const disabled = isOptionDisabled("color", opt.id, sel)
                      const checked = sel.color === opt.id
                      return (
                        <label
                          key={opt.id}
                          className={cx(
                            "dy-swatch",
                            checked && "is-selected",
                            disabled && "is-disabled"
                          )}
                          aria-disabled={disabled}
                          title={opt.label}
                        >
                          <input
                            type="radio"
                            name="dy-color"
                            value={opt.id}
                            disabled={disabled}
                            checked={checked}
                            onChange={() => pick("color", opt.id)}
                            aria-label={opt.label}
                          />
                          <span
                            className="dy-swatch-dot"
                            style={{ backgroundColor: opt.swatch }}
                            aria-hidden
                          />
                          <span className="dy-swatch-label">{opt.label}</span>
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
                        {sel.art
                          ? sel.art.source === "upload"
                            ? `File: ${sel.art.name}`
                            : `Example: ${sel.art.name}`
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
                        {CONFIG.currency}
                        {price || 0}
                      </dd>
                    </div>
                  </dl>
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
                      disabled={!size || !sel.art || !flavor || !color}
                    >
                      Add to cart
                    </button>
                  </div>
                </article>
              )}
            </div>

            {/* Navigation buttons below the card */}
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

          {/* RIGHT column — LIVE preview */}
          <div className="dy-col">
            <aside className="dy-preview" style={previewVars}>
              <div
                className={cx("dy-preview-glow", sel.flavor ? "is-on" : "")}
              />
              <div className="dy-preview-panel">
                <div className="dy-preview-title">Live preview</div>

                <div className="dy-preview-slab">
                  {/* Artwork overlay — fills the slab */}
                  {sel.art?.dataUrl && (
                    <img
                      className="dy-preview-art"
                      src={sel.art.dataUrl}
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
                    {sel.art
                      ? sel.art.source === "upload"
                        ? sel.art.name
                        : sel.art.name
                      : "Add artwork (step: Artwork)"}
                  </li>
                  <li>{flavor?.label || "Choose a finish"}</li>
                  <li>{color?.label || "Choose a color"}</li>
                </ul>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  )
}
