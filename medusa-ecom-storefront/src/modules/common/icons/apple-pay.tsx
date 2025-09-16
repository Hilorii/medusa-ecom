import React from "react"

import { IconProps } from "types/icon"

const ApplePay: React.FC<IconProps> = ({ size = 24, ...attributes }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      {...attributes}
    >
      <title>Apple Pay icon</title>
      <rect width="24" height="24" rx="4" fill="#000" />
      <text
        x="7"
        y="15"
        textAnchor="middle"
        fontSize="12"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fill="#fff"
      >
        
      </text>
      <text
        x="16"
        y="15"
        textAnchor="middle"
        fontSize="8"
        fontWeight="600"
        fontFamily="Inter, sans-serif"
        fill="#fff"
      >
        Pay
      </text>
    </svg>
  )
}

export default ApplePay
