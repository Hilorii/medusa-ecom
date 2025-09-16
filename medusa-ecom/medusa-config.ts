import { loadEnv, defineConfig } from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  modules: [
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "./src/modules/gg-resend",
            id: "gg-resend",
            options: {
              channels: ["email"],
              api_key: process.env.RESEND_API_KEY,
              from: process.env.RESEND_FROM_EMAIL,
            },
          },
        ],
      },
    },
    // gg: Stripe payments (v2 module)
    {
      resolve: "@medusajs/payment",
      options: {
        providers: [
          {
            resolve: "@medusajs/payment-stripe",
            id: "stripe",
            options: {
              apiKey: process.env.STRIPE_API_KEY,
              // webhookSecret: process.env.STRIPE_WEBHOOK_SECRET, // optional now
              capture: true,
              automaticPaymentMethods: true,
              automatic_payment_methods: true,
            },
          },
          {
            resolve: "./src/modules/stripe-extended",
            id: "stripe",
            options: {
              apiKey: process.env.STRIPE_API_KEY,
              capture: true,
              automaticPaymentMethods: true,
              automatic_payment_methods: true,
            },
          },
          // you can add next providers here Stripe (P24/iDEAL/Bancontact)
        ],
      },
    },

    // Training module can remove it safely
    { resolve: "./src/modules/brand" },
  ],
});
