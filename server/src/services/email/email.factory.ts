import { getEnv } from "../../config/env.js";
import { createChildLogger } from "../../lib/logger.js";
import type { EmailProvider } from "./email-provider.interface.js";
import { ConsoleEmailProvider } from "./console-email.provider.js";
import { ResendEmailProvider } from "./resend-email.provider.js";

const log = createChildLogger("EmailProvider");

let provider: EmailProvider | undefined;

export function getEmailProvider(): EmailProvider {
  if (provider) return provider;

  const env = getEnv();

  if (env.RESEND_API_KEY) {
    provider = new ResendEmailProvider(env.RESEND_API_KEY, env.RESEND_FROM_EMAIL);
    log.info("Using Resend email provider");
  } else {
    provider = new ConsoleEmailProvider();
    log.info("Using Console email provider (no RESEND_API_KEY set)");
  }

  return provider;
}
