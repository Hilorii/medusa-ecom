import Image from "next/image"
import Link from "next/link"
import "./global-promise.css"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type Perk = {
  title: string
  description: string
}

const GlobalPromise = () => {
  const perks: Perk[] = [
    {
      title: "Free EU shipping",
      description: "Tracked delivery with carbon offsets on every kilometre.",
    },
    {
      title: "Carefully packed",
      description: "Recycled kraft, compostable tape, zero bubble wrap.",
    },
    {
      title: "Lifetime glow support",
      description:
        "Repairs, dimming upgrades, and installation tips whenever you need them.",
    },
  ]

  return (
    <section className="global-promise" id="global-promise">
      <div className="content-container global-promise__container">
        <div className="global-promise__panel">
          <div className="global-promise__logo">
            <span className="global-promise__logo-orbit" />
            <Image
              src="/logo-rainbow.jpg"
              alt="GlitchGlow rainbow emblem"
              fill
              sizes="160px"
            />
          </div>
          <div className="global-promise__content">
            <span className="global-promise__eyebrow">
              Your glow, delivered right
            </span>
            <h2 className="global-promise__title">
              Hand-finished, tested, and on its way to you!
            </h2>
            <p className="global-promise__subtitle">
              Every GlitchGlow piece ships from our Danish studio with
              meticulous testing and eco-conscious packaging. Track it from the
              lab to your wall.
            </p>
            <div className="global-promise__perks">
              {perks.map((perk) => (
                <div key={perk.title} className="global-promise__perk">
                  <h3 className="global-promise__perk-title">{perk.title}</h3>
                  <p className="global-promise__perk-description">
                    {perk.description}
                  </p>
                </div>
              ))}
            </div>
            <div className="global-promise__actions">
              <LocalizedClientLink
                href="/design"
                className="global-promise__primary"
              >
                Design your own sign!
              </LocalizedClientLink>
              <LocalizedClientLink
                href="/gallery"
                className="global-promise__secondary"
              >
                Check our product!
              </LocalizedClientLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default GlobalPromise
