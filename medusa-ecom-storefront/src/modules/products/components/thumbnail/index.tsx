import { Container, clx } from "@medusajs/ui"
import Image from "next/image"
import React from "react"

import PlaceholderImage from "@modules/common/icons/placeholder-image"

type ThumbnailProps = {
  thumbnail?: string | null
  // TODO: Fix image typings
  images?: any[] | null
  size?: "small" | "medium" | "large" | "full" | "square"
  isFeatured?: boolean
  className?: string
  "data-testid"?: string
}

/**
 * Dozwolone hosty dla next/image – pomocniczo również po stronie klienta,
 * aby w razie niezgodności z configiem awaryjnie użyć <img>.
 * Możesz rozszerzyć listę przez NEXT_PUBLIC_NEXT_IMAGE_HOSTS (CSV).
 */
const ALLOWED_HOSTS: string[] = (
  process.env.NEXT_PUBLIC_NEXT_IMAGE_HOSTS ?? "via.placeholder.com,localhost"
)
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean)

const isAbsoluteHttp = (url?: string | null) =>
  !!url && /^https?:\/\//i.test(url)

const getHostname = (url?: string | null) => {
  if (!url) return null
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}

const canUseNextImage = (url?: string | null) => {
  // Relative URL (np. /uploads/...) – OK dla next/image.
  if (!isAbsoluteHttp(url)) return true
  const host = getHostname(url)
  return !!host && ALLOWED_HOSTS.includes(host)
}

const Thumbnail: React.FC<ThumbnailProps> = ({
  thumbnail,
  images,
  size = "small",
  isFeatured,
  className,
  "data-testid": dataTestid,
}) => {
  const initialImage = thumbnail || images?.[0]?.url

  return (
    <Container
      className={clx(
        "relative w-full overflow-hidden p-4 bg-ui-bg-subtle shadow-elevation-card-rest rounded-large group-hover:shadow-elevation-card-hover transition-shadow ease-in-out duration-150",
        className,
        {
          "aspect-[11/14]": isFeatured,
          "aspect-[9/16]": !isFeatured && size !== "square",
          "aspect-[1/1]": size === "square",
          "w-[180px]": size === "small",
          "w-[290px]": size === "medium",
          "w-[440px]": size === "large",
          "w-full": size === "full",
        }
      )}
      data-testid={dataTestid}
    >
      <ImageOrPlaceholder image={initialImage} size={size} />
    </Container>
  )
}

const ImageOrPlaceholder = ({
  image,
  size,
}: Pick<ThumbnailProps, "size"> & { image?: string | null }) => {
  if (!image) {
    return (
      <div className="w-full h-full absolute inset-0 flex items-center justify-center">
        <PlaceholderImage size={size === "small" ? 16 : 24} />
      </div>
    )
  }

  // Jeśli host jest dozwolony – używamy <Image>. W innym razie – łagodny fallback na <img>.
  const useNextImage = canUseNextImage(image)

  if (useNextImage) {
    return (
      <Image
        src={image}
        alt="Thumbnail"
        className="absolute inset-0 object-cover object-center"
        draggable={false}
        quality={50}
        sizes="(max-width: 576px) 280px, (max-width: 768px) 360px, (max-width: 992px) 480px, 800px"
        fill
      />
    )
  }

  // Fallback: zwykły <img> (bez ograniczeń hostów Next.js)
  return (
    <img
      src={image}
      alt="Thumbnail"
      className="absolute inset-0 object-cover object-center w-full h-full"
      draggable={false}
      loading="lazy"
      decoding="async"
    />
  )
}

export default Thumbnail
