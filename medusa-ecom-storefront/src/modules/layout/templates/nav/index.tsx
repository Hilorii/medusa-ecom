import { Suspense } from "react"

import { listRegions } from "@lib/data/regions"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import SideMenu from "@modules/layout/components/side-menu"
import "./nav.css"

// Icons

export default async function Nav() {
  const regions = await listRegions().then((regions: StoreRegion[]) => regions)

  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      <header className="nav relative h-16 mx-auto border-b duration-200 bg-white border-ui-border-base">
        <nav className="content-container txt-xsmall-plus text-ui-fg-subtle flex items-center justify-between w-full h-full text-small-regular">
          <div className="flex-1 basis-0 h-full flex items-center">
            <div className="h-full">
              {/*MENU BUTTON*/}
              <SideMenu regions={regions} />
            </div>
          </div>

          <div className="flex items-center h-full">
            <LocalizedClientLink
              href="/"
              className="txt-compact-xlarge-plus hover:text-ui-fg-base uppercase text-white"
              data-testid="nav-store-link"
            >
              {/*LOGO*/}
              GLITCH GLOW
            </LocalizedClientLink>
          </div>

          <div className="flex items-center gap-x-6 h-full flex-1 basis-0 justify-end">
            <div className="hidden small:flex items-center gap-x-6 h-full">
              <LocalizedClientLink
                className="nav-buttons hover:text-ui-fg-base"
                href="/store"
                data-testid="nav-store-link"
              >
                {/*STORE BUTTON*/}
                Store
              </LocalizedClientLink>
            </div>
            <div className="hidden small:flex items-center gap-x-6 h-full">
              <LocalizedClientLink
                className="nav-buttons hover:text-ui-fg-base"
                href="/account"
                data-testid="nav-account-link"
              >
                {/*ACCOUNT BUTTON*/}
                Account
              </LocalizedClientLink>
            </div>
            <Suspense
              fallback={
                <LocalizedClientLink
                  className="nav-buttons hover:text-ui-fg-base flex gap-2"
                  href="/cart"
                  data-testid="nav-cart-link"
                >
                  Cart (0)
                </LocalizedClientLink>
              }
            >
              {/*CART BUTTON*/}
              <CartButton />
            </Suspense>
          </div>
        </nav>
      </header>
    </div>
  )
}
