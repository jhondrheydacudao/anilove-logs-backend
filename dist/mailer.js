import { config } from "./config.js";
function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    })[character] ?? character);
}
function emailLayout(content) {
    return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#050507;color:#fff;font-family:Arial,Helvetica,sans-serif">
    <div style="padding:32px 16px">
      <div style="max-width:560px;margin:0 auto">
        <div style="padding:18px 24px;border:1px solid #27272a;border-radius:16px 16px 0 0;background:#111116">
          <span style="font-size:18px;font-weight:700;letter-spacing:.08em;color:#fff">ANILOVE</span>
          <span style="float:right;padding:5px 9px;border:1px solid #3f3f46;border-radius:999px;color:#a1a1aa;font-size:10px;letter-spacing:.12em">ACCOUNT</span>
        </div>
        <div style="padding:40px 32px;background:#0b0b0f;border:1px solid #27272a;border-top:0;border-radius:0 0 16px 16px">
          ${content}
          <div style="margin-top:36px;padding-top:20px;border-top:1px solid #27272a;color:#71717a;font-size:12px;line-height:1.6">
            <p style="margin:0">A quiet place for anime.</p>
            <p style="margin:6px 0 0">This message was sent by Anilove. Please do not reply to this automated email.</p>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;
}
function actionLink(url, label) {
    return `<a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 22px;background:#8b5cf6;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px">${label}</a>`;
}
async function sendEmail(to, subject, htmlContent) {
    try {
        const response = await fetch(config.emailRelayUrl, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-email-relay-secret": config.emailRelaySecret,
            },
            body: JSON.stringify({
                to,
                subject,
                html: htmlContent,
            }),
            signal: AbortSignal.timeout(20000),
        });
        if (!response.ok) {
            const detail = await response.text();
            throw new Error(`Email relay returned ${response.status}: ${detail.slice(0, 300)}`);
        }
    }
    catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Email relay failed: ${detail}`);
    }
}
export function sendVerificationEmail(email, token) {
    const url = `${config.emailActionBaseUrl}/auth/verify-email?token=${encodeURIComponent(token)}`;
    const safeUrl = escapeHtml(url);
    return sendEmail(email, "Confirm your Anilove email", emailLayout(`
    <div style="margin-bottom:22px;color:#a78bfa;font-size:12px;font-weight:700;letter-spacing:.16em">WELCOME TO ANILOVE</div>
    <h1 style="margin:0 0 14px;color:#fff;font-size:30px;line-height:1.15">Confirm your email</h1>
    <p style="margin:0;color:#d4d4d8;font-size:16px;line-height:1.7">
      Thanks for joining Anilove. Confirm your email address to finish creating your account and start building your anime space.
    </p>
    <div style="margin:30px 0">${actionLink(url, "Confirm email")}</div>
    <p style="margin:0;color:#71717a;font-size:12px;line-height:1.6">
      The button will open this link:<br>
      <a href="${safeUrl}" style="color:#a78bfa;word-break:break-all">${safeUrl}</a>
    </p>
    <div style="margin-top:24px;padding:14px 16px;background:#17131f;border:1px solid #3b2a58;border-radius:10px;color:#c4b5fd;font-size:12px;line-height:1.5">
      This verification link expires in 24 hours.
    </div>
    <p style="margin:24px 0 0;color:#71717a;font-size:12px;line-height:1.5">
      If you didn't create an Anilove account, you can safely ignore this email.
    </p>
  `));
}
export function sendPasswordResetEmail(email, token) {
    const url = `${config.emailActionBaseUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;
    const safeUrl = escapeHtml(url);
    return sendEmail(email, "Reset your Anilove password", emailLayout(`
    <div style="margin-bottom:22px;color:#a78bfa;font-size:12px;font-weight:700;letter-spacing:.16em">ANILOVE ACCOUNT</div>
    <h1 style="margin:0 0 14px;color:#fff;font-size:30px;line-height:1.15">Reset your password</h1>
    <p style="margin:0;color:#d4d4d8;font-size:16px;line-height:1.7">
      We received a request to reset your Anilove password. Use the button below to choose a new password.
    </p>
    <div style="margin:30px 0">${actionLink(url, "Reset password")}</div>
    <p style="margin:0;color:#71717a;font-size:12px;line-height:1.6">
      The button will open this link:<br>
      <a href="${safeUrl}" style="color:#a78bfa;word-break:break-all">${safeUrl}</a>
    </p>
    <div style="margin-top:24px;padding:14px 16px;background:#17131f;border:1px solid #3b2a58;border-radius:10px;color:#c4b5fd;font-size:12px;line-height:1.5">
      This password-reset link expires in 1 hour.
    </div>
    <p style="margin:24px 0 0;color:#71717a;font-size:12px;line-height:1.5">
      If you didn't request a password reset, you can safely ignore this email. Your password will not change.
    </p>
  `));
}
