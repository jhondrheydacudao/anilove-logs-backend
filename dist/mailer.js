import nodemailer from "nodemailer";
import { config } from "./config.js";
const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: { user: config.smtpUser, pass: config.smtpPassword },
});
async function sendEmail(to, subject, htmlContent) {
    await transporter.sendMail({
        from: `"${config.emailFromName}" <${config.emailFromAddress}>`,
        to,
        subject,
        html: htmlContent,
    });
}
export function sendVerificationEmail(email, token) {
    const url = `${config.appPublicUrl}/auth/verify-email?token=${encodeURIComponent(token)}`;
    return sendEmail(email, "Confirm your Anilove email", `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;background:#0b0b0f;color:#fff;border-radius:18px">
      <h1 style="margin:0 0 8px;font-size:28px">Welcome to Anilove</h1>
      <p style="margin:0 0 24px;color:#a1a1aa">A quiet place for anime.</p>

      <h2 style="margin:0 0 12px">Confirm your email</h2>
      <p style="color:#d4d4d8;line-height:1.6">
        Thanks for joining Anilove. Confirm your email address to finish creating your account.
      </p>

      <p style="margin:28px 0">
        <a href="${url}" style="display:inline-block;padding:13px 22px;background:#8b5cf6;color:#fff;text-decoration:none;border-radius:10px;font-weight:bold">
          Confirm email
        </a>
      </p>

      <p style="font-size:12px;color:#71717a;line-height:1.5">
        If you didn't create an Anilove account, you can safely ignore this email.
      </p>
    </div>
  `);
}
export function sendPasswordResetEmail(email, token) {
    const url = `${config.appPublicUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;
    return sendEmail(email, "Reset your Anilove password", `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;background:#0b0b0f;color:#fff;border-radius:18px">
      <h1 style="margin:0 0 8px;font-size:28px">Anilove</h1>
      <p style="margin:0 0 24px;color:#a1a1aa">A quiet place for anime.</p>

      <h2 style="margin:0 0 12px">Reset your password</h2>
      <p style="color:#d4d4d8;line-height:1.6">
        We received a request to reset your Anilove password. Click the button below to choose a new password.
      </p>

      <p style="margin:28px 0">
        <a href="${url}" style="display:inline-block;padding:13px 22px;background:#8b5cf6;color:#fff;text-decoration:none;border-radius:10px;font-weight:bold">
          Reset password
        </a>
      </p>

      <p style="font-size:12px;color:#71717a;line-height:1.5">
        If you didn't request a password reset, you can safely ignore this email.
      </p>
    </div>
  `);
}
