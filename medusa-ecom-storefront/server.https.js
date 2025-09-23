// Simple HTTPS reverse proxy for local dev (gg)
// - Serves one HTTPS origin for both Next.js (frontend) and Medusa (backend)
// - Avoids mixed content and CORS by proxying API paths to Medusa
// - Uses mkcert-generated certs placed in the project root

const https = require("https")
const { createProxyMiddleware } = require("http-proxy-middleware")
const express = require("express")
const fs = require("fs")
const path = require("path")

const ggApp = express()

// === Paths to mkcert files (generated earlier) ===
const GG_KEY_PATH = path.join(__dirname, "192.168.1.109-key.pem")
const GG_CERT_PATH = path.join(__dirname, "192.168.1.109.pem")

// === Target services (adjust ports if needed) ===
const GG_NEXT_TARGET = "http://127.0.0.1:8000" // Next.js dev server
const GG_API_TARGET = "http://localhost:9000/" // Medusa backend

// Optional: trust proxy headers when sitting behind other proxies in future
ggApp.set("trust proxy", true)

// Optional: small hardening + convenience headers for dev
ggApp.use((req, res, next) => {
  // Allow cookies and auth headers to pass through same-origin requests
  res.setHeader("X-Content-Type-Options", "nosniff")
  res.setHeader("Referrer-Policy", "same-origin")
  next()
})

// --- Proxy Medusa API first (same-origin) ---
// List here all API base paths your Medusa exposes.
// Keeping it explicit helps avoid accidental catches.
const ggApiPaths = [
  "/store",
  "/admin",
  "/auth",
  "/uploads",
  "/static",
  "/payment",
  "/hooks",
]

ggApp.use(
  ggApiPaths,
  createProxyMiddleware({
    target: GG_API_TARGET,
    changeOrigin: true,
    ws: true, // proxy websockets if your API needs them
    secure: false, // dev only; backend is HTTP in local dev
    logLevel: "warn",
    // Preserve original host if your backend uses it for anything:
    // onProxyReq: (proxyReq, req) => proxyReq.setHeader("Host", req.headers.host),
  })
)

// --- Then proxy everything else to Next dev server ---
ggApp.use(
  "/",
  createProxyMiddleware({
    target: GG_NEXT_TARGET,
    changeOrigin: true,
    ws: true, // keep React Fast Refresh / dev overlay working
    logLevel: "warn",
  })
)

// Read certs (fail fast with clear error if missing)
const ggHttpsOptions = {
  key: fs.readFileSync(GG_KEY_PATH),
  cert: fs.readFileSync(GG_CERT_PATH),
}

// Use 8443 so you don't need admin rights on Windows; switch to 443 if you run as admin
const GG_PORT = process.env.GG_HTTPS_PORT
  ? Number(process.env.GG_HTTPS_PORT)
  : 8443

// Start HTTPS server
https.createServer(ggHttpsOptions, ggApp).listen(GG_PORT, () => {
  console.log(`✅ HTTPS ready at https://192.168.1.109:${GG_PORT}`)
  console.log(`➡️  API paths ${ggApiPaths.join(", ")} → ${GG_API_TARGET}`)
  console.log(`➡️  All other paths → ${GG_NEXT_TARGET}`)
  console.log(
    "ℹ️  Make sure Next.js runs on http://127.0.0.1:8000 and Medusa on http://127.0.0.1:9000"
  )
})

// Basic error handler to avoid silent crashes during dev
process.on("unhandledRejection", (err) => {
  console.error("[gg] UnhandledRejection:", err)
})
process.on("uncaughtException", (err) => {
  console.error("[gg] UncaughtException:", err)
})
