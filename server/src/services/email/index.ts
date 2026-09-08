export type {
  EmailProvider,
  PasswordResetEmailData,
  VerificationEmailData,
} from "./email-provider.interface.js";
export { ConsoleEmailProvider } from "./console-email.provider.js";
export { ResendEmailProvider } from "./resend-email.provider.js";
export { getEmailProvider } from "./email.factory.js";
