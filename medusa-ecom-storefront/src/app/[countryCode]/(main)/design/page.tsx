"use client"

import React, { useEffect, useMemo, useState } from "react"
import "./design.css"

type Option = {
  id: string
  label: string
  priceDelta?: number
  swatch?: string // for colors
}

type StepId = "art" | "size" | "flavor" | "color" | "summary"

type Artwork =
  | { source: "upload"; name: string; dataUrl: string } // base64 do zapisu w localStorage
  | {
      source: "example"
      name: "example1.png" | "example2.png"
      dataUrl: string
    } // ścieżka z /public

const CONFIG = {
  currency: "€",
  basePrices: {
    size: { s21x21: 59, s36x14: 69, s36x21: 89 },
  },
  steps: [
    { id: "art" as StepId, title: "Artwork", options: [] },
    {
      id: "size" as StepId,
      title: "Size",
      options: [
        { id: "s21x21", label: "21 × 21 cm" },
        { id: "s36x14", label: "36 × 14 cm" },
        { id: "s36x21", label: "36 × 21 cm" },
      ],
    },
    {
      id: "flavor" as StepId,
      title: "Flavor",
      options: [
        { id: "clear", label: "Clear", priceDelta: 0 },
        { id: "shadow", label: "Shadow", priceDelta: 5 },
        { id: "aurora", label: "Aurora", priceDelta: 12 },
        { id: "iridescent", label: "Iridescent", priceDelta: 15 },
        { id: "galaxy", label: "Galaxy", priceDelta: 18 },
      ],
    },
    {
      id: "color" as StepId,
      title: "Color",
      options: [
        { id: "black", label: "Black", swatch: "#0b0b0c" },
        { id: "grey", label: "Grey", swatch: "#8e9aa6" },
        { id: "white", label: "White", swatch: "#fafafa" },
        { id: "red", label: "Red", swatch: "#ff3b58" },
        { id: "green", label: "Green", swatch: "#31d67b" },
        { id: "blue", label: "Blue", swatch: "#2fa7ff" },
        { id: "brown", label: "Brown", swatch: "#7b4b2a" },
      ],
    },
    { id: "summary" as StepId, title: "Summary", options: [] },
  ],
} as const

type Selections = {
  art?: Artwork
  size?: string
  flavor?: string
  color?: string
}
const STORAGE_KEY = "design-your-own-v2"

function cx(...c: (string | false | undefined)[]) {
  return c.filter(Boolean).join(" ")
}
function isOptionDisabled(stepId: StepId, optionId: string, sel: Selections) {
  if (stepId === "color" && sel.flavor === "galaxy" && optionId === "white")
    return true
  if (stepId === "flavor" && sel.color === "white" && optionId === "galaxy")
    return true
  return false
}

export default function DesignPage() {
  const [active, setActive] = useState<StepId>("art")
  const [sel, setSel] = useState<Selections>({})
  const [artError, setArtError] = useState<string | null>(null)

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

  const size = CONFIG.steps[1].options.find((o) => o.id === sel.size)
  const flavor = CONFIG.steps[2].options.find((o) => o.id === sel.flavor)
  const color = CONFIG.steps[3].options.find((o) => o.id === sel.color)

  const price = useMemo(() => {
    const base =
      (sel.size
        ? CONFIG.basePrices.size[
            sel.size as keyof typeof CONFIG.basePrices.size
          ]
        : 0) || 0
    const flavorDelta = flavor?.priceDelta ?? 0
    return base + flavorDelta
  }, [sel.size, flavor])

  const order: StepId[] = ["art", "size", "flavor", "color", "summary"]
  const canNext =
    (active === "art" && !!sel.art) ||
    (active === "size" && !!sel.size) ||
    (active === "flavor" && !!sel.flavor) ||
    (active === "color" && !!sel.color) ||
    active === "summary"

  const goNext = () =>
    setActive(order[Math.min(order.length - 1, order.indexOf(active) + 1)])
  const goPrev = () => setActive(order[Math.max(0, order.indexOf(active) - 1)])

  const previewVars: React.CSSProperties = useMemo(() => {
    const hueMap: Record<string, number> = {
      black: 270,
      grey: 220,
      white: 0,
      red: 350,
      green: 140,
      blue: 205,
      brown: 25,
    }
    const hue = hueMap[sel.color || "blue"] ?? 205
    const intensity =
      sel.flavor === "galaxy"
        ? 1.0
        : sel.flavor === "iridescent"
        ? 0.85
        : sel.flavor === "aurora"
        ? 0.75
        : sel.flavor === "shadow"
        ? 0.45
        : 0.55
    return {
      ["--dy-hue" as any]: String(hue),
      ["--dy-intensity" as any]: String(intensity),
    }
  }, [sel.color, sel.flavor])

  function pick(step: StepId, value: string) {
    if (step === "size" || step === "flavor" || step === "color") {
      setSel((prev) => ({ ...prev, [step]: value }))
    }
  }

  function resetAll() {
    setSel({})
    setActive("art")
    setArtError(null)
  }

  async function addToCart() {
    alert(
      `Added to cart:\n${JSON.stringify(
        { ...sel, price, currency: CONFIG.currency },
        null,
        2
      )}`
    )
  }

  // --- ARTWORK HANDLERS ---
  const ACCEPT = ".png,.jpg,.jpeg,.webp"
  const MAX_MB = 6

  function onPickExample(name: "example1.png" | "example2.png") {
    setArtError(null)
    const url = `/${name}` // pliki w /public
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
    reader.onerror = () => setArtError("Could not read the file")
    reader.readAsDataURL(file)
  }

  return (
    <main className="dy-wrap">
      <div className="dy-content">
        {/* Stepper */}
        <nav className="dy-stepper" aria-label="Steps">
          {CONFIG.steps.map((step, i) => {
            const done =
              (step.id === "art" && !!sel.art) ||
              (step.id === "size" && !!sel.size) ||
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
              ["--dy-progress" as any]:
                ((Number(!!sel.art) +
                  Number(!!sel.size) +
                  Number(!!sel.flavor) +
                  Number(!!sel.color)) /
                  4) *
                  100 +
                "%",
            }}
          />
        </nav>

        <section className="dy-grid">
          {/* LEFT — stage with single slot */}
          <div className="dy-col">
            <div className="dy-stage" style={previewVars}>
              {/* ARTWORK */}
              {active === "art" && (
                <article className="dy-card">
                  <header className="dy-card-header">
                    <h2>Upload / Choose Artwork</h2>
                    <p className="dy-subtle">
                      Add your graphic or pick an example
                    </p>
                  </header>

                  <div className="dy-art">
                    {/* Upload box */}
                    <div className="dy-upload">
                      <div className="dy-upload-inner">
                        <div className="dy-upload-title">Upload your image</div>
                        <p className="dy-subtle">
                          Accepted: PNG, JPG, WEBP (max {MAX_MB}MB)
                        </p>
                        <label className="dy-upload-btn">
                          <input
                            type="file"
                            accept={ACCEPT}
                            onChange={(e) => onUploadFile(e.target.files?.[0])}
                          />
                          <span>Select file</span>
                        </label>

                        {artError && <p className="dy-error">{artError}</p>}

                        {sel.art?.source === "upload" && (
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

                    {/* Examples */}
                    <div className="dy-examples">
                      <div className="dy-examples-title">
                        or choose an example
                      </div>
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
                                  <img
                                    src={`/${name}`}
                                    alt={name}
                                    loading="lazy"
                                  />
                                </span>
                                <span className="dy-example-name">{name}</span>
                              </button>
                            )
                          }
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              )}

              {/* SIZE */}
              {active === "size" && (
                <article className="dy-card">
                  <header className="dy-card-header">
                    <h2>Choose Size</h2>
                  </header>
                  <div className="dy-options">
                    {CONFIG.steps[1].options.map((opt: Option) => {
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
                            onChange={() => pick("size", opt.id)}
                          />
                          <span className="dy-bullet" aria-hidden />
                          <span className="dy-option-text">{opt.label}</span>
                          <span className="dy-price">
                            {CONFIG.currency}
                            {
                              CONFIG.basePrices.size[
                                opt.id as keyof typeof CONFIG.basePrices.size
                              ]
                            }
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </article>
              )}

              {/* FLAVOR */}
              {active === "flavor" && (
                <article className="dy-card">
                  <header className="dy-card-header">
                    <h2>Choose Flavor</h2>
                    <p className="dy-subtle">Surface & effect</p>
                  </header>
                  <div className="dy-options">
                    {CONFIG.steps[2].options.map((opt: Option) => {
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

              {/* COLOR */}
              {active === "color" && (
                <article className="dy-card">
                  <header className="dy-card-header">
                    <h2>Choose Color</h2>
                    <p className="dy-subtle">LED accent color</p>
                  </header>
                  <div className="dy-swatches">
                    {CONFIG.steps[3].options.map((opt: Option) => {
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
                            style={{ backgroundColor: opt.swatch || "#fff" }}
                            aria-hidden
                          />
                          <span className="dy-swatch-label">{opt.label}</span>
                        </label>
                      )
                    })}
                  </div>
                </article>
              )}

              {/* SUMMARY */}
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
                            ? `Upload: ${sel.art.name}`
                            : `Example: ${sel.art.name}`
                          : "-"}
                      </dd>
                    </div>
                    <div>
                      <dt>Size</dt>
                      <dd>{size?.label || "-"}</dd>
                    </div>
                    <div>
                      <dt>Flavor</dt>
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
                      disabled={!sel.art || !size || !flavor || !color}
                    >
                      Add to Cart
                    </button>
                  </div>
                </article>
              )}
            </div>

            {/* Controls under the single card */}
            <div className="dy-nav">
              <button
                className="dy-btn dy-btn-secondary"
                onClick={goPrev}
                disabled={active === "art"}
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

          {/* RIGHT — live preview */}
          <div className="dy-col">
            <aside
              className="dy-preview"
              style={previewVars}
              aria-hidden="true"
            >
              <div
                className={cx("dy-preview-glow", sel.flavor ? "is-on" : "")}
              />
              <div className="dy-preview-panel">
                <div className="dy-preview-title">Live Preview</div>
                <div className="dy-preview-slab">
                  {/* Artwork preview overlay */}
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
                  <li>
                    {sel.art
                      ? sel.art.source === "upload"
                        ? sel.art.name
                        : sel.art.name
                      : "Add artwork"}
                  </li>
                  <li>{size?.label || "Select size"}</li>
                  <li>{flavor?.label || "Select flavor"}</li>
                  <li>{color?.label || "Select color"}</li>
                </ul>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  )
}
