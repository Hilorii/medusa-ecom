import type { Metadata } from "next"
import "./shipping.css"

export const metadata: Metadata = {
  title: "Shipping & Returns – GlitchGlow",
  description: "Delivery timelines, shipping methods, and our returns process.",
}

export default function ShippingReturnsPage() {
  return (
    <main className="shipping-wrap min-h-screen px-6 py-16">
      <section className="shipping-card mx-auto w-full max-w-3xl rounded-3xl p-8 md:p-10 shadow-2xl">
        <header className="mb-8">
          <h1 className="shipping-title">Shipping & Returns</h1>
          <p className="shipping-subtitle">Last updated: Aug 2025</p>
        </header>

        <article className="shipping-content space-y-6">
          <h2 className="shipping-h2">1. Shipping</h2>
          <p>
            We ship worldwide using trusted carriers. Estimated delivery times
            and fees are shown at checkout and may vary depending on the
            destination and design complexity.
          </p>

          <h2 className="shipping-h2">2. Tracking</h2>
          <p>
            Once your order ships, you will receive a tracking link via email.
            You can also check your order status in your account.
          </p>

          <h2 className="shipping-h2">3. Returns</h2>
          <ul className="shipping-list">
            <li>
              Please contact us within 14 days of delivery for any issues.
            </li>
            <li>Items must be returned in original condition and packaging.</li>
            <li>Custom-made items may be repaired or replaced if defective.</li>
          </ul>

          {/*<div className="shipping-cta">*/}
          {/*  <a href="/contact" className="shipping-button">*/}
          {/*    Start a Return*/}
          {/*  </a>*/}
          {/*  <a href={`/${"pl"}/`} className="shipping-secondary">*/}
          {/*    Back to Home*/}
          {/*  </a>*/}
          {/*</div>*/}
        </article>
      </section>
    </main>
  )
}
