import { retrieveCart } from "@lib/data/cart"
import CartDropdown from "../cart-dropdown"
import "./cart-button.css"

export default async function CartButton() {
  const cart = await retrieveCart().catch(() => null)

  return <CartDropdown cart={cart} />
}
