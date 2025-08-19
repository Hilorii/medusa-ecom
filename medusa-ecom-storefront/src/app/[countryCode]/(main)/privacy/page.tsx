import type { Metadata } from "next"
import "./privacy.css"

export const metadata: Metadata = {
  title: "Privacy Policy – GlitchGlow",
  description: "How we collect, use, and protect your data.",
}

export default function PrivacyPolicyPage() {
  return (
    <main className="privacy-wrap min-h-screen px-6 py-16">
      <section className="privacy-card mx-auto w-full max-w-3xl rounded-3xl p-8 md:p-10 shadow-2xl">
        <header className="mb-8">
          <h1 className="privacy-title">Privacy Policy</h1>
          <p className="privacy-subtitle">Last updated: Aug 2025</p>
        </header>

        <article className="privacy-content space-y-6">
          <p>
            We value your privacy. This Privacy Policy explains what personal
            information we collect, how we use it, and your rights regarding
            your data.
          </p>

          <h2 id="what-we-collect" className="privacy-h2">
            1. Information We Collect
          </h2>
          <ul className="privacy-list">
            <li>Account details (name, email, address).</li>
            <li>Order information (items, totals, fulfillment status).</li>
            <li>Technical data (IP, device info, analytics events).</li>
          </ul>

          <h2 id="how-we-use" className="privacy-h2">
            2. How We Use Your Information
          </h2>
          <p>
            We process your data to provide our services, fulfill orders,
            improve the website, and personalize your experience. We may also
            use your email for transactional messages.
          </p>

          <h2 id="sharing" className="privacy-h2">
            3. Sharing & Processors
          </h2>
          <p>
            We only share data with payment, shipping, and analytics providers
            necessary to run the store. We do not sell your personal
            information.
          </p>

          <h2 id="rights" className="privacy-h2">
            4. Your Rights
          </h2>
          <ul className="privacy-list">
            <li>Access, correction, deletion of your data.</li>
            <li>Objection to processing and portability where applicable.</li>
            <li>
              Contact us to exercise your rights:{" "}
              <a href="mailto:hello@glitchglow.com">hello@glitchglow.com</a>.
            </li>
          </ul>

          {/*<div className="privacy-cta">*/}
          {/*  <a href="/contact" className="privacy-button">*/}
          {/*    Contact Us*/}
          {/*  </a>*/}
          {/*  <a href={`/${"pl"}/`} className="privacy-secondary">*/}
          {/*    Back to Home*/}
          {/*  </a>*/}
          {/*</div>*/}
        </article>
      </section>
    </main>
  )
}
