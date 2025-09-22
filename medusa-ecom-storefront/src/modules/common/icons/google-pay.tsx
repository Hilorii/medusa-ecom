import React from "react"
import { FaGooglePay } from "react-icons/fa"
import { IconProps } from "types/icon"

const GooglePay: React.FC<IconProps> = ({ size = 30, ...attributes }) => {
  return <FaGooglePay size={size} {...attributes} />
}

export default GooglePay
