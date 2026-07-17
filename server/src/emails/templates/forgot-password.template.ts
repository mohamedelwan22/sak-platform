export interface ForgotPasswordTemplateData {
  firstName: string;
  resetUrl: string;
  expiresAt: Date;
}

export function forgotPasswordHtml(data: ForgotPasswordTemplateData): string {
  const { firstName, resetUrl, expiresAt } = data;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Request</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0E1A;font-family:'Noto Sans Arabic',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0E1A;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#111827;border-radius:16px;border:1px solid #C9A84C33;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#C9A84C,#B8962E);padding:32px;text-align:center;">
              <h1 style="color:#0A0E1A;margin:0;font-size:24px;font-weight:700;">SAK100</h1>
              <p style="color:#0A0E1ACC;margin:8px 0 0;font-size:14px;">Password Reset Request</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 32px;">
              <p style="color:#E5E7EB;font-size:16px;margin:0 0 16px;">Hi ${firstName},</p>
              <p style="color:#9CA3AF;font-size:14px;line-height:1.6;margin:0 0 24px;">
                You requested a password reset for your SAK100 account. Click the button below to reset your password.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:0 0 24px;">
                    <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#C9A84C,#B8962E);color:#0A0E1A;text-decoration:none;padding:14px 40px;border-radius:12px;font-weight:700;font-size:16px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#6B7280;font-size:12px;line-height:1.5;margin:0 0 8px;">
                This link expires in 15 minutes.
              </p>
              <p style="color:#6B7280;font-size:12px;line-height:1.5;margin:0;">
                If you did not request this, ignore this email. Your password will remain unchanged.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#0F1520;padding:24px 32px;border-top:1px solid #C9A84C22;">
              <p style="color:#6B7280;font-size:11px;margin:0;text-align:center;">
                &copy; ${expiresAt.getFullYear()} SAK100 Platform. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function forgotPasswordText(data: ForgotPasswordTemplateData): string {
  const { firstName, resetUrl, expiresAt } = data;

  return [
    `Hi ${firstName},`,
    "",
    "You requested a password reset for your SAK100 account.",
    "",
    `Reset URL: ${resetUrl}`,
    `Expires: ${expiresAt.toISOString()}`,
    "",
    "If you did not request this, ignore this email. Your password will remain unchanged.",
    "",
    `© ${expiresAt.getFullYear()} SAK100 Platform. All rights reserved.`,
  ].join("\n");
}
