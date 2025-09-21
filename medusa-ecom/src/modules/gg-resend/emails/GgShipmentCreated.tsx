// Comments in English
import * as React from "react";
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Heading,
  Text,
  Hr,
  Section,
  Button,
  Img,
  Link,
} from "@react-email/components";

export type GgShipmentCreatedProps = {
  order_id: string;
  // Deprecated (kept for compatibility; not rendered):
  tracking_number?: string;
  tracking_url?: string;

  shop_name?: string;
  shop_url?: string; // optional: homepage/storefront (not an order page)
  support_email?: string; // optional: "support@yourshop.com"
  logo_url?: string; // optional: hosted logo
  carrier_name?: string; // optional: "DHL", "UPS", etc.
  estimated_delivery?: string; // optional: "Tue, Sep 24"
  // Optional shipping snippet
  shipping_name?: string;
  shipping_street?: string;
  shipping_postal?: string;
  shipping_city?: string;
  shipping_country?: string;
};

export default function GgShipmentCreatedEmail({
  order_id,
  shop_name = "Your shop",
  shop_url,
  support_email,
  logo_url,
  carrier_name,
  estimated_delivery,
  shipping_name,
  shipping_street,
  shipping_postal,
  shipping_city,
  shipping_country,
}: GgShipmentCreatedProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Your order #${order_id} is on the way`}</Preview>
      <Body style={styles.body}>
        <Container style={styles.card}>
          {/* Neon gradient top bar */}
          <Section style={styles.topbar} />

          {/* Brand header */}
          <Section style={styles.header}>
            {logo_url ? (
              <Img
                src={logo_url}
                alt={shop_name}
                width="128"
                height="auto"
                style={styles.logo}
              />
            ) : (
              <Heading style={styles.brand}>{shop_name}</Heading>
            )}
          </Section>

          {/* Title */}
          <Section style={styles.section}>
            <Heading as="h2" style={styles.h2}>
              Your order is on the way
            </Heading>
            <Text style={styles.lead}>
              Great news! Order <b>#{order_id}</b> has left our warehouse.
            </Text>
          </Section>

          {/* Order pill */}
          <Section style={styles.badgeWrap}>
            <div style={styles.badge}>
              <span style={styles.badgeLabel}>Order</span>
              <span style={styles.badgeValue}>#{order_id}</span>
            </div>
          </Section>

          <Hr style={styles.hr} />

          {/* Info blocks (ETA + Address) */}
          {(estimated_delivery || carrier_name || shipping_name) && (
            <Section style={styles.grid}>
              <div style={styles.panel}>
                <div style={styles.panelLabel}>Estimated delivery</div>
                <div style={styles.panelValue}>
                  {estimated_delivery || "Soon"}
                </div>
                {carrier_name ? (
                  <div style={styles.panelMeta}>Carrier: {carrier_name}</div>
                ) : null}
              </div>

              {shipping_name ? (
                <div style={styles.panel}>
                  <div style={styles.panelLabel}>Shipping address</div>
                  <div style={styles.addr}>
                    {shipping_name}
                    <br />
                    {shipping_street}
                    <br />
                    {shipping_postal} {shipping_city}
                    <br />
                    {shipping_country}
                  </div>
                </div>
              ) : null}
            </Section>
          )}

          {/* Optional extra actions (no order page links) */}
          {(shop_url || support_email) && <Hr style={styles.hr} />}
          <Section style={styles.actions}>
            {shop_url ? (
              <Button href={shop_url} style={styles.ghostBtn}>
                Visit our store
              </Button>
            ) : null}
            {support_email ? (
              <Button href={`mailto:${support_email}`} style={styles.ghostBtn}>
                Contact support
              </Button>
            ) : null}
          </Section>

          {/* Footer */}
          <Text style={styles.footer}>
            You’ll receive another email when your package is delivered.
            {support_email ? (
              <>
                {" "}
                Need help?{" "}
                <Link href={`mailto:${support_email}`} style={styles.link}>
                  {support_email}
                </Link>
                .
              </>
            ) : null}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// ---------- Theme & styles ----------
const theme = {
  page: "#0b0d10",
  card: "#ffffff",
  text: "#0f172a",
  muted: "#64748b",
  border: "#e5e7eb",
  soft: "#f8fafc",
  ring: "rgba(124,58,237,.18)",
  grad: "linear-gradient(90deg, #8b5cf6 0%, #22d3ee 50%, #8b5cf6 100%)", // neon accent
};

const styles: Record<string, React.CSSProperties> = {
  body: {
    background: `radial-gradient(1200px 500px at 50% -200px, rgba(124,58,237,.25), transparent 50%), ${theme.page}`,
    margin: 0,
    padding: "36px 18px",
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial",
  },
  card: {
    background: theme.card,
    borderRadius: 20,
    padding: 28,
    maxWidth: 640,
    margin: "0 auto",
    boxShadow: `0 28px 80px ${theme.ring}`,
    border: `1px solid ${theme.border}`,
  },
  topbar: { height: 8, background: theme.grad, borderRadius: 999 },
  header: { textAlign: "center" as const, padding: "10px 0 2px" },
  logo: { display: "inline-block", margin: "0 auto" },
  brand: {
    fontSize: 18,
    fontWeight: 700,
    margin: 0,
    letterSpacing: 0.4,
    color: theme.muted,
  },
  section: { paddingTop: 10, paddingBottom: 10 },
  h2: {
    fontSize: 26,
    lineHeight: "30px",
    margin: "6px 0 10px",
    fontWeight: 800,
    color: theme.text,
  },
  lead: {
    fontSize: 15,
    lineHeight: "22px",
    color: theme.text,
    opacity: 0.9,
    margin: "6px 0 0",
  },
  hr: { borderColor: theme.border, margin: "20px 0" },
  badgeWrap: { textAlign: "center" as const, padding: "2px 0 12px" },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 16px",
    borderRadius: 999,
    background: theme.soft,
    border: `1px solid ${theme.border}`,
  },
  badgeLabel: {
    fontSize: 12,
    color: theme.muted,
    letterSpacing: 0.4,
    textTransform: "uppercase" as const,
  },
  badgeValue: { fontSize: 14, fontWeight: 800, color: theme.text },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },
  panel: {
    background: theme.soft,
    border: `1px solid ${theme.border}`,
    borderRadius: 16,
    padding: 16,
  },
  panelLabel: {
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase" as const,
    color: theme.muted,
    margin: "0 0 6px",
    fontWeight: 700,
  },
  panelValue: {
    fontSize: 16,
    fontWeight: 700,
    color: theme.text,
    margin: 0,
  },
  panelMeta: { fontSize: 12, color: theme.muted, marginTop: 4 },
  addr: { fontSize: 14, color: theme.text, lineHeight: "20px" },
  actions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap" as const,
    justifyContent: "center" as const,
    marginTop: 4,
    marginBottom: 4,
  },
  ghostBtn: {
    display: "inline-block",
    padding: "12px 18px",
    borderRadius: 12,
    textDecoration: "none",
    background: "#f1f5f9",
    color: theme.text,
    fontSize: 14,
    fontWeight: 600,
    border: `1px solid ${theme.border}`,
  },
  footer: {
    fontSize: 12,
    lineHeight: "18px",
    color: theme.muted,
    textAlign: "center" as const,
    margin: 0,
  },
  link: { color: "#111", textDecoration: "underline" },
};
