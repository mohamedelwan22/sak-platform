export interface PasswordResetEmailData {
  to: string;
  firstName: string;
  resetUrl: string;
  expiresAt: Date;
}

export interface EmailProvider {
  sendPasswordReset(data: PasswordResetEmailData): Promise<void>;
}
