import { Heading, Text } from "@medusajs/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import "./empty-cart.css"

/**
 * EmptyCartMessage
 * - Pure Next.js <Link> (no InteractiveLink)
 * - Subtle glass panel with micro-interactions
 * - Accessible structure and focus-visible states
 */
const EmptyCartMessage = () => {
  return (
    <section
      className="gg-empty-cart-wrap"
      aria-labelledby="gg-empty-cart-title"
      data-testid="empty-cart-message"
    >
      {/* Decorative cart icon (visual only) */}
      {/*<div className="gg-empty-cart-icon" aria-hidden="true">*/}
      {/*  🛒*/}
      {/*</div>*/}

      <Heading
        id="gg-empty-cart-title"
        level="h1"
        className="gg-empty-cart-title"
      >
        Cart
      </Heading>

      <Text className="gg-empty-cart-text">
        Your cart is empty. Start crafting your own design.
      </Text>

      <div className="gg-empty-cart-cta">
        {/* Primary CTA */}
        <LocalizedClientLink
          href="/design"
          className="gg-empty-cart-btn gg-empty-cart-btn--primary"
        >
          Design your own product
        </LocalizedClientLink>
      </div>

      {/* Helpful tips to make the empty state engaging */}
      <ul className="gg-empty-cart-tips" aria-label="Helpful tips">
        <li>Choose size and finish, then upload your artwork.</li>
        <li>See live preview while configuring your design.</li>
        <li>Add to cart with one click when you’re ready.</li>
      </ul>
    </section>
  )
}

export default EmptyCartMessage
