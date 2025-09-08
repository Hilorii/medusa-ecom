// Server component: reads image filenames from /public/gallery and passes them to a client grid
import fs from "fs/promises"
import path from "path"
import GalleryGrid from "./gallery-grid"
import "./gallery.css"

// Helper to list files in /public/gallery
async function getGalleryImages() {
  // Resolve absolute path to /public/gallery
  const galleryDir = path.join(process.cwd(), "public", "gallery")

  try {
    const entries = await fs.readdir(galleryDir, { withFileTypes: true })

    // Filter only files with common image extensions
    const allowed = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"])

    const files = entries
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .filter((name) => allowed.has(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b))

    // Turn into public-facing URLs
    const urls = files.map((name) => `/gallery/${name}`)

    return urls
  } catch (err) {
    // If directory doesn't exist or is empty, return an empty array
    console.error("Failed to read /public/gallery:", err)
    return []
  }
}

export default async function GalleryPage() {
  const images = await getGalleryImages()

  return (
    <main className="gg-gallery-page">
      {/*<div className="gg-gallery-header">*/}
      {/*  <h1 className="gg-gallery-title">Gallery</h1>*/}
      {/*  <p className="gg-gallery-subtitle">*/}
      {/*    Explore the latest shots from our collection. Click any card to open*/}
      {/*    the lightbox.*/}
      {/*  </p>*/}
      {/*</div>*/}

      <GalleryGrid images={images} />
    </main>
  )
}
