import nodemailer from 'nodemailer';
import connectDB from '@/app/lib/mongodb';
import User from '@/app/models/User';

/**
 * Email service configuration
 * Uses environment variables for SMTP credentials
 */
const createTransporter = () => {
  // Get SMTP configuration from environment variables
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const smtpFrom = process.env.SMTP_FROM || smtpUser;

  // Validate required environment variables
  if (!smtpHost || !smtpUser || !smtpPassword) {
    throw new Error(
      'SMTP configuration missing. Please set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in your .env file.'
    );
  }

  // Create transporter - keep it simple like the working code
  // Port 587 uses STARTTLS, Port 465 uses SSL
  const useSSL = smtpPort === 465;
  
  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: useSSL, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
    // No additional TLS/timeout settings - let nodemailer handle defaults
    // IONOS works better with minimal configuration
  });
};

type ReminderSmtpConfig = {
  transporter: nodemailer.Transporter;
  /** Must match authenticated user — IONOS rejects mismatched MAIL FROM / From. */
  from: string;
};

/**
 * SMTP for V1 admin reminders (REMINDER_SMTP_*). Separate from auth emails (SMTP_*)
 * so From and login use the same mailbox (required by IONOS and similar hosts).
 */
function createReminderTransporter(): ReminderSmtpConfig {
  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpPort = parseInt(
    process.env.SMTP_PORT?.trim() || '587',
    10
  );
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPassword =
    process.env.SMTP_PASSWORD?.trim();

  if (!smtpHost || !smtpUser || !smtpPassword) {
    throw new Error(
      'Reminder SMTP missing. Set SMTP_USER and SMTP_PASSWORD (and optionally SMTP_HOST / SMTP_PORT).'
    );
  }

  const useSSL = smtpPort === 465;
  const from = process.env.SMTP_FROM?.trim() || smtpUser;

  if (from.toLowerCase() !== smtpUser.toLowerCase()) {
    console.warn(
      `[email] SMTP_FROM (${from}) differs from SMTP_USER (${smtpUser}); using ${smtpUser} as From for IONOS compatibility.`
    );
  }

  return {
    from: smtpUser,
    transporter: nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: useSSL,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    }),
  };
}

/**
 * Wrapper to add timeout to email sending
 */
const sendMailWithTimeout = (
  transporter: nodemailer.Transporter,
  mailOptions: nodemailer.SendMailOptions,
  timeoutMs: number = 15000 // 15 seconds default
): Promise<nodemailer.SentMessageInfo> => {
  return Promise.race([
    transporter.sendMail(mailOptions),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Email sending timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
};

/**
 * Send email with verification code
 */
export async function sendVerificationEmail(
  to: string,
  verificationCode: string
): Promise<void> {
  let transporter: nodemailer.Transporter | null = null;
  try {
    console.log("📧 Creating transporter...");
    transporter = createTransporter();

    // Don't verify connection - IONOS sometimes closes connection during verify
    // Just try to send directly like the working code

    const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER;

    const mailOptions = {
      from: smtpFrom,
      to: to,
      subject: `Verification Code: ${verificationCode}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background-color: #818254; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Email Verification</h1>
          </div>
          
          <div style="background-color: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="margin: 0 0 20px 0; font-size: 16px;">Thank you for signing up! Please use this verification code:</p>
            
            <div style="background-color: #f5f5f0; border-left: 4px solid #818254; padding: 20px; text-align: center; margin: 30px 0;">
              <div style="color: #818254; font-size: 36px; font-weight: bold; letter-spacing: 8px; font-family: monospace;">${verificationCode}</div>
            </div>
            
            <p style="margin: 20px 0 0 0; font-size: 14px; color: #666;">This code will expire in 24 hours.</p>
            
            <p style="margin: 30px 0 0 0; font-size: 13px; color: #999;">
              If you didn't create an account, please ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <p style="font-size: 12px; color: #999; margin: 0;">This is an automated message, please do not reply.</p>
          </div>
        </body>
        </html>
      `,
      text: `
Email Verification

Thank you for signing up! Please use this verification code:

${verificationCode}

This code will expire in 24 hours.

If you didn't create an account, please ignore this email.

This is an automated message, please do not reply.
      `,
    };

    // Send email directly without timeout wrapper (like the working code)
    console.log("📧 Sending email...");
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent successfully to ${to}`);
  } catch (error: any) {
    console.error('Error sending verification email:', error);
    // Close transporter connection if it exists
    if (transporter) {
      try {
        transporter.close();
      } catch (closeError) {
        // Ignore close errors
      }
    }
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
}

/**
 * Send password reset verification code email
 */
export async function sendPasswordResetEmail(
  to: string,
  verificationCode: string
): Promise<void> {
  let transporter: nodemailer.Transporter | null = null;
  try {
    transporter = createTransporter();
    const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER;

    const mailOptions = {
      from: smtpFrom,
      to: to,
      subject: `Password Reset Code: ${verificationCode}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background-color: #818254; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Password Reset</h1>
          </div>
          
          <div style="background-color: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="margin: 0 0 20px 0; font-size: 16px;">You requested to reset your password. Please use this verification code:</p>
            
            <div style="background-color: #f5f5f0; border-left: 4px solid #818254; padding: 20px; text-align: center; margin: 30px 0;">
              <div style="color: #818254; font-size: 36px; font-weight: bold; letter-spacing: 8px; font-family: monospace;">${verificationCode}</div>
            </div>
            
            <p style="margin: 20px 0 0 0; font-size: 14px; color: #666;">This code will expire in 1 hour.</p>
            
            <p style="margin: 30px 0 0 0; font-size: 14px; color: #d63031; font-weight: bold;">
              If you didn't request a password reset, please ignore this email and your password will remain unchanged.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <p style="font-size: 12px; color: #999; margin: 0;">This is an automated message, please do not reply.</p>
          </div>
        </body>
        </html>
      `,
      text: `
Password Reset

You requested to reset your password. Please use this verification code:

${verificationCode}

This code will expire in 1 hour.

If you didn't request a password reset, please ignore this email and your password will remain unchanged.

This is an automated message, please do not reply.
      `,
    };

    // Send email directly without timeout wrapper (like the working code)
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent successfully to ${to}`);
  } catch (error: any) {
    console.error('Error sending password reset email:', error);
    // Close transporter connection if it exists
    if (transporter) {
      try {
        transporter.close();
      } catch (closeError) {
        // Ignore close errors
      }
    }
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
}

export type V1PlanChangePayload = {
  planId: string;
  planName: string;
  communityName: string;
  companyName: string;
  type: 'plan' | 'now';
  price: number;
  previousPrice?: number;
  sqft?: number;
  address?: string;
  priceChangedRecently?: boolean;
  lastUpdated?: Date;
};

function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPlanType(type: 'plan' | 'now'): string {
  return type === 'now' ? 'Quick move-in (spec)' : 'Floor plan';
}

/** All registered user emails for V1 change reminders. */
async function resolveAdminNotifyEmails(): Promise<string[]> {
  await connectDB();
  const users = await User.find({}).select('email').lean();
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const u of users) {
    const email = typeof u.email === 'string' ? u.email.trim().toLowerCase() : '';
    if (!email || seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }
  return emails;
}

const V1_DIGEST_EMAIL_MAX_ROWS = 150;

function formatV1ChangePriceLine(payload: V1PlanChangePayload): string {
  return payload.previousPrice != null && payload.previousPrice !== payload.price
    ? `${formatUsd(payload.previousPrice)} → ${formatUsd(payload.price)}`
    : formatUsd(payload.price);
}

function buildV1DigestChangeText(payload: V1PlanChangePayload, index: number): string {
  const lines = [
    `${index + 1}. ${payload.planName} (${payload.communityName})`,
    `   Builder: ${payload.companyName}`,
    `   Type: ${formatPlanType(payload.type)}`,
    `   Price: ${formatV1ChangePriceLine(payload)}`,
  ];
  if (payload.sqft) lines.push(`   Sq ft: ${payload.sqft.toLocaleString()}`);
  if (payload.address) lines.push(`   Address: ${payload.address}`);
  if (payload.priceChangedRecently) {
    lines.push('   Upstream: price changed recently');
  }
  return lines.join('\n');
}

function buildV1DigestChangeRowHtml(payload: V1PlanChangePayload): string {
  const priceLine = formatV1ChangePriceLine(payload);
  const flag = payload.priceChangedRecently
    ? '<span style="color: #b45309;">Yes</span>'
    : '—';
  return `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 10px 8px; vertical-align: top;">${escapeHtml(payload.communityName)}</td>
      <td style="padding: 10px 8px; vertical-align: top;">${escapeHtml(payload.companyName)}</td>
      <td style="padding: 10px 8px; vertical-align: top;"><strong>${escapeHtml(payload.planName)}</strong></td>
      <td style="padding: 10px 8px; vertical-align: top;">${escapeHtml(formatPlanType(payload.type))}</td>
      <td style="padding: 10px 8px; vertical-align: top;"><strong>${escapeHtml(priceLine)}</strong></td>
      <td style="padding: 10px 8px; vertical-align: top;">${payload.sqft ? payload.sqft.toLocaleString() : '—'}</td>
      <td style="padding: 10px 8px; vertical-align: top;">${payload.address ? escapeHtml(payload.address) : '—'}</td>
      <td style="padding: 10px 8px; vertical-align: top;">${flag}</td>
    </tr>`;
}

export type V1ChangedDigestMeta = {
  finishedAt?: Date;
};

/**
 * One digest email per V1 sync run listing every plan that changed upstream.
 * Fire-and-forget from V1 sync; does not throw when SMTP is missing or send fails.
 */
export async function sendV1ChangedDigestEmail(
  changes: V1PlanChangePayload[],
  meta?: V1ChangedDigestMeta
): Promise<void> {
  if (changes.length === 0) return;

  let transporter: nodemailer.Transporter | null = null;

  try {
    const recipients = await resolveAdminNotifyEmails();
    if (recipients.length === 0) {
      console.warn('[sendV1ChangedDigestEmail] No recipients — no users found in the database.');
      return;
    }

    const { transporter: reminderTransport, from: smtpFrom } = createReminderTransporter();
    transporter = reminderTransport;
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(
      /\/$/,
      ''
    );
    const communitiesUrl = `${appUrl}/communities`;

    const total = changes.length;
    const shown = changes.slice(0, V1_DIGEST_EMAIL_MAX_ROWS);
    const omitted = total - shown.length;

    const finishedLabel = meta?.finishedAt
      ? meta.finishedAt.toLocaleString('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : null;

    const subject =
      total === 1
        ? `[UnionMainHomes] 1 plan changed`
        : `[UnionMainHomes] ${total} plans changed`;

    const tableRows = shown.map((p) => buildV1DigestChangeRowHtml(p)).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 40px 20px;">
        <div style="background-color: #818254; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Plan Data Updated</h1>
        </div>
        <div style="background-color: #ffffff; padding: 32px 28px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="margin: 0 0 16px 0; font-size: 15px;">
            <strong>${total}</strong> plan${total === 1 ? '' : 's'} ${total === 1 ? 'was' : 'were'} changed with latest sync.
            ${finishedLabel ? ` Completed ${escapeHtml(finishedLabel)}.` : ''}
          </p>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin: 16px 0;">
              <thead>
                <tr style="background-color: #f5f5f0; text-align: left;">
                  <th style="padding: 10px 8px;">Community</th>
                  <th style="padding: 10px 8px;">Builder</th>
                  <th style="padding: 10px 8px;">Plan / home</th>
                  <th style="padding: 10px 8px;">Type</th>
                  <th style="padding: 10px 8px;">Price</th>
                  <th style="padding: 10px 8px;">Sq ft</th>
                  <th style="padding: 10px 8px;">Address</th>
                  <th style="padding: 10px 8px;">V1 flag</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
          </div>
          ${
            omitted > 0
              ? `<p style="font-size: 13px; color: #666;">…and ${omitted} more change${omitted === 1 ? '' : 's'} not shown in this email.</p>`
              : ''
          }
          <p style="margin: 24px 0 0 0; text-align: center;">
            <a href="${communitiesUrl}" style="display: inline-block; background-color: #818254; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">Open MarketMap</a>
          </p>
        </div>
        <p style="text-align: center; font-size: 12px; color: #999; margin-top: 16px;">Automated V1 sync reminder — do not reply.</p>
      </body>
      </html>
    `;

    const textParts = [
      'V1 Plan Data Updated',
      '',
      `${total} plan(s) changed during the latest V1 sync.`,
      finishedLabel ? `Completed: ${finishedLabel}` : '',
      '',
      ...shown.map((p, i) => buildV1DigestChangeText(p, i)),
    ];
    if (omitted > 0) {
      textParts.push('', `…and ${omitted} more change(s) not listed.`);
    }
    textParts.push('', `Open MarketMap: ${communitiesUrl}`);
    const text = textParts.filter((line) => line !== '').join('\n');

    await transporter.sendMail({
      from: smtpFrom,
      to: recipients.join(', '),
      subject,
      html,
      text,
    });

    console.log(
      `[sendV1ChangedDigestEmail] Sent digest (${total} change(s)) to ${recipients.length} user(s).`
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[sendV1ChangedDigestEmail] Failed:', message);
    if (process.env.NODE_ENV === 'development') {
      console.log('=== V1 PLAN CHANGED DIGEST (email failed) ===', changes);
    }
  } finally {
    if (transporter) {
      try {
        transporter.close();
      } catch {
        // ignore
      }
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
