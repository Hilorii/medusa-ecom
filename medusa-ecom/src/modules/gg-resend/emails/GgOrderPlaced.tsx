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

export type GgOrderPlacedProps = {
  order_id: string;
  shop_name?: string;
  shop_url?: string; // optional: homepage or storefront URL
  support_email?: string; // optional: "support@yourshop.com"
  logo_url?: string; // optional: hosted logo (PNG/SVG)
  customer_name?: string; // optional: "John"
  status_url?: string; // optional: order status page URL
};

export default function GgOrderPlacedEmail({
  order_id,
  shop_name = "Your shop",
  shop_url,
  support_email,
  logo_url,
  customer_name,
  status_url,
}: GgOrderPlacedProps) {
  const greeting =
    customer_name && customer_name.trim().length
      ? `Thanks, ${customer_name}!`
      : "Thanks for your purchase!";

  return (
    <Html>
      <Head />
      <Preview>{`Order #${order_id} confirmed — we'll email you updates`}</Preview>
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
              Order confirmed
            </Heading>
            <Text style={styles.lead}>
              {greeting} We received your order <b>#{order_id}</b>. We’ll let
              you know as soon as it ships.
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

          {/* Optional actions */}
          <Section style={styles.actions}>
            {status_url ? (
              <Button href={status_url} style={styles.primaryBtn}>
                View order status
              </Button>
            ) : null}
            {support_email ? (
              <Button href={`mailto:${support_email}`} style={styles.ghostBtn}>
                Need help? Contact support
              </Button>
            ) : null}
          </Section>

          {/* Footer text */}
          <Text style={styles.footer}>
            Keep this email for your records.
            {support_email ? (
              <>
                {" "}
                Questions?{" "}
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
  ring: "rgba(124,58,237,.18)",
  accent: "#111111",
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
    background: "#f8fafc",
    border: `1px solid ${theme.border}`,
  },
  badgeLabel: {
    fontSize: 12,
    color: theme.muted,
    letterSpacing: 0.4,
    textTransform: "uppercase" as const,
  },
  badgeValue: { fontSize: 14, fontWeight: 800, color: theme.text },
  actions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap" as const,
    justifyContent: "center" as const,
    marginTop: 4,
    marginBottom: 4,
  },
  primaryBtn: {
    display: "inline-block",
    padding: "12px 18px",
    borderRadius: 12,
    textDecoration: "none",
    background: theme.accent,
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
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
  link: { color: theme.accent, textDecoration: "underline" },
};
