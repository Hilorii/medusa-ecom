// File: modules/order/components/items/index.tsx
// Replaces Medusa UI Table with custom responsive list (no white background).
// All comments in English as requested. Class prefix uses `gg-`.

import repeat from "@lib/util/repeat"
import { HttpTypes } from "@medusajs/types"

import Divider from "@modules/common/components/divider"

// Component-scoped CSS
import "./items.css"

type ItemsProps = {
  order: HttpTypes.StoreOrder
}

const Items = ({ order }: ItemsProps) => {
  const items = order.items || []

  // Currency formatter based on the order currency_code
  const fmt = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: order.currency_code || "EUR",
    currencyDisplay: "narrowSymbol",
  })

  // Try to compute a reasonable line total if some fields are missing
  const getLineTotal = (item: any) => {
    // Prefer total; fallback to subtotal; else unit_price * quantity
    const total =
      (item.total ??
        item.subtotal ??
        (item.unit_price != null && item.quantity != null
          ? Number(item.unit_price) * Number(item.quantity)
          : 0)) ||
      0

    return fmt.format(
      Number(total) / (item.unit_price && item.unit_price > 999 ? 100 : 1)
    )
  }

  const getUnitPrice = (item: any) => {
    const unit =
      item.unit_price ??
      (item.total && item.quantity
        ? Number(item.total) / Number(item.quantity)
        : 0)
    return fmt.format(Number(unit) / (unit > 999 ? 100 : 1))
  }

  return (
    <div className="gg-items">
      <Divider className="!mb-0" />

      <div className="gg-items-list" data-testid="products-table">
        {items.length
          ? [...items]
              .sort((a, b) =>
                (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
              )
              .map((item) => {
                const lineTotal = getLineTotal(item)
                const unitPrice = getUnitPrice(item)

                return (
                  <article className="gg-item" key={item.id}>
                    <div className="gg-item-media">
                      {/* Use native img to avoid extra deps; container sets size & radius */}
                      <img
                        src={item.thumbnail || "/placeholder.svg"}
                        alt={item.title || "Product"}
                        loading="lazy"
                      />
                    </div>

                    <div className="gg-item-main">
                      <h3 className="gg-item-title">{item.title}</h3>
                      {item?.variant_title && (
                        <p className="gg-item-variant">
                          Variant: {item.variant_title}
                        </p>
                      )}
                      {item?.variant_title && (
                        <p className="gg-item-variant">
                          Variant: {item.variant_title}
                        </p>
                      )}
                    </div>

                    <div className="gg-item-meta">
                      <div className="gg-item-qty" aria-label="Quantity">
                        ×{item.quantity ?? 1}
                      </div>
                      <div className="gg-item-price">
                        <span className="gg-item-unit">{unitPrice}</span>
                        <span className="gg-item-total">{lineTotal}</span>
                      </div>
                    </div>
                  </article>
                )
              })
          : repeat(4).map((i) => (
              <article className="gg-item gg-item--skeleton" key={i}>
                <div className="gg-skel skel-thumb" />
                <div className="gg-skel skel-lines" />
                <div className="gg-skel skel-meta" />
              </article>
            ))}
      </div>
    </div>
  )
}

export default Items
