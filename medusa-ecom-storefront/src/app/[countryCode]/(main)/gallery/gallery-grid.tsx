"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"

type Props = {
  images: string[]
}

// Lightweight in-page lightbox with keyboard navigation and swipe support
export default function GalleryGrid({ images }: Props) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const startX = useRef<number | null>(null)

  // Compute aspect-ratio friendly placeholders (just reusing the same URL)
  const items = useMemo(
    () => images.map((src, i) => ({ id: i, src })),
    [images]
  )

  const openAt = useCallback((i: number) => {
    setIndex(i)
    setOpen(true)
  }, [])

  const close = useCallback(() => setOpen(false), [])

  const next = useCallback(
    () => setIndex((v) => (v + 1) % items.length),
    [items.length]
  )
  const prev = useCallback(
    () => setIndex((v) => (v - 1 + items.length) % items.length),
    [items.length]
  )

  // Keyboard controls when lightbox is open
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
      if (e.key === "ArrowRight") next()
      if (e.key === "ArrowLeft") prev()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, close, next, prev])

  // Trap focus for accessibility when open
  useEffect(() => {
    if (open && dialogRef.current) {
      dialogRef.current.focus()
    }
  }, [open])

  if (!items.length) {
    return (
      <div className="gg-gallery-empty">
        <p>
          No images found in <code>/public/gallery</code>. Add some files to see
          the gallery.
        </p>
      </div>
    )
  }

  return (
    <>
      <section className="gg-gallery-grid" aria-label="Image gallery">
        {items.map((item, i) => (
          <article
            key={item.id}
            className="gg-gallery-card"
            onClick={() => openAt(i)}
          >
            {/* Card media */}
            <div className="gg-gallery-media">
              <Image
                src={item.src}
                alt={`Gallery image ${i + 1}`}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                className="gg-gallery-img"
              />
            </div>

            {/* Card overlay */}
            <div className="gg-gallery-overlay">
              <span className="gg-gallery-zoom">View</span>
            </div>
          </article>
        ))}
      </section>
      {/* Lightbox */}
      {open && (
        <div
          className="gg-gallery-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
          tabIndex={-1}
          ref={dialogRef}
          onClick={close}
          onTouchStart={(e) => {
            // Basic swipe start
            startX.current = e.touches[0].clientX
          }}
          onTouchEnd={(e) => {
            // Basic swipe end
            if (startX.current == null) return
            const delta = e.changedTouches[0].clientX - startX.current
            if (Math.abs(delta) > 40) {
              if (delta < 0) next()
              else prev()
            }
            startX.current = null
          }}
        >
          <button
            className="gg-gallery-close"
            aria-label="Close"
            onClick={close}
          >
            ×
          </button>

          <button
            className="gg-gallery-nav gg-gallery-prev"
            aria-label="Previous"
            onClick={(e) => {
              e.stopPropagation()
              prev()
            }}
          >
            ‹
          </button>
          <button
            className="gg-gallery-nav gg-gallery-next"
            aria-label="Next"
            onClick={(e) => {
              e.stopPropagation()
              next()
            }}
          >
            ›
          </button>

          <figure
            className="gg-gallery-stage"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={items[index].src}
              alt={`Gallery image ${index + 1} of ${items.length}`}
              fill
              sizes="100vw"
              className="gg-gallery-stage-img"
              priority
            />
            <figcaption className="gg-gallery-counter">
              {index + 1} / {items.length}
            </figcaption>
          </figure>
        </div>
      )}
    </>
  )
}
