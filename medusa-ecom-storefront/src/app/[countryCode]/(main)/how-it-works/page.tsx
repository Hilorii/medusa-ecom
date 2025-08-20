import type { Metadata } from "next"
import "./how.css"

export const metadata: Metadata = {
  title: "How It Works – GlitchGlow",
  description:
    "From idea to glowing masterpiece: a simple 3‑step process for your custom RGB LED sign.",
}

export default function HowItWorksPage() {
  return (
    <main className="hiw-wrap min-h-screen px-6 py-16">
      <section className="hiw-card mx-auto w-full max-w-4xl rounded-3xl p-8 md:p-12 shadow-2xl">
        {/* header */}
        <header className="hiw-header mb-10 text-center">
          <p className="hiw-eyebrow">Simple • Custom • Brilliant</p>
          <h1 className="hiw-title">How It Works</h1>
          <p className="hiw-subtitle">
            Three clean steps from idea to glow — crafted with care, tuned to
            your style.
          </p>
        </header>

        {/* accent color switcher (CSS-only) */}
        <fieldset className="hiw-switcher" aria-label="Accent color">
          <legend className="sr-only">Accent color</legend>

          <input
            id="hiw-swatch-1"
            name="hiw-accent"
            type="radio"
            defaultChecked
          />
          <label htmlFor="hiw-swatch-1" title="Cyan → Magenta → Lime" />

          <input id="hiw-swatch-2" name="hiw-accent" type="radio" />
          <label htmlFor="hiw-swatch-2" title="Purple → Blue → Teal" />

          <input id="hiw-swatch-3" name="hiw-accent" type="radio" />
          <label htmlFor="hiw-swatch-3" title="Amber → Pink → Violet" />
        </fieldset>

        {/* steps */}
        <ol className="hiw-steps" role="list">
          {/* step 1 */}
          <li
            className="hiw-step hiw-step-1"
            tabIndex={0}
            aria-label="Create your masterpiece"
          >
            <div className="hiw-icon" aria-hidden="true">
              <img src="/hiw-icon-1.png" alt="" />
            </div>
            <div className="hiw-content">
              <h2 className="hiw-h2">1. Create Your Masterpiece</h2>
              <p className="hiw-p">
                Pick your size, choose your materials, and play with colors —
                then upload your logo, name, or artwork. Watch it light up in
                our live preview.
              </p>
            </div>
          </li>

          {/* step 2 */}
          <li
            className="hiw-step hiw-step-2"
            tabIndex={0}
            aria-label="We bring it to life"
          >
            <div className="hiw-icon" aria-hidden="true">
              <img src="/hiw-icon-2.png" alt="" />
            </div>
            <div className="hiw-content">
              <h2 className="hiw-h2">2. We Bring It to Life</h2>
              <p className="hiw-p">
                Our skilled team handcrafts your sign with top‑quality materials
                and brilliant RGB lighting, exactly the way you designed it.
              </p>
            </div>
          </li>

          {/* step 3 */}
          <li
            className="hiw-step hiw-step-3"
            tabIndex={0}
            aria-label="Unbox the glow"
          >
            <div className="hiw-icon" aria-hidden="true">
              <img src="/hiw-icon-3.png" alt="" />
            </div>
            <div className="hiw-content">
              <h2 className="hiw-h2">3. Unbox the Glow</h2>
              <p className="hiw-p">
                Your custom sign arrives at your door, ready to hang and
                instantly steal the spotlight.
              </p>
            </div>
          </li>
        </ol>

        {/* CTA */}
        <div className="hiw-cta">
          <a
            href="/design"
            className="hiw-button"
            aria-label="Design your own sign"
          >
            Design Your Own
          </a>
          <a href="/faq" className="hiw-secondary" aria-label="Contact us">
            Questions? Contact us
          </a>
        </div>
      </section>
    </main>
  )
}
