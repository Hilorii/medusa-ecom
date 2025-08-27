import repeat from "@lib/util/repeat"
import { HttpTypes } from "@medusajs/types"
import { Heading } from "@medusajs/ui"

import Item from "@modules/cart/components/item"
import "./items.css"

type ItemsTemplateProps = {
  cart?: HttpTypes.StoreCart
}

const ItemsTemplate = ({ cart }: ItemsTemplateProps) => {
  const items = cart?.items

  return (
    <div className="rrc-items">
      <div className="rrc-header">
        <Heading className="rrc-title">Cart</Heading>
      </div>

      <div
        className="rrc-grid-wrap rrc-glass rrc-elevate"
        data-testid="items-table"
      >
        <div className="rrc-grid-head" role="row">
          <div className="rrc-hcell rrc-cell-left">Item</div>
          <div className="rrc-hcell" />
          <div className="rrc-hcell rrc-col-qty rrc-qty-head">Quantity</div>
          <div className="rrc-hcell rrc-hide-small rrc-col-price">Price</div>
          <div className="rrc-hcell rrc-cell-right rrc-text-right rrc-col-total">
            Total
          </div>
        </div>

        <div className="rrc-grid-body" role="rowgroup">
          {items
            ? items
                .sort((a, b) =>
                  (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
                )
                .map((item) => (
                  <Item
                    key={item.id}
                    item={item}
                    currencyCode={cart?.currency_code || "PLN"}
                  />
                ))
            : repeat(4).map((i) => <div key={i} className="rrc-skel-row" />)}
        </div>
      </div>
    </div>
  )
}

export default ItemsTemplate
