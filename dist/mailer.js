import { config } from "./config.js";
async function sendEmail(to, subject, htmlContent) {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
            accept: "application/json",
            "api-key": config.brevoApiKey,
            "content-type": "application/json",
        },
        body: JSON.stringify({
            sender: { name: config.emailFromName, email: config.emailFromAddress },
            to: [{ email: to }],
            subject,
            htmlContent,
        }),
    });
    if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Brevo email failed (${response.status}): ${detail.slice(0, 300)}`);
    }
}
export function sendVerificationEmail(email, token) {
    const url = `${config.appPublicUrl}/auth/verify-email?token=${encodeURIComponent(token)}`;
    return sendEmail(email, "Confirm your Anilove email", `<p>Confirm your Anilove account:</p><p><a href="${url}">Verify email address</a></p>`);
}
export function sendPasswordResetEmail(email, token) {
    const url = `${config.appPublicUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;
    return sendEmail(email, "Reset your Anilove password", `<p>Reset your Anilove password:</p><p><a href="${url}">Choose a new password</a></p>`);
}
