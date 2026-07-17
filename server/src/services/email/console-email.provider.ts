import type { EmailProvider, PasswordResetEmailData } from "./email-provider.interface.js";
import { createChildLogger } from "../../lib/logger.js";
import { isDevelopment } from "../../config/env.js";

const log = createChildLogger("ConsoleEmailProvider");

export class ConsoleEmailProvider implements EmailProvider {
  async sendPasswordReset(data: PasswordResetEmailData): Promise<void> {
    const { to, firstName, resetUrl, expiresAt } = data;

    if (isDevelopment()) {
      console.log("");
      console.log("================================================");
      console.log("PASSWORD RESET EMAIL");
      console.log("================================================");
      console.log("");
      console.log(`To: ${to}`);
      console.log(`Hi ${firstName},`);
      console.log("");
      console.log("You requested a password reset for your SAK100 account.");
      console.log("");
      console.log("Reset URL:");
      console.log(resetUrl);
      console.log("");
      console.log(`Expires: ${expiresAt.toISOString()}`);
      console.log("");
      console.log("If you did not request this, ignore this email.");
      console.log("================================================");
      console.log("");
    }

    log.info("Password reset email sent", { to, resetUrl, expiresAt: expiresAt.toISOString() });
  }
}
