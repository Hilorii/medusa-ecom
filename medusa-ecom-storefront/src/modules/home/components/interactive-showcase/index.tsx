import Image from "next/image"
import "./interactive-showcase.css"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type Highlight = {
  title: string
  description: string
  detail: string
}

type Stat = {
  value: string
  label: string
}

const InteractiveShowcase = () => {
  const highlightCards: Highlight[] = [
    {
      title: "Shape it your way",
      description:
        "Pick fonts, layers, and silhouettes that mirror your brand or your next big night out.",
      detail: "Fonts, icons & patterns updated weekly",
    },
    {
      title: "Glow with AI or upload art",
      description:
        "Start from your own artwork or let our AI assistant sketch concepts in seconds.",
      detail: "Supports PNG, SVG, JPG, WEBP and on-canvas generation",
    },
    {
      title: "Control every vibe",
      description:
        "Adjust brightness, animations, and dimming schedules to match the mood instantly.",
      detail: "Preview the glow exactly as it ships",
    },
  ]

  const quickStats: Stat[] = [
    { value: "100+", label: "Colour combinations" },
    { value: "72h", label: "Average build time" },
    { value: "4.9★", label: "Creator satisfaction" },
  ]

  return (
    <section className="interactive-showcase" id="design-lab">
      <div className="content-container interactive-showcase__container">
        <div className="interactive-showcase__header">
          <span className="interactive-showcase__eyebrow">Design Lab</span>
          <h2 className="interactive-showcase__title">
            Craft a LED sign as unique as your imagination
          </h2>
          <p className="interactive-showcase__subtitle">
            Our editor gives you real-time control. Choose size, switch
            finishes, and pick colours while you watch your idea beam to life.
          </p>
        </div>
        <div className="interactive-showcase__grid">
          <div className="interactive-showcase__preview">
            <div className="interactive-showcase__preview-frame">
              <div className="interactive-showcase__preview-gradient" />
              <Image
                src="/sign-red.jpg"
                alt="Preview of a ruby red GlitchGlow sign inside the editor"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 45vw, 520px"
                className="interactive-showcase__preview-image"
              />
              <div className="interactive-showcase__preview-toolbar">
                <span className="interactive-showcase__toolbar-label">
                  Live Glow Intensity
                </span>
                <div className="interactive-showcase__toolbar-slider">
                  <span className="interactive-showcase__toolbar-track">
                    <span className="interactive-showcase__toolbar-thumb" />
                  </span>
                  <span className="interactive-showcase__toolbar-value">
                    82%
                  </span>
                </div>
              </div>
            </div>
            <div className="interactive-showcase__stats">
              {quickStats.map((stat) => (
                <div
                  key={stat.label}
                  className="interactive-showcase__stat-card"
                >
                  <span className="interactive-showcase__stat-value">
                    {stat.value}
                  </span>
                  <span className="interactive-showcase__stat-label">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="interactive-showcase__cards">
            {highlightCards.map((card, index) => (
              <article key={card.title} className="interactive-showcase__card">
                <span className="interactive-showcase__card-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="interactive-showcase__card-title">
                  {card.title}
                </h3>
                <p className="interactive-showcase__card-description">
                  {card.description}
                </p>
                <span className="interactive-showcase__card-detail">
                  {card.detail}
                </span>
              </article>
            ))}
            <LocalizedClientLink
              href="/design"
              className="interactive-showcase__cta"
            >
              Launch the editor
            </LocalizedClientLink>
          </div>
        </div>
      </div>
    </section>
  )
}

export default InteractiveShowcase
