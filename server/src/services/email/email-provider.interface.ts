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

export interface EmailProvider {
  sendPasswordReset(data: PasswordResetEmailData): Promise<void>;
  sendVerificationEmail(data: VerificationEmailData): Promise<void>;
}
