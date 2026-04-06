import nodemailer from "nodemailer";

const parsePort = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseSecure = (value: string | undefined, port: number) => {
  if (typeof value === "string" && value.trim()) {
    const normalized = value.trim().toLowerCase();
    return !["false", "0", "no"].includes(normalized);
  }

  return port === 465;
};

const smtpPort = parsePort(process.env.SMTP_PORT, 465);
const smtpUser = process.env.SMTP_USER?.trim() || process.env.SES_USER?.trim();
const smtpPass = process.env.SMTP_PASS || process.env.SES_PASS;

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST?.trim() || "smtppro.zoho.com",
  port: smtpPort,
  secure: parseSecure(process.env.SMTP_SECURE, smtpPort),
  auth:
    smtpUser && smtpPass
      ? {
          user: smtpUser,
          pass: smtpPass,
        }
      : undefined,
});
