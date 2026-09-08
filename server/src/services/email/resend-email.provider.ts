import { Resend } from "resend";
import type {
  EmailProvider,
  PasswordResetEmailData,
  VerificationEmailData,
} from "./email-provider.interface.js";
import { createChildLogger } from "../../lib/logger.js";

const log = createChildLogger("ResendEmailProvider");

export class ResendEmailProvider implements EmailProvider {
  private readonly resend: Resend;
  private readonly from: string;

  constructor(apiKey: string, from: string) {
    this.resend = new Resend(apiKey);
    this.from = from;
  }

  async sendPasswordReset(data: PasswordResetEmailData): Promise<void> {
    const { to, firstName, resetUrl, expiresAt } = data;

    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject: "استعادة كلمة المرور — SAK100",
      html: this.passwordResetHtml(firstName, resetUrl, expiresAt),
    });

    if (error) {
      log.error("Failed to send password reset email", { to, error });
      return;
    }

    log.info("Password reset email sent via Resend", { to });
  }

  async sendVerificationEmail(data: VerificationEmailData): Promise<void> {
    const { to, firstName, code, expiresAt } = data;

    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject: "رمز تأكيد البريد الإلكتروني — SAK100",
      html: this.verificationHtml(firstName, code, expiresAt),
    });

    if (error) {
      log.error("Failed to send verification email", { to, error });
      return;
    }

    log.info("Verification email sent via Resend", { to });
  }

  private verificationHtml(firstName: string, code: string, expiresAt: Date): string {
    return `
      <div dir="rtl" style="direction:rtl;font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:#0A0E1A;color:#E7E5E4;padding:32px;border-radius:12px;max-width:560px;margin:0 auto;">
        <div style="text-align:center;font-size:22px;font-weight:bold;color:#C9A84C;margin-bottom:24px;">SAK100</div>
        <h1 style="font-size:20px;margin:0 0 8px;">مرحباً ${firstName},</h1>
        <p style="font-size:15px;line-height:1.8;margin:0 0 24px;">
          شكراً لانضمامك إلى منصة SAK100. رمز تأكيد البريد الإلكتروني الخاص بك هو:
        </p>
        <div style="text-align:center;background:#C9A84C;color:#0A0E1A;font-size:28px;font-weight:bold;letter-spacing:8px;padding:16px;border-radius:8px;margin-bottom:24px;direction:ltr;">
          ${code}
        </div>
        <p style="font-size:13px;line-height:1.8;color:#A8A29E;margin:0;">
          الرمز صالح لمدة 15 دقيقة وسيتم إبطاله بعد المحاولة الخامسة الخاطئة.
          لا تشارك هذا الرمز مع أي شخص. إذا لم تقم بالتسجيل في SAK100، يمكنك تجاهل هذا البريد.
        </p>
        <p style="font-size:12px;color:#57534E;margin:24px 0 0;text-align:center;">
          ينتهي صلوح هذا الرمز في ${expiresAt.toISOString()}
        </p>
      </div>
    `;
  }

  private passwordResetHtml(firstName: string, resetUrl: string, expiresAt: Date): string {
    return `
      <div dir="rtl" style="direction:rtl;font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:#0A0E1A;color:#E7E5E4;padding:32px;border-radius:12px;max-width:560px;margin:0 auto;">
        <div style="text-align:center;font-size:22px;font-weight:bold;color:#C9A84C;margin-bottom:24px;">SAK100</div>
        <h1 style="font-size:20px;margin:0 0 8px;">مرحباً ${firstName},</h1>
        <p style="font-size:15px;line-height:1.8;margin:0 0 24px;">
          استلمنا طلباً لاستعادة كلمة المرور الخاصة بحسابك في SAK100.
        </p>
        <div style="text-align:center;margin-bottom:24px;">
          <a href="${resetUrl}" style="background:#C9A84C;color:#0A0E1A;font-size:16px;font-weight:bold;text-decoration:none;padding:14px 28px;border-radius:8px;">
            إعادة تعيين كلمة المرور
          </a>
        </div>
        <p style="font-size:13px;line-height:1.8;color:#A8A29E;margin:0;">
          الرابط صالح لمدة 15 دقيقة. إذا لم تطلب استعادة كلمة المرور، يمكنك تجاهل هذا البريد.
        </p>
        <p style="font-size:12px;color:#57534E;margin:24px 0 0;text-align:center;">
          ينتهي صلاحية هذا الرابط في ${expiresAt.toISOString()}
        </p>
      </div>
    `;
  }
}
