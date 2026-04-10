/**
 * Notification service — thin wrapper around Nodemailer.
 * Swap transport config here to use SendGrid, AWS SES, etc. without
 * touching call sites.
 */

import nodemailer from "nodemailer";

// ─── Transport ────────────────────────────────────────────────────────────────

function createTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;

  // In development without SMTP config, use Ethereal (auto-generated test account)
  if (!SMTP_HOST || !SMTP_USER) {
    console.warn("[mailer] SMTP not configured — emails will be logged to console only");
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT ?? "587"),
    secure: SMTP_SECURE === "true",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

const transporter = createTransport();

// ─── Types ────────────────────────────────────────────────────────────────────

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function sendMail(options: SendMailOptions): Promise<void> {
  const from = process.env.EMAIL_FROM ?? "Arogya <noreply@arogya.health>";

  if (!transporter) {
    // Dev fallback: log to console
    console.log("[mailer] Would send email:", {
      from,
      to: options.to,
      subject: options.subject,
    });
    return;
  }

  await transporter.sendMail({ from, ...options });
}

export async function sendAlertEmail(
  to: string,
  patientName: string,
  alertMessage: string,
  severity: string
): Promise<void> {
  await sendMail({
    to,
    subject: `[Arogya Alert — ${severity.toUpperCase()}] ${patientName}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0F6E56; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">Arogya Clinical Alert</h2>
        </div>
        <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p><strong>Patient:</strong> ${patientName}</p>
          <p><strong>Severity:</strong> <span style="color: #E24B4A; font-weight: 600;">${severity.toUpperCase()}</span></p>
          <p><strong>Alert:</strong> ${alertMessage}</p>
          <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
            Log in to the Arogya portal to review and act on this alert.
          </p>
        </div>
      </div>
    `,
    text: `Arogya Clinical Alert\nPatient: ${patientName}\nSeverity: ${severity}\n${alertMessage}`,
  });
}
