"use client"

import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"
import gsap from "gsap"

// Minimalne typy dla pluginu SplitText (GSAP nie dostarcza oficjalnych)
type SplitTextInstance = {
  chars?: HTMLElement[]
  words?: HTMLElement[]
  lines?: HTMLElement[]
  revert: () => void
}

type SplitTextConstructor = new (
  element: Element,
  vars?: {
    type?: "chars" | "words" | "lines"
    absolute?: boolean
    linesClass?: string
  }
) => SplitTextInstance

type SplitType = "chars" | "words" | "lines"

type Props = {
  text?: string
  className?: string
  delay?: number
  duration?: number
  ease?: string
  splitType?: SplitType
  from?: gsap.TweenVars
  to?: gsap.TweenVars
  threshold?: number
  rootMargin?: string
  textAlign?: CSSProperties["textAlign"]
  onLetterAnimationComplete?: () => void
}

const SplitText = ({
  text = "",
  className = "",
  delay = 100,
  duration = 0.6,
  ease = "power3.out",
  splitType = "chars",
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  threshold = 0.1,
  rootMargin = "-100px",
  textAlign = "center",
  onLetterAnimationComplete,
}: Props) => {
  const ref = useRef<HTMLParagraphElement | null>(null)

  // trzymamy referencje do obiektów, żeby móc je zabić przy cleanupie
  let gsapRef = useRef<typeof gsap | null>(null)
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const splitterRef = useRef<SplitTextInstance | null>(null)
  const scrollTriggerRef = useRef<
    import("gsap/ScrollTrigger").ScrollTrigger | null
  >(null)

  useEffect(() => {
    if (typeof window === "undefined" || !ref.current || !text?.trim()) return

    let mounted = true

    ;(async () => {
      // dynamiczne importy – działają tylko w przeglądarce
      const [{ default: gsap }, scrollTriggerMod, splitTextMod] =
        await Promise.all([
          import("gsap"),
          import("gsap/ScrollTrigger"),
          import("gsap/SplitText"),
        ])

      if (!mounted) return

      gsapRef.current = gsap

      const { ScrollTrigger } = scrollTriggerMod
      const { SplitText } = splitTextMod as unknown as {
        SplitText: SplitTextConstructor
      }

      // rejestracja pluginów
      gsap.registerPlugin(ScrollTrigger, SplitText as unknown as gsap.Plugin)

      const el = ref.current!
      const useAbsolute = splitType === "lines"

      let splitter: SplitTextInstance
      try {
        splitter = new SplitText(el, {
          type: splitType,
          absolute: useAbsolute,
          linesClass: "split-line",
        })
      } catch (e) {
        console.error("SplitText init failed:", e)
        return
      }

      splitterRef.current = splitter

      const targets =
        splitType === "lines"
          ? splitter.lines
          : splitType === "words"
          ? splitter.words
          : splitter.chars

      if (!targets || targets.length === 0) {
        console.warn("No targets for SplitText.")
        splitter.revert()
        splitterRef.current = null
        return
      }

      targets.forEach((t) => (t.style.willChange = "transform,opacity"))

      const startPct = (1 - threshold) * 100
      const m = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(rootMargin)
      const mv = m ? parseFloat(m[1]) : 0
      const mu = m ? m[2] || "px" : "px"
      const sign = mv < 0 ? `-=${Math.abs(mv)}${mu}` : `+=${mv}${mu}`
      const start = `top ${startPct}%${sign}`

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start,
          toggleActions: "play none none none",
          once: true,
          onToggle(self) {
            scrollTriggerRef.current = self
          },
        },
        smoothChildTiming: true,
        onComplete: () => {
          gsap.set(targets, {
            ...to,
            clearProps: "willChange",
            immediateRender: true,
          })
          onLetterAnimationComplete?.()
        },
      })

      tlRef.current = tl

      tl.set(targets, { ...from, immediateRender: false, force3D: true })
      tl.to(targets, {
        ...to,
        duration,
        ease,
        stagger: delay / 1000,
        force3D: true,
      })
    })()

    return () => {
      mounted = false
      // kill timeline
      tlRef.current?.kill()
      tlRef.current = null
      // kill ScrollTrigger
      scrollTriggerRef.current?.kill()
      scrollTriggerRef.current = null
      // kill tweens
      if (gsapRef.current && ref.current) {
        try {
          gsapRef.current.killTweensOf(ref.current)
        } catch {
          /* ignore */
        }
      }
      // revert SplitText
      try {
        splitterRef.current?.revert()
      } catch {
        /* ignore */
      } finally {
        splitterRef.current = null
      }
    }
  }, [
    text,
    delay,
    duration,
    ease,
    splitType,
    from,
    to,
    threshold,
    rootMargin,
    onLetterAnimationComplete,
  ])

  return (
    <p
      ref={ref}
      className={`split-parent ${className}`}
      style={{
        textAlign,
        overflow: "hidden",
        display: "inline-block",
        whiteSpace: "normal",
        wordWrap: "break-word",
      }}
    >
      {text}
    </p>
  )
}

export default SplitText

export const handleAnimationComplete = () => {
  // helper, gdy chcesz podać callback z zewnątrz
  console.log("Animacja liter zakończona!")
}
