import React from "react"
import { IconProps } from "types/icon"

const Przelewy24: React.FC<IconProps> = ({ size = 30, ...attributes }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Przelewy24"
      {...attributes}
    >
      {/* Badge */}
      <rect
        x="2"
        y="14"
        width="60"
        height="36"
        rx="6"
        fill="#fff"
        stroke="#E5E7EB"
        strokeWidth="2"
      />

      {/* Line */}
      <path
        d="M8 20c12-6 28-9 44-6"
        fill="none"
        stroke="#D81F26"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Number 24 */}
      <text
        x="32"
        y="40"
        textAnchor="middle"
        fontFamily="Inter, Arial, sans-serif"
        fontSize="20"
        fontWeight="700"
        fill="#D81F26"
      >
        24
      </text>
    </svg>
  )
}

export default Przelewy24
