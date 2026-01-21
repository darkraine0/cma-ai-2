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

  // Create transporter with IONOS SMTP settings
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
    tls: {
      rejectUnauthorized: false, // 🔥 important for IONOS
    },
  
    // Connection timeout settings to prevent hanging
    connectionTimeout: 10000, // 10 seconds
    socketTimeout: 10000, // 10 seconds
    greetingTimeout: 10000, // 10 seconds
    // For port 587, STARTTLS is automatically enabled by nodemailer
    // No additional TLS configuration needed
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

    console.log("📧 Verifying SMTP...");
    await transporter.verify();

    const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER;

    const mailOptions = {
      from: smtpFrom,
      to: to,
      subject: 'Verify Your Email Address',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h1 style="color: #333; margin-top: 0;">Email Verification</h1>
          </div>
          
          <div style="background-color: #fff; padding: 20px; border-radius: 5px; border: 1px solid #ddd;">
            <p>Thank you for signing up! Please verify your email address by entering the following verification code:</p>
            
            <div style="background-color: #f8f9fa; border: 2px solid #007bff; border-radius: 5px; padding: 20px; text-align: center; margin: 20px 0;">
              <h2 style="color: #007bff; margin: 0; font-size: 32px; letter-spacing: 5px;">${verificationCode}</h2>
            </div>
            
            <p>This code will expire in 24 hours.</p>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              If you didn't create an account, please ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>This is an automated message, please do not reply.</p>
          </div>
        </body>
        </html>
      `,
      text: `
Email Verification

Thank you for signing up! Please verify your email address by entering the following verification code:

${verificationCode}

This code will expire in 24 hours.

If you didn't create an account, please ignore this email.
      `,
    };

    // Use timeout wrapper to prevent hanging
    console.log("📧 Sending email...");
    await sendMailWithTimeout(transporter, mailOptions, 15000);
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
      subject: 'Password Reset Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h1 style="color: #333; margin-top: 0;">Password Reset</h1>
          </div>
          
          <div style="background-color: #fff; padding: 20px; border-radius: 5px; border: 1px solid #ddd;">
            <p>You requested to reset your password. Please use the following verification code to proceed:</p>
            
            <div style="background-color: #f8f9fa; border: 2px solid #dc3545; border-radius: 5px; padding: 20px; text-align: center; margin: 20px 0;">
              <h2 style="color: #dc3545; margin: 0; font-size: 32px; letter-spacing: 5px;">${verificationCode}</h2>
            </div>
            
            <p>This code will expire in 1 hour.</p>
            
            <p style="color: #dc3545; font-weight: bold;">If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>This is an automated message, please do not reply.</p>
          </div>
        </body>
        </html>
      `,
      text: `
Password Reset

You requested to reset your password. Please use the following verification code to proceed:

${verificationCode}

This code will expire in 1 hour.

If you didn't request a password reset, please ignore this email and your password will remain unchanged.
      `,
    };

    // Use timeout wrapper to prevent hanging
    await sendMailWithTimeout(transporter, mailOptions, 15000);
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
