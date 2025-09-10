import type { Metadata } from "next"
import "./about.css"

export const metadata: Metadata = {
  title: "GlitchGlow – About Us",
  description:
    "We turn your ideas into stunning RGB LED signs with precision and creativity.",
  openGraph: {
    title: "GlitchGlow – About Us",
    description:
      "Custom RGB LED signs, designed and built to glow with personality.",
    images: ["/sign-green.jpg"],
  },
}

export default function AboutPage() {
  return (
    <>
      <div
        aria-hidden
        className="about-bg fixed inset-0 -z-10 pointer-events-none"
      />
      <section className="about-wrap min-h-screen relative flex items-center justify-center px-6 py-16">
        {/* Foreground content */}
        <div className="about-glass mx-auto w-full max-w-3xl rounded-3xl p-8 md:p-10 shadow-2xl ring-1 ring-white/10">
          <header className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
              About GlitchGlow
            </h1>
            <p className="mt-2 text-sm md:text-base text-white/70">
              Crafting custom RGB LED signs that glow with personality.
            </p>
          </header>

          <p className="text-base md:text-lg leading-7 text-white/90">
            We’re a Denmark-based company passionate about turning your ideas
            into stunning, glowing works of art. Our RGB LED signs are crafted
            with precision, care, and a touch of creativity, so you can proudly
            display your name, logo, or artwork in vivid light. Every sign we
            make is built to impress — and built just for you.
          </p>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-2 gap-4 text-center">
            <div className="about-stat">
              <span className="about-stat-k">10k+</span>
              <span className="about-stat-label">LED pixels lit</span>
            </div>
            <div className="about-stat">
              <span className="about-stat-k">100%</span>
              <span className="about-stat-label">Custom-made</span>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <a
              href="/design"
              className="about-btn-primary"
              aria-label="Start your sign"
            >
              Start your sign
            </a>
            <a
              href="/gallery"
              className="about-btn-ghost"
              aria-label="View gallery"
            >
              View gallery
            </a>
          </div>
        </div>

        {/* Decorative subtle glow at bottom */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto h-40 w-[60%] blur-3xl bg-gradient-to-r from-cyan-400/20 via-fuchsia-400/20 to-lime-400/20"
        />
      </section>
    </>
  )
}
