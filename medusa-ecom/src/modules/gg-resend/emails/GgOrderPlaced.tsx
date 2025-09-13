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
  Link,
} from "@react-email/components";

export type GgOrderPlacedProps = {
  order_id: string;
  status_url: string;
  shop_name?: string;
};

export default function GgOrderPlacedEmail({
  order_id,
  status_url,
  shop_name = "Your shop",
}: GgOrderPlacedProps) {
  return (
    <Html>
      <Head />
      <Preview>Order #{order_id} confirmed — view status</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.h1}>{shop_name}</Heading>
          <Section>
            <Heading as="h2" style={styles.h2}>
              Order #{order_id} confirmed
            </Heading>
            <Text style={styles.p}>
              Thanks for your purchase! We received your order{" "}
              <b>#{order_id}</b>. You can check its status anytime using the
              button below.
            </Text>
            <Button href={status_url} style={styles.btn}>
              View order status
            </Button>
          </Section>
          <Hr style={styles.hr} />
          <Text style={styles.footer}>
            If the button doesn’t work, paste this link into your browser:{" "}
            <Link href={status_url} style={styles.link}>
              {status_url}
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles: Record<string, React.CSSProperties> = {
  body: {
    background: "#f6f7f9",
    margin: 0,
    padding: "24px 0",
    fontFamily: "ui-sans-serif, system-ui, -apple-system",
  },
  container: {
    background: "#ffffff",
    borderRadius: 12,
    padding: 24,
    maxWidth: 560,
    margin: "0 auto",
    boxShadow: "0 6px 24px rgba(0,0,0,.06)",
  },
  h1: { fontSize: 18, margin: 0, opacity: 0.7, letterSpacing: 0.4 },
  h2: { fontSize: 20, margin: "12px 0 8px" },
  p: { fontSize: 14, lineHeight: "20px", color: "#222", margin: "8px 0" },
  btn: {
    display: "inline-block",
    padding: "10px 16px",
    borderRadius: 8,
    textDecoration: "none",
    background: "#111",
    color: "#fff",
    fontSize: 14,
  },
  hr: { borderColor: "#eee", margin: "20px 0" },
  footer: { fontSize: 12, color: "#666" },
  link: { color: "#111" },
};
