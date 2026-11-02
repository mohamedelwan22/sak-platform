export interface WelcomeEmailTemplateData {
  firstName: string;
  email: string;
  accountNumber: string;
  appUrl: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function getName(firstName: string): string {
  return firstName.trim() || "there";
}

export function welcomeEmailHtml(data: WelcomeEmailTemplateData): string {
  const firstName = escapeHtml(getName(data.firstName));
  const email = escapeHtml(data.email);
  const accountNumber = escapeHtml(data.accountNumber);
  const appUrl = escapeHtml(data.appUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Welcome to SAK100</title></head>
<body style="margin:0;padding:0;background-color:#0A0E1A;font-family:Arial,'Segoe UI',sans-serif;color:#E7E5E4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0E1A;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#111827;border:1px solid #C9A84C55;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:32px;text-align:center;background-color:#C9A84C;">
          <div style="color:#0A0E1A;font-size:24px;font-weight:700;">SAK100</div>
        </td></tr>
        <tr><td style="padding:36px 28px;">
          <h1 style="margin:0 0 16px;color:#F5F5F4;font-size:24px;line-height:1.3;">Welcome, ${firstName}</h1>
          <p style="margin:0 0 24px;color:#D6D3D1;font-size:16px;line-height:1.7;">Your SAK100 account is active. You can now sign in and continue setting up your account.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:#0A0E1A;border:1px solid #C9A84C44;border-radius:10px;">
            <tr><td style="padding:16px;color:#A8A29E;font-size:14px;">Registered email</td><td style="padding:16px;text-align:right;color:#F5F5F4;font-size:14px;">${email}</td></tr>
            <tr><td style="padding:16px;border-top:1px solid #FFFFFF18;color:#A8A29E;font-size:14px;">Account number</td><td style="padding:16px;border-top:1px solid #FFFFFF18;text-align:right;color:#C9A84C;font-size:14px;font-weight:700;">${accountNumber}</td></tr>
          </table>
          <p style="margin:0 0 28px;color:#A8A29E;font-size:13px;line-height:1.7;">Account activation does not indicate KYC, investment, or financial approval. Any additional eligibility requirements remain subject to SAK100 review.</p>
          <p style="margin:0;text-align:center;"><a href="${appUrl}" style="display:inline-block;background-color:#C9A84C;color:#0A0E1A;text-decoration:none;border-radius:8px;padding:14px 28px;font-size:16px;font-weight:700;">Open SAK100</a></p>
        </td></tr>
        <tr><td style="padding:20px 28px;border-top:1px solid #C9A84C33;text-align:center;color:#78716C;font-size:12px;">SAK100 Platform</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function welcomeEmailText(data: WelcomeEmailTemplateData): string {
  const firstName = getName(data.firstName);
  return [
    `Welcome, ${firstName}`,
    "",
    "Your SAK100 account is active. You can now sign in and continue setting up your account.",
    "",
    `Registered email: ${data.email}`,
    `Account number: ${data.accountNumber}`,
    "",
    "Account activation does not indicate KYC, investment, or financial approval. Any additional eligibility requirements remain subject to SAK100 review.",
    "",
    `Open SAK100: ${data.appUrl}`,
  ].join("\n");
}
