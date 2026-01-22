import nodemailer from 'nodemailer';

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
