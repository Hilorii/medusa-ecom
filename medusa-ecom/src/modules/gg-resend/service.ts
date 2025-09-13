// Comments in English
import { AbstractNotificationProviderService } from "@medusajs/framework/utils";
import type { Logger, NotificationTypes } from "@medusajs/framework/types";
import { Resend } from "resend";
import { ggRenderEmail } from "./render";

type GgResendOptions = {
  api_key: string;
  from: string;
};

/**
 * Resend-based Notification Provider for Medusa v2.
 * - Channel: "email"
 * - Renders subjects + HTML via ggRenderEmail(template, data)
 */
class GgResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "notification-gg-resend";

  protected logger_: Logger;
  protected options_: GgResendOptions;
  protected client_: Resend;

  constructor({ logger }: { logger: Logger }, options: GgResendOptions) {
    super();
    this.logger_ = logger;
    this.options_ = options;
    this.client_ = this.initClient_(options.api_key);
  }

  /** Handles different Resend constructor signatures across versions */
  protected initClient_(apiKey: string): Resend {
    try {
      // ctor(apiKey: string)
      return new (Resend as any)(apiKey);
    } catch {
      // ctor({ apiKey })
      return new (Resend as any)({ apiKey });
    }
  }

  async send({
    to,
    channel,
    template,
    data,
  }: NotificationTypes.ProviderSendNotificationDTO): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
    if (channel !== "email") {
      throw new Error("Resend provider supports only the 'email' channel");
    }

    // Render subject + html via React Email components
    const { subject, html } = await ggRenderEmail(
      template,
      (data as Record<string, unknown>) || {},
    );

    try {
      const { data: resData, error } = await this.client_.emails.send({
        from: this.options_.from,
        to: to as string | string[],
        subject,
        html,
      });

      if (error) {
        const msg =
          typeof error === "string"
            ? error
            : ((error as any)?.message ?? "Unknown error");
        this.logger_.error(
          `[gg-resend] send failed for ${Array.isArray(to) ? to.join(",") : to}: ${msg}`,
        );
        throw typeof error === "string" ? new Error(error) : error;
      }

      return { id: resData?.id };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger_.error(
        `[gg-resend] send exception for ${Array.isArray(to) ? to.join(",") : to}: ${message}`,
      );
      throw e;
    }
  }
}

export default GgResendNotificationProviderService;
