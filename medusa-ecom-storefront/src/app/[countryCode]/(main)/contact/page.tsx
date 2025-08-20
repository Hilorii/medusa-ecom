import type { Metadata } from "next"
import "./contact.css"

export const metadata: Metadata = {
  title: "Contact – GlitchGlow",
  description:
    "Say hello! We’d love to help you bring your glowing idea to life.",
}

export default function ContactPage() {
  const mail = "hello@glitchglow.com"

  return (
    <div className="contact-section">
      <main className="contact-wrap min-h-screen px-6 py-16">
        <section className="contact-card mx-auto w-full max-w-4xl rounded-3xl p-8 md:p-12 shadow-2xl">
          {/* Header */}
          <header className="contact-header mb-8 text-center">
            <p className="contact-eyebrow">Friendly • Fast • Helpful</p>
            <h1 className="contact-title">Contact us</h1>
            <p className="contact-subtitle">
              Tell us about your idea — we’ll reply with options, pricing, and a
              timeline.
            </p>
          </header>

          {/* Info + Form */}
          <div className="contact-grid">
            {/* Left: quick info */}
            <aside className="contact-aside" aria-label="Contact info">
              <div className="contact-panel">
                <h2 className="contact-h2">Email</h2>
                <p className="contact-lead">
                  We’re fastest by email. Expect a response within{" "}
                  <strong>24 hours</strong>.
                </p>

                <div className="contact-mail-row">
                  <code className="contact-mail">{mail}</code>
                  <a
                    href={`mailto:${mail}?subject=Hello%20GlitchGlow`}
                    className="contact-button"
                    aria-label="Write us an email"
                  >
                    Write us
                  </a>
                </div>

                <ul className="contact-bullets">
                  <li>Custom quotes for logos & artworks</li>
                  <li>Material & sizing guidance</li>
                  <li>Shipping & installation help</li>
                </ul>
              </div>

              <div className="contact-highlights">
                <div className="contact-chip">
                  <span className="contact-k">EU‑based</span>
                  <span className="contact-k-sub">Denmark</span>
                </div>
                <div className="contact-chip">
                  <span className="contact-k">12‑month</span>
                  <span className="contact-k-sub">Warranty</span>
                </div>
                <div className="contact-chip">
                  <span className="contact-k">Worldwide</span>
                  <span className="contact-k-sub">Shipping</span>
                </div>
              </div>
            </aside>

            {/* Right: form (mailto – uruchomi klienta poczty) */}
            <form
              className="contact-form"
              action={`mailto:${mail}`}
              method="POST"
              encType="text/plain"
              target="_blank"
            >
              <div className="contact-field">
                <input
                  className="contact-input"
                  id="name"
                  name="Name"
                  placeholder=" "
                  required
                />
                <label htmlFor="name" className="contact-label">
                  Your name
                </label>
              </div>

              <div className="contact-field">
                <input
                  className="contact-input"
                  id="email"
                  name="Email"
                  type="email"
                  placeholder=" "
                  required
                />
                <label htmlFor="email" className="contact-label">
                  Email address
                </label>
              </div>

              <div className="contact-field contact-field-textarea">
                <textarea
                  className="contact-input contact-textarea"
                  id="message"
                  name="Message"
                  placeholder=" "
                  rows={5}
                  required
                />
                <label htmlFor="message" className="contact-label">
                  Tell us about your idea
                </label>
              </div>

              <div className="contact-actions">
                <button type="submit" className="contact-button">
                  Send message
                </button>
                <a href="/faq" className="contact-secondary">
                  FAQ
                </a>
              </div>

              <p className="contact-small">
                Prefer direct email? Write us at{" "}
                <a className="contact-link" href={`mailto:${mail}`}>
                  {mail}
                </a>
                .
              </p>
            </form>
          </div>
        </section>
      </main>
    </div>
  )
}
