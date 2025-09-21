import "./testimonials.css"

type Testimonial = {
  quote: string
  name: string
  role: string
  initials: string
}

const Testimonials = () => {
  const testimonials: Testimonial[] = [
    {
      quote:
        "The editor let us match our club colours perfectly. The sign arrived fast and looks exactly like the live preview.",
      name: "Aurora Loft",
      role: "Nightclub, Berlin",
      initials: "AL",
    },
    {
      quote:
        "We uploaded a sketch and the team refined every detail. The dimming schedule keeps energy use so low!",
      name: "Nordic Bloom",
      role: "Florist, Copenhagen",
      initials: "NB",
    },
    {
      quote:
        "Obsessed with the handmade quality. Plastic-free packaging and repair support make us lifelong fans.",
      name: "Studio Lumen",
      role: "Design duo, Paris",
      initials: "SL",
    },
  ]

  return (
    <section className="testimonials" aria-labelledby="testimonials-title">
      <div className="content-container testimonials__container">
        <div className="testimonials__intro">
          <span className="testimonials__eyebrow">Loved across Europe</span>
          <h2 id="testimonials-title" className="testimonials__title">
            Creators trust GlitchGlow to set the mood
          </h2>
          <p className="testimonials__subtitle">
            From intimate studios to large venues, our signs deliver impact
            without compromising on sustainability.
          </p>
        </div>
        <div className="testimonials__grid">
          {testimonials.map((testimonial) => (
            <figure key={testimonial.name} className="testimonials__card">
              <div className="testimonials__avatar" aria-hidden="true">
                <span>{testimonial.initials}</span>
              </div>
              <blockquote className="testimonials__quote">
                “{testimonial.quote}”
              </blockquote>
              <figcaption className="testimonials__author">
                <span className="testimonials__name">{testimonial.name}</span>
                <span className="testimonials__role">{testimonial.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Testimonials
