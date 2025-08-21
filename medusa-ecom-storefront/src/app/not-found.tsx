// import { ArrowUpRightMini } from "@medusajs/icons"
import { Text } from "@medusajs/ui"
import { Metadata } from "next"
import Link from "next/link"
import SplitText from "../gsap/split-text"
import handleAnimationComplete from "../gsap/split-text"

export const metadata: Metadata = {
  title: "Are you lost? - 404",
  description: "Something went wrong",
}

// Hey fuzzy text from gsap is nice here
export default function NotFound() {
  return (
    <div className="flex flex-col gap-4 items-center justify-center min-h-[calc(100vh-64px)]">
      <SplitText
        text="404 Page not found! ༼ つ ◕_◕ ༽つ"
        className="text-6xl font-semibold text-center pb-10"
        delay={150}
        duration={1}
        ease="power3.out"
        splitType="chars"
        from={{ opacity: 0, y: 40 }}
        to={{ opacity: 1, y: 0 }}
        threshold={0.1}
        rootMargin="-100px"
        textAlign="center"
        onLetterAnimationComplete={handleAnimationComplete}
      />
      <Link className="flex gap-x-1 items-center group" href="/">
        <Text className="text-3xl text-ui-fg-interactive text-white mt-6">
          CLICK ME
        </Text>
        {/*<ArrowUpRightMini*/}
        {/*  className="group-hover:rotate-45 ease-in-out duration-150"*/}
        {/*  color="var(--fg-interactive)"*/}
        {/*/>*/}
      </Link>
    </div>
  )
}
