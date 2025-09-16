import React from "react"

import { IconProps } from "types/icon"

const Przelewy24: React.FC<IconProps> = ({ size = 24, ...attributes }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      {...attributes}
    >
      <title>Przelewy24 icon</title>
      <rect width="24" height="24" rx="4" fill="#fff" stroke="#d4001a" />
      <text
        x="12"
        y="14"
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fontFamily="Inter, sans-serif"
        fill="#d4001a"
      >
        P24
      </text>
    </svg>
  )
}

export default Przelewy24
