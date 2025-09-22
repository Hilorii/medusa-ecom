import React from "react"
import { FaApplePay } from "react-icons/fa"
import { IconProps } from "types/icon"

const ApplePay: React.FC<IconProps> = ({ size = 30, ...attributes }) => {
  return <FaApplePay size={size} {...attributes} />
}

export default ApplePay
