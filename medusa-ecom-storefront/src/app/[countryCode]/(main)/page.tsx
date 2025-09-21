import { Metadata } from "next"

import FeaturedProducts from "@modules/home/components/featured-products"
import GlobalPromise from "@modules/home/components/global-promise"
import Hero from "@modules/home/components/hero"
import InteractiveShowcase from "@modules/home/components/interactive-showcase"
import SustainabilitySpotlight from "@modules/home/components/sustainability"
import Testimonials from "@modules/home/components/testimonials"
import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"

export const metadata: Metadata = {
  title: "GlitchGlow",
  description:
    "A performant frontend ecommerce starter template with Next.js 15 and Medusa.",
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  const region = await getRegion(countryCode)

  const { collections } = await listCollections({
    fields: "id, handle, title",
  })

  if (!collections || !region) {
    return null
  }

  return (
    <>
      <Hero />
      <InteractiveShowcase />
      <SustainabilitySpotlight />
      <GlobalPromise />
      <Testimonials />
      <div className="py-12">
        <ul className="flex flex-col gap-x-6">
          <FeaturedProducts collections={collections} region={region} />
        </ul>
      </div>
    </>
  )
}
