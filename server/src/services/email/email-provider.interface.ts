export interface PasswordResetEmailData {
  to: string;
  firstName: string;
  resetUrl: string;
  expiresAt: Date;
}

export interface VerificationEmailData {
  to: string;
  firstName: string;
  code: string;
  expiresAt: Date;
}

export interface WelcomeEmailData {
  to: string;
  firstName: string;
  accountNumber: string;
  appUrl: string;
}

export interface EmailProvider {
  sendPasswordReset(data: PasswordResetEmailData): Promise<void>;
  sendVerificationEmail(data: VerificationEmailData): Promise<void>;
  sendWelcomeEmail(data: WelcomeEmailData): Promise<string | undefined>;
}
