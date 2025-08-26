import repeat from "@lib/util/repeat"
import { HttpTypes } from "@medusajs/types"
import { Heading, Table } from "@medusajs/ui"
import Item from "@modules/cart/components/item"
import SkeletonLineItem from "@modules/skeletons/components/skeleton-line-item"
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

      <div className="rrc-table-wrap">
        <Table>
          <Table.Header className="rrc-table-header">
            <Table.Row className="rrc-row-head">
              <Table.HeaderCell className="rrc-cell-left">
                Item
              </Table.HeaderCell>
              <Table.HeaderCell />
              <Table.HeaderCell>Quantity</Table.HeaderCell>
              <Table.HeaderCell className="rrc-hide-small">
                Price
              </Table.HeaderCell>
              <Table.HeaderCell className="rrc-cell-right rrc-text-right">
                Total
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {items
              ? items
                  .sort((a, b) =>
                    (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
                  )
                  .map((item) => (
                    <Item
                      key={item.id}
                      item={item}
                      currencyCode={cart?.currency_code || "USD"}
                    />
                  ))
              : repeat(5).map((i) => <SkeletonLineItem key={i} />)}
          </Table.Body>
        </Table>
      </div>
    </div>
  )
}

export default ItemsTemplate
