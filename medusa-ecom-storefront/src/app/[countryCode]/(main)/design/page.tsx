"use client"

import React, { useEffect, useMemo, useState } from "react"
import "./design.css"

type Option = {
  id: string
  label: string
  priceDelta?: number
  swatch?: string // for colors
}
type StepId = "size" | "flavor" | "color" | "summary"

const CONFIG = {
  currency: "€",
  basePrices: {
    size: { s21x21: 59, s36x14: 69, s36x21: 89 },
  },
  steps: [
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

type Selections = { size?: string; flavor?: string; color?: string }
const STORAGE_KEY = "design-your-own-v1"

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
  const [active, setActive] = useState<StepId>("size")
  const [sel, setSel] = useState<Selections>({})

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

  const size = CONFIG.steps[0].options.find((o) => o.id === sel.size)
  const flavor = CONFIG.steps[1].options.find((o) => o.id === sel.flavor)
  const color = CONFIG.steps[2].options.find((o) => o.id === sel.color)

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

  const canNext =
    (active === "size" && !!sel.size) ||
    (active === "flavor" && !!sel.flavor) ||
    (active === "color" && !!sel.color) ||
    active === "summary"

  const order: StepId[] = ["size", "flavor", "color", "summary"]
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
    setSel((prev) => ({ ...prev, [step]: value }))
  }
  function resetAll() {
    setSel({})
    setActive("size")
  }
  async function addToCart() {
    alert(`Added to cart:\n${JSON.stringify({ ...sel, price }, null, 2)}`)
  }

  return (
    <main className="dy-wrap">
      <div className="dy-content">
        {/* Stepper */}
        <nav className="dy-stepper" aria-label="Steps">
          {CONFIG.steps.map((step, i) => {
            const done =
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
                ((Number(!!sel.size) +
                  Number(!!sel.flavor) +
                  Number(!!sel.color)) /
                  3) *
                  100 +
                "%",
            }}
          />
        </nav>

        <section className="dy-grid">
          {/* LEFT — stage with single slot (no stacking) */}
          <div className="dy-col">
            <div className="dy-stage" style={previewVars}>
              {active === "size" && (
                <article className="dy-card">
                  <header className="dy-card-header">
                    <h2>Choose Size</h2>
                  </header>
                  <div className="dy-options">
                    {CONFIG.steps[0].options.map((opt: Option) => {
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

              {active === "flavor" && (
                <article className="dy-card">
                  <header className="dy-card-header">
                    <h2>Choose Flavor</h2>
                    <p className="dy-subtle">Surface & effect</p>
                  </header>
                  <div className="dy-options">
                    {CONFIG.steps[1].options.map((opt: Option) => {
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

              {active === "color" && (
                <article className="dy-card">
                  <header className="dy-card-header">
                    <h2>Choose Color</h2>
                    <p className="dy-subtle">LED accent color</p>
                  </header>
                  <div className="dy-swatches">
                    {CONFIG.steps[2].options.map((opt: Option) => {
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

              {active === "summary" && (
                <article className="dy-card">
                  <header className="dy-card-header">
                    <h2>Summary</h2>
                  </header>
                  <dl className="dy-summary" aria-live="polite">
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
                      disabled={!size || !flavor || !color}
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
                  <span className="dy-preview-slab-glass" />
                  <span className="dy-preview-slab-edge" />
                </div>
                <ul className="dy-preview-meta">
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
