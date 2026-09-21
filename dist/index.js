import express from "express";
import { config } from "./config.js";
import { sql } from "./db.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "./mailer.js";
import { accessToken, hashPassword, opaqueToken, readAccessToken, tokenHash, verifyPassword } from "./security.js";
export const app = express();
app.use(express.json({ limit: "32kb" }));
function emailOf(value) {
    const email = typeof value === "string" ? value.trim().toLowerCase() : "";
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}
function passwordOf(value) {
    return typeof value === "string" && value.length >= 8 && value.length <= 128 ? value : "";
}
function usernameOf(value) {
    const username = typeof value === "string" ? value.trim().toLowerCase() : "";
    return /^[a-z0-9_]{3,20}$/.test(username) ? username : "";
}
async function issueSession(user, req) {
    const refreshToken = opaqueToken();
    const expiresAt = new Date(Date.now() + config.refreshTokenTtlDays * 86400000);
    await sql `insert into public.anilove_auth_sessions (user_id, refresh_token_hash, expires_at, user_agent, ip_address)
    values (${user.id}::uuid, ${tokenHash(refreshToken)}, ${expiresAt}, ${req.get("user-agent") ?? null}, ${req.ip ?? null})`;
    return { accessToken: await accessToken(user.id, user.email, user.role), refreshToken, expiresAt };
}
async function authenticatedUser(req) {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
    if (!token)
        return null;
    const identity = await readAccessToken(token).catch(() => null);
    if (!identity?.userId)
        return null;
    const rows = await sql `select id, email, username, display_name, role, email_verified_at
    from public.anilove_auth_users where id = ${identity.userId}::uuid and deleted_at is null`;
    return rows[0] ?? null;
}
app.get("/health", async (_req, res) => {
    await sql `select 1`;
    res.json({ ok: true, service: "anilove-logs-backend", database: "cockroachdb" });
});
app.post("/auth/register", async (req, res) => {
    const email = emailOf(req.body?.email);
    const password = passwordOf(req.body?.password);
    const username = usernameOf(req.body?.username);
    if (!email || !password || !username)
        return res.status(400).json({ error: "Valid email, password, and username are required." });
    const passwordHash = await hashPassword(password);
    try {
        const rows = await sql `insert into public.anilove_auth_users (email, username, display_name, password_hash)
      values (${email}, ${username}, ${username}, ${passwordHash})
      returning id, email`;
        const token = opaqueToken();
        await sql `insert into public.anilove_auth_email_tokens (user_id, token_hash, purpose, expires_at)
      values (${rows[0].id}::uuid, ${tokenHash(token)}, 'verify_email', now() + interval '24 hours')`;
        await sendVerificationEmail(email, token);
        res.status(201).json({ ok: true, message: "Check your email to verify your account." });
    }
    catch (error) {
        if (String(error).includes("unique"))
            return res.status(409).json({ error: "Email or username is already in use." });
        throw error;
    }
});
app.post("/auth/login", async (req, res) => {
    const email = emailOf(req.body?.email);
    const password = passwordOf(req.body?.password);
    const rows = await sql `select id, email, password_hash, role, email_verified_at
    from public.anilove_auth_users where lower(email) = ${email} and deleted_at is null`;
    const user = rows[0];
    if (!user || !(await verifyPassword(password, user.password_hash)))
        return res.status(401).json({ error: "Invalid email or password." });
    if (!user.email_verified_at)
        return res.status(403).json({ error: "Please verify your email before signing in." });
    await sql `update public.anilove_auth_users set last_signed_in_at = now(), updated_at = now() where id = ${user.id}::uuid`;
    res.json(await issueSession({ id: String(user.id), email: String(user.email), role: String(user.role) }, req));
});
app.post("/auth/refresh", async (req, res) => {
    const refreshToken = typeof req.body?.refreshToken === "string" ? req.body.refreshToken : "";
    const rows = await sql `select s.id as session_id, u.id, u.email, u.role from public.anilove_auth_sessions s
    join public.anilove_auth_users u on u.id = s.user_id
    where s.refresh_token_hash = ${tokenHash(refreshToken)} and s.revoked_at is null and s.expires_at > now() and u.deleted_at is null`;
    const session = rows[0];
    if (!session)
        return res.status(401).json({ error: "Session expired." });
    await sql `update public.anilove_auth_sessions set revoked_at = now() where id = ${session.session_id}::uuid`;
    res.json(await issueSession({ id: String(session.id), email: String(session.email), role: String(session.role) }, req));
});
app.post("/auth/logout", async (req, res) => {
    const refreshToken = typeof req.body?.refreshToken === "string" ? req.body.refreshToken : "";
    await sql `update public.anilove_auth_sessions set revoked_at = now()
    where refresh_token_hash = ${tokenHash(refreshToken)} and revoked_at is null`;
    res.status(204).send();
});
app.get("/auth/verify-email", async (req, res) => {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    const rows = await sql `select user_id from public.anilove_auth_email_tokens
    where token_hash = ${tokenHash(token)} and purpose = 'verify_email' and consumed_at is null and expires_at > now()`;
    if (!rows[0])
        return res.status(400).json({ error: "Verification link is invalid or expired." });
    await sql.begin(async (transaction) => {
        await transaction `update public.anilove_auth_users set email_verified_at = coalesce(email_verified_at, now()), updated_at = now() where id = ${rows[0].user_id}::uuid`;
        await transaction `update public.anilove_auth_email_tokens set consumed_at = now() where token_hash = ${tokenHash(token)}`;
    });
    res.json({ ok: true, message: "Email verified. You can sign in." });
});
app.post("/auth/resend-verification", async (req, res) => {
    const email = emailOf(req.body?.email);
    const rows = await sql `select id, email from public.anilove_auth_users where lower(email) = ${email} and deleted_at is null and email_verified_at is null`;
    if (rows[0]) {
        const token = opaqueToken();
        await sql `insert into public.anilove_auth_email_tokens (user_id, token_hash, purpose, expires_at)
      values (${rows[0].id}::uuid, ${tokenHash(token)}, 'verify_email', now() + interval '24 hours')`;
        await sendVerificationEmail(email, token);
    }
    res.json({ ok: true, message: "If the account exists, a verification email was sent." });
});
app.post("/auth/forgot-password", async (req, res) => {
    const email = emailOf(req.body?.email);
    const rows = await sql `select id, email from public.anilove_auth_users where lower(email) = ${email} and deleted_at is null`;
    if (rows[0]) {
        const token = opaqueToken();
        await sql `insert into public.anilove_auth_email_tokens (user_id, token_hash, purpose, expires_at)
      values (${rows[0].id}::uuid, ${tokenHash(token)}, 'reset_password', now() + interval '1 hour')`;
        await sendPasswordResetEmail(email, token);
    }
    res.json({ ok: true, message: "If the account exists, a reset email was sent." });
});
app.post("/auth/reset-password", async (req, res) => {
    const token = typeof req.body?.token === "string" ? req.body.token : "";
    const password = passwordOf(req.body?.password);
    const rows = await sql `select user_id from public.anilove_auth_email_tokens
    where token_hash = ${tokenHash(token)} and purpose = 'reset_password' and consumed_at is null and expires_at > now()`;
    if (!rows[0] || !password)
        return res.status(400).json({ error: "Reset link or password is invalid." });
    const passwordHash = await hashPassword(password);
    await sql.begin(async (transaction) => {
        await transaction `update public.anilove_auth_users set password_hash = ${passwordHash}, updated_at = now() where id = ${rows[0].user_id}::uuid`;
        await transaction `update public.anilove_auth_email_tokens set consumed_at = now() where token_hash = ${tokenHash(token)}`;
        await transaction `update public.anilove_auth_sessions set revoked_at = now() where user_id = ${rows[0].user_id}::uuid and revoked_at is null`;
    });
    res.json({ ok: true, message: "Password updated." });
});
app.get("/auth/me", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user)
        return res.status(401).json({ error: "Authentication required." });
    res.json(user);
});
app.delete("/auth/account", async (req, res) => {
    const user = await authenticatedUser(req);
    if (!user)
        return res.status(401).json({ error: "Authentication required." });
    await sql `update public.anilove_auth_users set deleted_at = now(), email = 'deleted+' || id || '@invalid.local', updated_at = now() where id = ${user.id}::uuid`;
    await sql `update public.anilove_auth_sessions set revoked_at = now() where user_id = ${user.id}::uuid and revoked_at is null`;
    res.status(204).send();
});
app.use((error, _req, res, _next) => {
    console.error("[AniloveAuth] request failed", error);
    res.status(500).json({ error: "Authentication service unavailable." });
});
if (process.env.VERCEL !== "1") {
    app.listen(config.port, () => console.log(`[AniloveAuth] listening on ${config.port}`));
}
