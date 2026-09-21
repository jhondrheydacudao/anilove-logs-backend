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
    return sendEmail(email, "Confirm your Anilove email", `<p>Confirm your Anilove account:</p><p><a href="${url}">Verify email address</a></p>`);
}
export function sendPasswordResetEmail(email, token) {
    const url = `${config.appPublicUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;
    return sendEmail(email, "Reset your Anilove password", `<p>Reset your Anilove password:</p><p><a href="${url}">Choose a new password</a></p>`);
}
