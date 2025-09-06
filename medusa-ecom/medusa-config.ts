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
          // tutaj możesz dodać kolejne providery Stripe (P24/iDEAL/Bancontact)
        ],
      },
    },

    // gg: Twój moduł
    { resolve: "./src/modules/brand" },
  ],
});
