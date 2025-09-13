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

export type GgShipmentCreatedProps = {
  order_id: string;
  tracking_number: string;
  tracking_url: string;
  shop_name?: string;
};

export default function GgShipmentCreatedEmail({
  order_id,
  tracking_number,
  tracking_url,
  shop_name = "Your shop",
}: GgShipmentCreatedProps) {
  return (
    <Html>
      <Head />
      <Preview>Your order #{order_id} is on the way</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.h1}>{shop_name}</Heading>
          <Section>
            <Heading as="h2" style={styles.h2}>
              Your order is on the way
            </Heading>
            <Text style={styles.p}>
              Order <b>#{order_id}</b> has been shipped.
            </Text>
            <Text style={styles.p}>
              Tracking:{" "}
              <Link href={tracking_url} style={styles.link}>
                {tracking_number}
              </Link>
            </Text>
            <Button href={tracking_url} style={styles.btn}>
              Track shipment
            </Button>
          </Section>
          <Hr style={styles.hr} />
          <Text style={styles.footer}>
            If the button doesn’t work, paste this link into your browser:{" "}
            <Link href={tracking_url} style={styles.link}>
              {tracking_url}
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
