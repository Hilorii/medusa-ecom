import ItemsTemplate from "./items"
import Summary from "./summary"
import EmptyCartMessage from "../components/empty-cart-message"
import { HttpTypes } from "@medusajs/types"
import "./cart.css"

const CartTemplate = ({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) => {
  const hasItems = !!cart?.items?.length

  return (
    <div className="rrc-cart-page">
      <div className="rrc-cart-container" data-testid="cart-container">
        {hasItems ? (
          <div className="rrc-cart-grid">
            <div className="rrc-cart-left rrc-glass rrc-elevate">
              {/* usuwamy logowanie z UI (na prośbę) */}
              <ItemsTemplate cart={cart!} />
            </div>

            <aside className="rrc-cart-right">
              <div className="rrc-sticky">
                {cart && cart.region && (
                  <div className="rrc-glass rrc-elevate">
                    <Summary cart={cart as any} />
                  </div>
                )}
              </div>
            </aside>
          </div>
        ) : (
          <div className="rrc-empty-wrap">
            <EmptyCartMessage />
          </div>
        )}
      </div>
    </div>
  )
}

export default CartTemplate
