import type { Metadata } from "next"
import "./faq.css"

export const metadata: Metadata = {
  title: "FAQ – GlitchGlow",
  description:
    "Answers to common questions about custom RGB LED signs, shipping, returns, and support.",
}

export default function FAQPage() {
  return (
    <main className="faq-wrap min-h-screen px-6 py-16">
      <section className="faq-card mx-auto w-full max-w-3xl rounded-3xl p-8 md:p-10 shadow-2xl">
        <header className="faq-header mb-8 text-center">
          <h1 className="faq-title">Frequently Asked Questions</h1>
          <p className="faq-subtitle">
            Everything you need to know about our custom RGB LED signs.
          </p>
        </header>

        <div className="faq-list space-y-4">
          {/* 1 */}
          <details className="faq-item group" open>
            <summary className="faq-q">
              How long does production take?
              <span className="faq-icon" aria-hidden>
                +
              </span>
            </summary>
            <div className="faq-a">
              Typical production time is <strong>7–14 business days</strong>{" "}
              depending on design complexity. We’ll share an estimated timeline
              at checkout and in your order confirmation.
            </div>
          </details>

          {/* 2 */}
          <details className="faq-item group">
            <summary className="faq-q">
              Can you match my brand colors and fonts?
              <span className="faq-icon" aria-hidden>
                +
              </span>
            </summary>
            <div className="faq-a">
              Yes. Send us your <strong>logo (SVG/PDF/AI)</strong> and brand
              guide. We’ll prepare a proof before production and adjust colors,
              kerning, or stroke widths to get the glow just right.
            </div>
          </details>

          {/* 3 */}
          <details className="faq-item group">
            <summary className="faq-q">
              What about power and installation?
              <span className="faq-icon" aria-hidden>
                +
              </span>
            </summary>
            <div className="faq-a">
              Our signs ship with a compatible power supply and basic mounting
              hardware. You can request
              <strong> wall mounts, hanging kits,</strong> or{" "}
              <strong>desk stands</strong>. For large signs, we recommend a
              professional installer.
            </div>
          </details>

          {/* 4 */}
          <details className="faq-item group">
            <summary className="faq-q">
              Do you offer returns or repairs?
              <span className="faq-icon" aria-hidden>
                +
              </span>
            </summary>
            <div className="faq-a">
              If an item arrives <strong>damaged or defective</strong>, we’ll
              repair or replace it according to our policy. Please see{" "}
              <a href="/shipping-returns">Shipping & Returns</a> for details and
              timelines.
            </div>
          </details>

          {/* 5 */}
          <details className="faq-item group">
            <summary className="faq-q">
              Do you ship internationally?
              <span className="faq-icon" aria-hidden>
                +
              </span>
            </summary>
            <div className="faq-a">
              Yes, we ship worldwide with trusted carriers. Costs and delivery
              windows are calculated at checkout based on destination and size.
            </div>
          </details>

          {/* 6 */}
          <details className="faq-item group">
            <summary className="faq-q">
              Warranty & support
              <span className="faq-icon" aria-hidden>
                +
              </span>
            </summary>
            <div className="faq-a">
              We offer a <strong>12‑month warranty</strong> on materials and
              workmanship. Need help? Reach us any time via
              <a href="mailto:hello@glitchglow.com"> hello@glitchglow.com</a>.
            </div>
          </details>
        </div>

        {/* CTA */}
        <div className="faq-cta mt-10">
          <p className="faq-cta-text">
            Still have questions? We’re happy to help.
          </p>
          <div className="faq-cta-row">
            <a href="/contact" className="faq-button" aria-label="Contact us">
              Contact us
            </a>
            <a
              href="/shipping-returns"
              className="faq-secondary"
              aria-label="Read shipping and returns"
            >
              Shipping & Returns
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
