import type { Metadata } from "next"
import "./terms.css"

export const metadata: Metadata = {
  title: "Terms & Conditions – GlitchGlow",
  description: "The terms that govern purchases and use of our services.",
}

export default function TermsPage() {
  return (
    <main className="terms-wrap min-h-screen px-6 py-16">
      <section className="terms-card mx-auto w-full max-w-3xl rounded-3xl p-8 md:p-10 shadow-2xl">
        <header className="mb-8">
          <h1 className="terms-title">Terms & Conditions</h1>
          <p className="terms-subtitle">Last updated: Aug 2025</p>
        </header>

        <article className="terms-content space-y-6">
          <h2 className="terms-h2">1. Overview</h2>
          <p>
            These Terms govern your access to and use of GlitchGlow’s website
            and services, including the purchase of custom RGB LED signs.
          </p>

          <h2 className="terms-h2">2. Orders & Payments</h2>
          <ul className="terms-list">
            <li>All prices are shown at checkout before payment.</li>
            <li>We accept major payment methods as displayed at checkout.</li>
            <li>
              Custom orders may require approval of proofs before production.
            </li>
          </ul>

          <h2 className="terms-h2">3. Production & Delivery</h2>
          <p>
            Production times vary by design complexity. Estimated delivery
            windows are provided at checkout and in your order confirmation.
          </p>

          <h2 className="terms-h2">4. Returns & Warranty</h2>
          <p>
            Defective or damaged items on arrival will be repaired or replaced
            according to our returns policy. Please see{" "}
            <a href="/shipping-and-returns">Shipping & Returns</a>.
          </p>

          {/*<div className="terms-cta">*/}
          {/*  <a href="/shipping-and-returns" className="terms-button">*/}
          {/*    Shipping & Returns*/}
          {/*  </a>*/}
          {/*  <a href={`/${"pl"}/`} className="terms-secondary">*/}
          {/*    Back to Home*/}
          {/*  </a>*/}
          {/*</div>*/}
        </article>
      </section>
    </main>
  )
}
