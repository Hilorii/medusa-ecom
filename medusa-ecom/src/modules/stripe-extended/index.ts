import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import { StripeProviderService } from "@medusajs/payment-stripe/dist/services";

class StripeApplePayProviderService extends StripeProviderService {
  static identifier = "stripe-apple-pay";
}

class StripeGooglePayProviderService extends StripeProviderService {
  static identifier = "stripe-google-pay";
}

class StripePayPalProviderService extends StripeProviderService {
  static identifier = "stripe-paypal";

  public get paymentIntentOptions() {
    return {
      payment_method_types: ["paypal"],
    };
  }
}

export default ModuleProvider(Modules.PAYMENT, {
  services: [
    StripeApplePayProviderService,
    StripeGooglePayProviderService,
    StripePayPalProviderService,
  ],
});
