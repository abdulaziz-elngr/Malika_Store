import nodemailer, { type Transporter } from "nodemailer";

/**
 * Outgoing email over SMTP. Configure with SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS (+ optional MAIL_FROM, SMTP_SECURE).
 * Sending never throws: callers get { ok: false } and decide what to do, so mail trouble cannot break a business flow.
 */
export type MailInput = { to: string | string[]; subject: string; html: string; text: string; replyTo?: string };
export type MailResult = { ok: true } | { ok: false; error: "not_configured" | "send_failed" };

function mailConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT) || 465;
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;
  const from = process.env.MAIL_FROM?.trim() || `MALIKA <${user}>`;
  return { host, port, secure, user, pass, from };
}

export const isMailConfigured = () => mailConfig() !== null;

const g = globalThis as unknown as { __malikaMail?: { key: string; transport: Transporter } };

function transporter(cfg: NonNullable<ReturnType<typeof mailConfig>>) {
  const key = `${cfg.host}:${cfg.port}:${cfg.secure}:${cfg.user}`;
  if (g.__malikaMail?.key === key) return g.__malikaMail.transport;
  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  g.__malikaMail = { key, transport };
  return transport;
}

export async function sendMail(mail: MailInput): Promise<MailResult> {
  const cfg = mailConfig();
  if (!cfg) return { ok: false, error: "not_configured" };
  try {
    await transporter(cfg).sendMail({ from: cfg.from, to: mail.to, subject: mail.subject, html: mail.html, text: mail.text, replyTo: mail.replyTo });
    return { ok: true };
  } catch (e) {
    console.error("[mail] send failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "send_failed" };
  }
}
