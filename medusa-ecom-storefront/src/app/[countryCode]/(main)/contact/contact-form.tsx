// contact-form.tsx
"use client"

import { FormEvent, useState } from "react"

type ContactFormProps = {
  mail: string
}

type FormStatus = "idle" | "loading" | "success" | "error"

const EMAIL_REGEX =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@([A-Za-z0-9-]+\.)+[A-Za-z]{2,}$/

const EMAIL_PATTERN =
  "[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@([A-Za-z0-9-]+\\.)+[A-Za-z]{2,}"

export function ContactForm({ mail }: ContactFormProps) {
  const [status, setStatus] = useState<FormStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)

    const name = String(formData.get("name") ?? "").trim()
    const email = String(formData.get("email") ?? "").trim()
    const message = String(formData.get("message") ?? "").trim()

    if (!name || !email || !message) {
      setErrorMessage("Please fill in all required fields.")
      setStatus("error")
      return
    }

    if (!EMAIL_REGEX.test(email)) {
      setErrorMessage("Please enter a valid email address.")
      setStatus("error")
      return
    }

    setStatus("loading")
    setErrorMessage(null)

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          message,
        }),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string
        } | null

        setErrorMessage(
          data?.error ?? "Failed to send your message. Please try again later."
        )
        setStatus("error")
        return
      }

      form.reset()
      setStatus("success")
    } catch (error) {
      console.error("Contact form submission error", error)
      setErrorMessage("Failed to send your message. Please try again later.")
      setStatus("error")
    }
  }

  const isSubmitting = status === "loading"

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      <div className="contact-field">
        <input
          className="contact-input"
          id="name"
          name="name"
          placeholder=" "
          required
          disabled={isSubmitting}
          autoComplete="name"
        />
        <label htmlFor="name" className="contact-label">
          Your name
        </label>
      </div>

      <div className="contact-field">
        <input
          className="contact-input"
          id="email"
          name="email"
          type="email"
          placeholder=" "
          required
          disabled={isSubmitting}
          autoComplete="email"
          inputMode="email"
          pattern={EMAIL_PATTERN}
          title="Enter a valid email like name@example.com"
        />
        <label htmlFor="email" className="contact-label">
          Email address
        </label>
      </div>

      <div className="contact-field contact-field-textarea">
        <textarea
          className="contact-input contact-textarea"
          id="message"
          name="message"
          placeholder=" "
          rows={5}
          required
          disabled={isSubmitting}
        />
        <label htmlFor="message" className="contact-label">
          Tell us about your idea
        </label>
      </div>

      <div className="contact-actions">
        <button
          type="submit"
          className="contact-button"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? "Sending..." : "Send message"}
        </button>
        <a href="/faq" className="contact-secondary">
          FAQ
        </a>
      </div>

      {status === "success" && (
        <p
          className="contact-feedback contact-feedback--success"
          role="status"
          aria-live="polite"
        >
          Message sent! We’ll get back to you soon.
        </p>
      )}

      {status === "error" && errorMessage && (
        <p className="contact-feedback contact-feedback--error" role="alert">
          {errorMessage}
        </p>
      )}

      <p className="contact-small">
        Prefer direct email? Write us at{" "}
        <a className="contact-link" href={`mailto:${mail}`}>
          {mail}
        </a>
        .
      </p>
    </form>
  )
}
