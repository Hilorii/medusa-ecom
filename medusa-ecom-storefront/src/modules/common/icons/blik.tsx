import React from "react"
import { IconProps } from "types/icon"

const Blik: React.FC<IconProps> = ({ size = 24, ...attributes }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 512 512"
      {...attributes}
    >
      <rect width="512" height="512" rx="100" fill="#000" />
      <text
        x="50%"
        y="55%"
        textAnchor="middle"
        fontSize="280"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="bold"
        fill="#fff"
        dy=".3em"
      >
        blik
      </text>
      <circle cx="430" cy="90" r="40" fill="#e6007e" />
    </svg>
  )
}

export default Blik
