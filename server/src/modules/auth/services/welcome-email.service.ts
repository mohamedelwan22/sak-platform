import type { EmailProvider } from "../../../services/email/email-provider.interface.js";
import { WelcomeEmailRepository } from "../repositories/welcome-email.repository.js";
import { createChildLogger } from "../../../lib/logger.js";

const log = createChildLogger("WelcomeEmailService");

export class WelcomeEmailService {
  constructor(
    private readonly repository: WelcomeEmailRepository,
    private readonly emailProvider: EmailProvider,
    private readonly appUrl: string,
  ) {}

  async enqueueAndDeliver(userId: string): Promise<void> {
    try {
      await this.repository.enqueue(userId);
      const delivery = await this.repository.claim(userId);
      if (!delivery) return;

      try {
        const providerId = await this.emailProvider.sendWelcomeEmail({
          to: delivery.user.email,
          firstName: delivery.user.firstName,
          accountNumber: delivery.user.accountNumber,
          appUrl: this.appUrl,
        });
        await this.repository.markSent(delivery.id, providerId);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Welcome email delivery failed";
        await this.repository.markFailed(delivery.id, message);
        log.error("Welcome email delivery failed", { userId, message });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Welcome email scheduling failed";
      log.error("Welcome email scheduling failed", { userId, message });
    }
  }
}
