import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import "styles/globals.css"
import { Montserrat } from "next/font/google"
import CookieConsent from "@modules/common/components/cookie-consent"

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="light">
      <body
        className={`${montserrat.variable} font-sans antialiased min-h-dvh flex flex-col`}
      >
        <main className="relative">{props.children}</main>
        <CookieConsent />
      </body>
    </html>
  )
}
