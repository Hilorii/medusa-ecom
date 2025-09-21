import "./sustainability.css"

type Pillar = {
  title: string
  description: string
  metric: string
  progress: number
}

const SustainabilitySpotlight = () => {
  const pillars: Pillar[] = [
    {
      title: "Low-impact luminosity",
      description:
        "Energy-efficient LEDs that sip power while staying brilliantly bright.",
      metric: "-63% energy",
      progress: 63,
    },
    {
      title: "Plastic-free promise",
      description:
        "We wrap every sign in recycled kraft, no single-use plastics — ever.",
      metric: "0g plastic",
      progress: 100,
    },
    {
      title: "Circular materials",
      description:
        "Aluminium backs and reclaimed acrylic reduce waste in production.",
      metric: "78% reclaimed",
      progress: 78,
    },
  ]

  const commitments = [
    "Eco-friendly packaging — zero plastic, fully recyclable",
    "Non-toxic finishes and eco inks for safe, vibrant glow",
    "Designed and assembled in Europe with care",
    "Built to last — durable boards you can customize again and again",
  ]

  return (
    <section className="sustainability" id="sustainability">
      <div className="content-container sustainability__container">
        <div className="sustainability__intro">
          <span className="sustainability__eyebrow">Eco ethos</span>
          <h2 className="sustainability__title">
            We build signs that care for the planet
          </h2>
          <p className="sustainability__description">
            From first sketch to final glow, GlitchGlow chooses materials and
            methods that leave a lighter footprint. Your custom piece arrives
            safe, plastic-free, and ready to shine responsibly.
          </p>
        </div>
        <div className="sustainability__grid">
          {pillars.map((pillar) => (
            <article key={pillar.title} className="sustainability__card">
              <div className="sustainability__metric">{pillar.metric}</div>
              <h3 className="sustainability__card-title">{pillar.title}</h3>
              <p className="sustainability__card-description">
                {pillar.description}
              </p>
              <div className="sustainability__progress" aria-hidden="true">
                <span
                  className="sustainability__progress-value"
                  style={{ width: `${pillar.progress}%` }}
                />
              </div>
            </article>
          ))}
        </div>
        <div className="sustainability__footer">
          <div className="sustainability__badge">
            Certified glow, conscious flow
          </div>
          <ul className="sustainability__list">
            {commitments.map((commitment) => (
              <li key={commitment} className="sustainability__list-item">
                {commitment}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

export default SustainabilitySpotlight
