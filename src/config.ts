import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3100),
  databaseUrl: required("DATABASE_URL"),
  databaseSslCa: process.env.DATABASE_SSL_CA?.replace(/\\n/g, "\n").trim()
    || (existsSync(path.resolve(process.cwd(), "root.crt"))
      ? readFileSync(path.resolve(process.cwd(), "root.crt"), "utf8").trim()
      : ""),
  jwtSecret: required("JWT_SECRET"),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? "15m",
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
  smtpHost: process.env.SMTP_HOST ?? "smtp-relay.brevo.com",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: required("SMTP_USER"),
  smtpPassword: required("SMTP_PASSWORD"),
  emailFromName: process.env.EMAIL_FROM_NAME ?? "Anilove",
  emailFromAddress: required("EMAIL_FROM_ADDRESS"),
  appPublicUrl: required("APP_PUBLIC_URL").replace(/\/$/, ""),
};
