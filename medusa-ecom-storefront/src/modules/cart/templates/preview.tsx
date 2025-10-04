"use client"

import repeat from "@lib/util/repeat"
import { HttpTypes } from "@medusajs/types"
import Item from "@modules/cart/components/item"
import "./preview.css"

type ItemsPreviewTemplateProps = {
  cart: HttpTypes.StoreCart
  isLoading?: boolean
}

const ItemsPreviewTemplate = ({
  cart,
  isLoading = false,
}: ItemsPreviewTemplateProps) => {
  const items = cart.items || []
  const hasOverflow = items.length > 4

  return (
    <div
      className={`rrc-preview ${hasOverflow ? "rrc-preview-scroll" : ""}`}
      data-testid="items-table"
    >
      <div className="rrc-preview-body">
        {items.length
          ? items
              .sort((a, b) =>
                (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
              )
              .map((item) => (
                <Item
                  key={item.id}
                  item={item}
                  type="preview"
                  currencyCode={cart.currency_code}
                  isLoading={isLoading}
                />
              ))
          : repeat(4).map((i) => <div key={i} className="rrc-skel-row" />)}
      </div>
    </div>
  )
}

export default ItemsPreviewTemplate
