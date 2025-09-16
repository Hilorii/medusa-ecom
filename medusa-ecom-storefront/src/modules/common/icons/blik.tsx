import React from "react"

import { IconProps } from "types/icon"

const Blik: React.FC<IconProps> = ({ size = 24, ...attributes }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      {...attributes}
    >
      <title>BLIK icon</title>
      <rect width="24" height="24" rx="4" fill="#111" />
      <text
        x="12"
        y="15"
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill="white"
        fontFamily="Inter, sans-serif"
      >
        BLIK
      </text>
      <circle cx="18" cy="6" r="2" fill="#ff3366" />
    </svg>
  )
}

export default Blik
