import { Heading, Text } from "@medusajs/ui"
import InteractiveLink from "@modules/common/components/interactive-link"
import "./empty-cart.css"

const EmptyCartMessage = () => {
  return (
    <div
      className="rrc-empty rrc-glass rrc-elevate"
      data-testid="empty-cart-message"
    >
      <Heading level="h1" className="rrc-empty-title">
        Cart
      </Heading>
      <Text className="rrc-empty-text">
        You don&apos;t have anything in your cart. Let&apos;s change that — use
        the link below to start browsing our products.
      </Text>
      <div className="rrc-empty-action">
        <InteractiveLink href="/store">Explore products</InteractiveLink>
      </div>
    </div>
  )
}

export default EmptyCartMessage
