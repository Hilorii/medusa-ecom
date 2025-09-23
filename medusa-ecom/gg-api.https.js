// HTTPS reverse proxy for Medusa API (gg)
// Terminates TLS using mkcert certs and forwards to Medusa on http://127.0.0.1:9000

const https = require("https");
const { createProxyMiddleware } = require("http-proxy-middleware");
const express = require("express");
const fs = require("fs");
const path = require("path");

const gg = express();

// Comments in English
const GG_KEY = fs.readFileSync(path.join(__dirname, "localhost+2-key.pem")); // adjust to your filenames
const GG_CERT = fs.readFileSync(path.join(__dirname, "localhost+2.pem"));

// Medusa dev target (plain HTTP)
const GG_MEDUSA_TARGET = "http://127.0.0.1:9000";

// Proxy all API paths you expose (expand if needed)
gg.use(
  ["/store", "/admin", "/auth", "/uploads", "/payment", "/hooks"],
  createProxyMiddleware({
    target: GG_MEDUSA_TARGET,
    changeOrigin: true,
    ws: true,
    secure: false, // dev only
    logLevel: "warn",
  }),
);

// Optional: a simple health check
gg.get("/__health", (_, res) => res.status(200).send("ok"));

const GG_PORT = 9443; // HTTPS port for API
https.createServer({ key: GG_KEY, cert: GG_CERT }, gg).listen(GG_PORT, () => {
  console.log(`✅ Medusa API over HTTPS at https://localhost:${GG_PORT}`);
  console.log(`➡️  Proxy → ${GG_MEDUSA_TARGET}`);
});
