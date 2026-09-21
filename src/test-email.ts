import { sendVerificationEmail } from "./mailer.js";

const recipient = process.env.TEST_EMAIL?.trim().toLowerCase();
if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
  throw new Error("Set TEST_EMAIL to a valid recipient address.");
}

const token = `email-test-${Date.now()}`;
await sendVerificationEmail(recipient, token);
console.log(`Test verification email sent to ${recipient}.`);
