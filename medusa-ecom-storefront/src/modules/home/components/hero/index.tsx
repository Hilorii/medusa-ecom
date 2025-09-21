import Image from "next/image"
import Link from "next/link"
import "./hero.css"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const Hero = () => {
  const stats = [
    {
      value: "100%",
      label: "Handmade in our Danish light lab",
    },
    {
      value: "Ultra Custom",
      label: "Design every detail with our live editor",
    },
    {
      value: "Free EU Shipping",
      label: "Delivered carbon-neutral to your door",
    },
  ]

  return (
    <section className="hero-section">
      <div className="content-container hero-container">
        <div className="hero-text">
          <span className="hero-badge">Tailored LED experiences</span>
          <h1 className="hero-title">
            Illuminate your story with a custom GlitchGlow sign
          </h1>
          <p className="hero-subtitle">
            Every sign we craft is built to impress — sculpted by hand, tuned
            for vibrant color, and engineered so you can bring any idea to life.
            Upload your artwork or generate it instantly in our editor.
          </p>
          <div className="hero-actions">
            <LocalizedClientLink
              href="/design"
              className="hero-btn hero-btn--primary"
            >
              Design your sign
            </LocalizedClientLink>
            <Link
              href="#sustainability"
              className="hero-btn hero-btn--secondary"
            >
              Why GlitchGlow?
            </Link>
          </div>
          <div className="hero-stats">
            {stats.map((stat) => (
              <div key={stat.value} className="hero-stat-card">
                <span className="hero-stat-value">{stat.value}</span>
                <span className="hero-stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-visual__halo" />
          <div className="hero-visual__frame">
            <div className="hero-visual__glare" />
            <Image
              src="/sign-green.jpg"
              alt="Custom neon sign glowing in emerald hues"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 520px"
              priority
              className="hero-visual__image"
            />
          </div>
          <div className="hero-visual__card">
            <div className="hero-visual__logo">
              <Image
                src="/logo-rainbow.jpg"
                alt="GlitchGlow rainbow logo"
                fill
                sizes="120px"
              />
            </div>
            <div className="hero-visual__card-text">
              <span>GlitchGlow Signature Blend</span>
              <p>Lightweight acrylic, zero flicker, infinite glow.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
