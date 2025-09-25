"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import "./design-generate-component.css"

type Props = {
  open: boolean
  onClose: () => void
}

export default function DesignGenerateComponent({ open, onClose }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [prompt, setPrompt] = useState("")
  const [notes, setNotes] = useState("")
  const [generating, setGenerating] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null)

  const variants = useMemo(
    () => [
      {
        id: 0,
        label: "Concept A",
        subtitle: "Dynamic lighting",
      },
      {
        id: 1,
        label: "Concept B",
        subtitle: "Minimal geometry",
      },
    ],
    []
  )

  // Fake loading for now so we can show skeletons/interactions
  useEffect(() => {
    if (!generating) {
      return
    }

    const timeout = window.setTimeout(() => {
      setGenerating(false)
      setHasGenerated(true)
    }, 1500)

    return () => window.clearTimeout(timeout)
  }, [generating])

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

  const onGenerate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) {
      return
    }
    setGenerating(true)
    setSelectedVariant(null)
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

        <div className="gg-gen-body">
          <header className="gg-gen-header">
            <div>
              <p className="gg-gen-kicker">AI Studio</p>
              <h2 className="gg-gen-title">Create a unique design</h2>
            </div>
            <p className="gg-gen-tag">Modern preview</p>
          </header>

          <div className="gg-gen-layout">
            <section className="gg-gen-panel">
              <form className="gg-gen-form" onSubmit={onGenerate}>
                <label htmlFor="gg-gen-prompt" className="gg-gen-label">
                  Main prompt
                </label>
                <textarea
                  id="gg-gen-prompt"
                  className="gg-gen-textarea"
                  placeholder="Describe your dream project, e.g., a futuristic poster with neon lighting..."
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  rows={5}
                  required
                />

                <label htmlFor="gg-gen-notes" className="gg-gen-label">
                  Additional instructions (optional)
                </label>
                <textarea
                  id="gg-gen-notes"
                  className="gg-gen-textarea gg-gen-textarea--secondary"
                  placeholder="Add constraints, colors, inspirations, or reference links here."
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                />

                <div className="gg-gen-actions">
                  <div className="gg-gen-guidelines">
                    <h3>Guidelines</h3>
                    <ul>
                      <li>Be specific—style, mood, colors.</li>
                      <li>
                        Add constraints like format, composition, or text.
                      </li>
                      <li>
                        After generation, pick the variant that best matches
                        your vision.
                      </li>
                    </ul>
                  </div>
                  <button
                    type="submit"
                    className="gg-gen-button"
                    disabled={generating || !prompt.trim()}
                  >
                    {generating ? "Generating…" : "Generate"}
                  </button>
                </div>
              </form>
            </section>

            <section className="gg-gen-panel gg-gen-panel--gallery">
              <div className="gg-gen-gallery-header">
                <h3>Preview variants</h3>
                <p>
                  {generating
                    ? "Preparing visuals based on your prompt..."
                    : hasGenerated
                    ? "Choose the variant that looks best."
                    : "Enter a prompt and click Generate to see suggestions."}
                </p>
              </div>
              <div className="gg-gen-gallery">
                {variants.map((variant) => {
                  const isSelected = selectedVariant === variant.id
                  return (
                    <article
                      key={variant.id}
                      className={`gg-gen-card${
                        isSelected ? " gg-gen-card--selected" : ""
                      }`}
                    >
                      <div
                        className={`gg-gen-card-preview${
                          generating ? " gg-gen-card-preview--loading" : ""
                        }`}
                        aria-hidden="true"
                      >
                        {!generating && hasGenerated ? (
                          <div className="gg-gen-card-visual">
                            <span className="gg-gen-card-label">
                              {variant.label}
                            </span>
                            <span className="gg-gen-card-sub">
                              {variant.subtitle}
                            </span>
                          </div>
                        ) : (
                          <div className="gg-gen-card-loader">
                            <span className="gg-gen-spinner" />
                            <p>Loading...</p>
                          </div>
                        )}
                      </div>
                      <footer className="gg-gen-card-footer">
                        <div className="gg-gen-card-info">
                          <h4>{variant.label}</h4>
                          <p>{variant.subtitle}</p>
                        </div>
                        <button
                          type="button"
                          className="gg-gen-confirm"
                          disabled={generating || !hasGenerated}
                          onClick={() => setSelectedVariant(variant.id)}
                        >
                          {isSelected ? "Selected" : "Confirm"}
                        </button>
                      </footer>
                    </article>
                  )
                })}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
