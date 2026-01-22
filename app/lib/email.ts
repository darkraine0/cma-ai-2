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
          <title>Verification Code</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  
                  <!-- Header with primary color -->
                  <tr>
                    <td style="background-color: #818254; padding: 30px 40px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Verification Code</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="margin: 0 0 24px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                        Thank you for signing up! Please use the verification code below to complete your registration:
                      </p>
                      
                      <!-- Verification Code Box -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                        <tr>
                          <td style="background-color: #f8f9f5; border: 2px solid #818254; border-radius: 6px; padding: 24px; text-align: center;">
                            <div style="color: #818254; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">${verificationCode}</div>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 24px 0 0 0; color: #666666; font-size: 14px; line-height: 1.5;">
                        This code will expire in 24 hours.
                      </p>
                      
                      <p style="margin: 24px 0 0 0; color: #999999; font-size: 13px; line-height: 1.5;">
                        If you didn't create an account, please ignore this email.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f9f5; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e5e5;">
                      <p style="margin: 0; color: #999999; font-size: 12px;">
                        This is an automated message, please do not reply.
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
Verification Code: ${verificationCode}

Thank you for signing up! Please use the verification code below to complete your registration:

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
          <title>Password Reset Code</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  
                  <!-- Header with primary color -->
                  <tr>
                    <td style="background-color: #818254; padding: 30px 40px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Password Reset Code</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="margin: 0 0 24px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                        You requested to reset your password. Please use the verification code below to proceed:
                      </p>
                      
                      <!-- Verification Code Box -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                        <tr>
                          <td style="background-color: #f8f9f5; border: 2px solid #818254; border-radius: 6px; padding: 24px; text-align: center;">
                            <div style="color: #818254; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">${verificationCode}</div>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 24px 0 0 0; color: #666666; font-size: 14px; line-height: 1.5;">
                        This code will expire in 1 hour.
                      </p>
                      
                      <p style="margin: 24px 0 0 0; color: #dc3545; font-size: 14px; line-height: 1.5; font-weight: 600;">
                        If you didn't request a password reset, please ignore this email and your password will remain unchanged.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f9f5; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e5e5;">
                      <p style="margin: 0; color: #999999; font-size: 12px;">
                        This is an automated message, please do not reply.
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
Password Reset Code: ${verificationCode}

You requested to reset your password. Please use the verification code below to proceed:

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
