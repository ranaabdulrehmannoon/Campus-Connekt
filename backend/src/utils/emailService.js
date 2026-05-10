const nodemailer = require('nodemailer');

// ─── OTP Generation ─────────────────────────────────────────────────────────
const generateOTP = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

// ─── Transporter ────────────────────────────────────────────────────────────
// Reads EMAIL_* vars from .env (SMTP_* kept as fallback for compatibility).
const getTransporter = () => {
  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST;
  const port = process.env.EMAIL_PORT || process.env.SMTP_PORT;
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    console.warn('[Email] SMTP not configured – missing env vars:', {
      EMAIL_HOST: !!host,
      EMAIL_PORT: !!port,
      EMAIL_USER: !!user,
      EMAIL_PASS: !!pass,
    });
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465, // true for port 465 (SSL), false for 587 (STARTTLS)
    auth: { user, pass },
    tls: { rejectUnauthorized: false }, // allow Gmail-issued certs in all environments
  });
};

// Verify SMTP connection on server start (call from server.js if desired)
const verifySmtpConnection = async () => {
  const transporter = getTransporter();
  if (!transporter) return false;
  try {
    await transporter.verify();
    console.log('[Email] SMTP connection verified ✓');
    return true;
  } catch (err) {
    console.error('[Email] SMTP connection failed:', err.message);
    return false;
  }
};

// ─── HTML template helpers ───────────────────────────────────────────────────
const emailWrapper = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Campus ConneKt</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a5f 0%,#2d6a9f 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:1px;">
                Campus ConneKt
              </h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">
                NUST Resource &amp; Event Platform
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8f9fb;padding:20px 40px;text-align:center;border-top:1px solid #eef0f4;">
              <p style="margin:0;color:#9aa3b2;font-size:12px;">
                This is an automated email from Campus ConneKt. Please do not reply.<br/>
                &copy; ${new Date().getFullYear()} NUST Campus ConneKt
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// ─── Send verification email ─────────────────────────────────────────────────
const sendVerificationEmail = async (email, token, code) => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/${token}`;
  const transporter = getTransporter();

  if (!transporter) {
    console.warn('[Email] No transporter – verification code (dev only):', code);
    console.warn('[Email] Verification link (dev only):', verificationUrl);
    return false;
  }

  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;color:#1e3a5f;font-size:22px;">Verify Your Email</h2>
    <p style="margin:0 0 24px;color:#5a6478;font-size:15px;line-height:1.6;">
      Welcome to Campus ConneKt! Use the code below to activate your account.
      This code expires in <strong>10 minutes</strong>.
    </p>

    <div style="background:#f0f5ff;border:2px dashed #2d6a9f;border-radius:10px;
                padding:24px;text-align:center;margin-bottom:28px;">
      <p style="margin:0 0 6px;color:#5a6478;font-size:12px;text-transform:uppercase;
                letter-spacing:1.5px;font-weight:600;">Your Verification Code</p>
      <p style="margin:0;color:#1e3a5f;font-size:38px;font-weight:800;letter-spacing:8px;">
        ${code}
      </p>
    </div>

    <p style="margin:0 0 16px;color:#5a6478;font-size:14px;text-align:center;">
      — or verify with one click —
    </p>

    <div style="text-align:center;margin-bottom:28px;">
      <a href="${verificationUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#1e3a5f,#2d6a9f);
                color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;
                font-size:15px;font-weight:600;">
        Verify Email Address
      </a>
    </div>

    <p style="margin:0;color:#9aa3b2;font-size:13px;text-align:center;">
      If you did not create a Campus ConneKt account, you can safely ignore this email.
    </p>
  `);

  try {
    const fromAddress =
      process.env.EMAIL_FROM ||
      process.env.EMAIL_USER ||
      process.env.SMTP_USER;

    const info = await transporter.sendMail({
      from: `"Campus ConneKt" <${fromAddress}>`,
      to: email,
      subject: '🎓 Verify your Campus ConneKt account',
      html,
    });

    console.log('[Email] Verification email sent to', email, '| MessageId:', info.messageId);
    return true;
  } catch (err) {
    console.error('[Email] Failed to send verification email to', email, ':', err.message);
    console.error('[Email] Full error:', err);
    return false;
  }
};

// ─── Send password reset email ───────────────────────────────────────────────
const sendPasswordResetEmail = async (email, token) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${encodeURIComponent(token)}`;
  const transporter = getTransporter();

  if (!transporter) {
    console.warn('[Email] No transporter – reset link (dev only):', resetUrl);
    return false;
  }

  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;color:#1e3a5f;font-size:22px;">Reset Your Password</h2>
    <p style="margin:0 0 24px;color:#5a6478;font-size:15px;line-height:1.6;">
      We received a request to reset your Campus ConneKt password.
      Click the button below — this link expires in <strong>15 minutes</strong>.
    </p>

    <div style="text-align:center;margin-bottom:28px;">
      <a href="${resetUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#1e3a5f,#2d6a9f);
                color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;
                font-size:15px;font-weight:600;">
        Reset Password
      </a>
    </div>

    <div style="background:#fff8f0;border-left:4px solid #f59e0b;border-radius:4px;
                padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
        <strong>Security tip:</strong> If you did not request a password reset,
        your account may be at risk. Please change your password immediately
        and contact the admin.
      </p>
    </div>

    <p style="margin:0;color:#9aa3b2;font-size:13px;text-align:center;">
      Or copy this link into your browser:<br/>
      <span style="color:#2d6a9f;word-break:break-all;font-size:12px;">${resetUrl}</span>
    </p>
  `);

  try {
    const fromAddress =
      process.env.EMAIL_FROM ||
      process.env.EMAIL_USER ||
      process.env.SMTP_USER;

    const info = await transporter.sendMail({
      from: `"Campus ConneKt" <${fromAddress}>`,
      to: email,
      subject: '🔐 Reset your Campus ConneKt password',
      html,
    });

    console.log('[Email] Password reset email sent to', email, '| MessageId:', info.messageId);
    return true;
  } catch (err) {
    console.error('[Email] Failed to send password reset email to', email, ':', err.message);
    console.error('[Email] Full error:', err);
    return false;
  }
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail, verifySmtpConnection, generateOTP };
