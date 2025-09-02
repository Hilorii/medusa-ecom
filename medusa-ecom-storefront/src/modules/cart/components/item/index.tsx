"use client"

import { Text, clx } from "@medusajs/ui"
import { updateLineItem } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import CartItemSelect from "@modules/cart/components/cart-item-select"
import ErrorMessage from "@modules/checkout/components/error-message"
import DeleteButton from "@modules/common/components/delete-button"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LineItemUnitPrice from "@modules/common/components/line-item-unit-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Spinner from "@modules/common/icons/spinner"
import Thumbnail from "@modules/products/components/thumbnail"
import { useState } from "react"

import "./cart-item.css"

type ItemProps = {
  item: HttpTypes.StoreCartLineItem
  type?: "full" | "preview"
  currencyCode: string
}

const Item = ({ item, type = "full", currencyCode }: ItemProps) => {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // comments in English: update quantity handler
  const changeQuantity = async (quantity: number) => {
    setError(null)
    setUpdating(true)

    await updateLineItem({ lineId: item.id, quantity })
      .catch((err) => setError(err.message))
      .finally(() => setUpdating(false))
  }

  const maxQtyFromInventory = 10
  const maxQuantity = item.variant?.manage_inventory ? 10 : maxQtyFromInventory

  // comments in English: extract our custom metadata for display
  const md = (item.metadata || {}) as Record<string, any>
  const metaRows: Array<[string, string | undefined]> = [
    ["Size", md.size],
    ["Material", md.material], // in UI it’s “flavor”
    ["Color", md.color],
    // ["File", md.fileName], // it destroys the ui -.-
  ].filter(([, v]) => Boolean(v)) as Array<[string, string]>

  return (
    <div
      className={clx("rrc-row", { "rrc-row--preview": type === "preview" })}
      role="row"
      data-testid="product-row"
    >
      {/* THUMB */}
      <div className="rrc-cell rrc-thumb">
        <LocalizedClientLink
          href={`/products/${item.product_handle}`}
          className={clx("rrc-thumb-link", {
            "rrc-thumb-preview": type === "preview",
            "rrc-thumb-full": type === "full",
          })}
        >
          <Thumbnail
            thumbnail={item.thumbnail}
            images={item.variant?.product?.images}
            size="square"
          />
        </LocalizedClientLink>
      </div>

      {/* MAIN */}
      <div className="rrc-cell rrc-main">
        <Text className="rrc-item-title" data-testid="product-title">
          {item.product_title}
        </Text>

        {/* comments in English: standard variant options (size/variant from Medusa) */}
        <LineItemOptions variant={item.variant} data-testid="product-variant" />

        {/* Custom metadata block (Design Your Own selections) */}
        {metaRows.length > 0 && (
          <div className="gg-meta">
            <ul className="gg-meta-list">
              {metaRows.map(([k, v]) => (
                <li key={k} className="gg-meta-item">
                  <span className="gg-meta-k">{k}:</span>{" "}
                  <span className="gg-meta-v">{v}</span>
                </li>
              ))}
              {md.fileUrl && (
                <li className="gg-meta-item">
                  <a
                    href={md.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="gg-meta-link"
                  >
                    View artwork
                  </a>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* QTY – only when fully seen */}
      {type === "full" && (
        <div className="rrc-cell rrc-qty">
          <div className="rrc-qty-wrap">
            <DeleteButton id={item.id} data-testid="product-delete-button" />
            {/*<CartItemSelect*/}
            {/*  value={item.quantity}*/}
            {/*  onChange={(value) => changeQuantity(parseInt(value.target.value))}*/}
            {/*  data-testid="product-select-button"*/}
            {/*>*/}
            {/*  {Array.from({ length: Math.min(maxQuantity, 10) }, (_, i) => (*/}
            {/*    <option value={i + 1} key={i}>*/}
            {/*      {i + 1}*/}
            {/*    </option>*/}
            {/*  ))}*/}
            {/*</CartItemSelect>*/}
            <strong className="gg-cart-strong">1</strong>
            {updating && <Spinner />}
          </div>
          <ErrorMessage error={error} data-testid="product-error-message" />
        </div>
      )}

      {/* UNIT – hidden in preview and on small */}
      {type === "full" && (
        <div className="rrc-cell rrc-unit rrc-hide-small">
          <LineItemUnitPrice
            item={item}
            style="tight"
            currencyCode={currencyCode}
          />
        </div>
      )}

      {/* TOTAL */}
      <div className="rrc-cell rrc-total">
        <span className={clx({ "rrc-total-preview": type === "preview" })}>
          {type === "preview" && (
            <span className="rrc-total-inline">
              <Text className="rrc-muted">{item.quantity}x </Text>
              <LineItemUnitPrice
                item={item}
                style="tight"
                currencyCode={currencyCode}
              />
            </span>
          )}
          <LineItemPrice
            item={item}
            style="tight"
            currencyCode={currencyCode}
          />
        </span>
      </div>
    </div>
  )
}

export default Item
