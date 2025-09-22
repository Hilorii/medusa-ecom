"use client"

import { FormEvent, useMemo, useState } from "react"
import "./feedback.css"

// Copy shown ONLY after a rating is selected to avoid layout jumps on hover
const ratingCopy: Record<number, { title: string; caption: string }> = {
  1: {
    title: "Pitch-black experience",
    caption: "Tell us what went wrong — we want to fix it right away.",
  },
  2: {
    title: "Not quite there yet",
    caption:
      "Share a few details and we’ll polish every pixel of your journey.",
  },
  3: {
    title: "Pretty decent",
    caption: "We’re close to great — help us take that final step.",
  },
  4: {
    title: "Nice and bright",
    caption: "We love good news. Tell us what worked best for you.",
  },
  5: {
    title: "Full glow!",
    caption: "Thanks! Your words will help us shine even brighter.",
  },
}

const DEFAULT_COPY = {
  title: "How was your GlitchGlow experience?",
  caption: "Share your feedback — it lands right where it matters most.",
}

const formConfig = {
  action: process.env.NEXT_PUBLIC_GOOGLE_FORM_ACTION,
  ratingEntry: process.env.NEXT_PUBLIC_GOOGLE_FORM_RATING_ENTRY_ID,
  messageEntry: process.env.NEXT_PUBLIC_GOOGLE_FORM_MESSAGE_ENTRY_ID,
}

const Feedback = () => {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [message, setMessage] = useState("")
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorDetails, setErrorDetails] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Use hovered value to light up stars/progress, but DO NOT change header copy on hover
  const displayRating = hoveredRating || rating

  // Header copy depends ONLY on the selected rating to prevent layout shifts on hover
  const { title, caption } = useMemo(() => {
    if (!rating) return DEFAULT_COPY
    return ratingCopy[rating]
  }, [rating])

  const progress = useMemo(() => {
    return Math.min(100, Math.max(0, (displayRating / 5) * 100))
  }, [displayRating])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return

    // Basic config validation
    if (
      !formConfig.action ||
      !formConfig.ratingEntry ||
      !formConfig.messageEntry
    ) {
      setStatus("error")
      setErrorDetails(
        "Google Form configuration is incomplete. Please set your env variables."
      )
      return
    }

    if (!rating) {
      setStatus("error")
      setErrorDetails("Choose a star rating before sending your feedback.")
      return
    }

    if (!message.trim()) {
      setStatus("error")
      setErrorDetails("Please write a few words — your perspective matters.")
      return
    }

    setIsSubmitting(true)
    setStatus("idle")
    setErrorDetails("")

    try {
      const formData = new FormData()
      formData.append(`entry.${formConfig.ratingEntry}`, rating.toString())
      formData.append(`entry.${formConfig.messageEntry}`, message.trim())
      formData.append("fvv", "1")
      formData.append("draftResponse", "[]")
      formData.append("pageHistory", "0")

      await fetch(formConfig.action, {
        method: "POST",
        mode: "no-cors",
        body: formData,
      })

      setStatus("success")
      setRating(0)
      setMessage("")
    } catch {
      setStatus("error")
      setErrorDetails("Couldn’t send feedback. Please try again in a moment.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="feedback-section" id="feedback">
      {/* Removed global page background blobs to keep visuals inside the card */}

      <div className="content-container feedback-container">
        <div className="feedback-card" data-state={status}>
          <header className="feedback-header">
            <span className="feedback-kicker">Feedback hub</span>
            <h2 className="feedback-title" data-stable>
              {title}
            </h2>
            <p className="feedback-caption" data-stable>
              {caption}
            </p>
          </header>

          <div className="feedback-rating-panel">
            <div className="feedback-rating-header">
              <span className="feedback-rating-label">
                {displayRating ? `${displayRating}/5` : "Choose rating"}
              </span>
              <div className="feedback-progress" aria-hidden="true">
                <div
                  className="feedback-progress__fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/*
              Hover is stable: we only clear hovered state when leaving the WHOLE group.
              Header copy does not react to hover, only to a confirmed click.
            */}
            <div
              className="feedback-stars"
              role="radiogroup"
              aria-label="Rate your experience"
              onMouseLeave={() => setHoveredRating(0)}
              onBlur={(e) => {
                const next = e.relatedTarget as Node | null
                if (!next || !e.currentTarget.contains(next)) {
                  setHoveredRating(0)
                }
              }}
            >
              {[1, 2, 3, 4, 5].map((star) => {
                const isActive = displayRating >= star
                const isSelected = rating >= star

                return (
                  <button
                    key={star}
                    type="button"
                    className={`feedback-star${isActive ? " is-active" : ""}${
                      isSelected ? " is-selected" : ""
                    }`}
                    aria-label={`Rate ${star} ${star === 1 ? "star" : "stars"}`}
                    role="radio"
                    aria-checked={rating === star}
                    onMouseEnter={() => setHoveredRating(star)}
                    onFocus={() => setHoveredRating(star)}
                    onClick={() => {
                      setRating(star) // Persist selection
                      setStatus("idle")
                      setErrorDetails("")
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="feedback-star__icon"
                      aria-hidden="true"
                    >
                      <path d="M12 3.6l2.247 4.551 5.028.73-3.637 3.545.859 5.009L12 15.97l-4.497 2.465.859-5.009-3.637-3.545 5.028-.73L12 3.6z" />
                    </svg>
                    <span className="feedback-star__glow" aria-hidden="true" />
                  </button>
                )
              })}
            </div>
          </div>

          <form className="feedback-form" onSubmit={handleSubmit}>
            <label htmlFor="feedback-message" className="feedback-label">
              Your message
            </label>
            <div className="feedback-textarea-wrapper">
              <textarea
                id="feedback-message"
                name="message"
                value={message}
                maxLength={800}
                placeholder="Tell us about your experience, ideas, or dream neon."
                onChange={(event) => setMessage(event.target.value)}
                className="feedback-textarea"
              />
              <span className="feedback-character-count" aria-live="polite">
                {message.length}/800
              </span>
            </div>

            <button
              type="submit"
              className="feedback-submit"
              disabled={isSubmitting}
              data-variant={status === "success" ? "success" : "default"}
            >
              <span className="feedback-submit__glow" aria-hidden="true" />
              {isSubmitting
                ? "Sending..."
                : status === "success"
                ? "Sent!"
                : "Send feedback"}
            </button>
          </form>

          <div className="feedback-status" role="status" aria-live="polite">
            {status === "success" && "Thanks! Your feedback is on its way."}
            {status === "error" && errorDetails}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Feedback
