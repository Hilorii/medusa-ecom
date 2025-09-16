import React from "react"

import { IconProps } from "types/icon"

const GooglePay: React.FC<IconProps> = ({ size = 24, ...attributes }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      {...attributes}
    >
      <title>Google Pay icon</title>
      <rect width="24" height="24" rx="4" fill="#fff" stroke="#dadce0" />
      <text
        x="9"
        y="15"
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fontFamily="Inter, sans-serif"
        fill="#4285f4"
      >
        G
      </text>
      <text
        x="17"
        y="15"
        textAnchor="middle"
        fontSize="8"
        fontWeight="600"
        fontFamily="Inter, sans-serif"
        fill="#202124"
      >
        Pay
      </text>
    </svg>
  )
}

export default GooglePay
