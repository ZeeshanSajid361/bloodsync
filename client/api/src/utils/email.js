/**
 * Email delivery utility via Nodemailer.
 *
 * A single transporter is created once and reused across calls (connection
 * pooling). All outbound emails are sent from the address configured in
 * EMAIL_FROM. Template helpers below keep route handlers free of HTML strings.
 */

'use strict';

const nodemailer = require('nodemailer');
const { smtp, clientUrl } = require('../config/env');

// Create the transporter once at module load — reused for every send call.
const transporter = nodemailer.createTransport({
  host: smtp.host,
  port: Number(smtp.port),
  secure: Number(smtp.port) === 465, // true for port 465, STARTTLS for 587
  auth: {
    user: smtp.user,
    pass: smtp.pass,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

/**
 * Base send function — all template helpers delegate here.
 *
 * @param {{ to: string, subject: string, html: string }} options
 * @returns {Promise<void>}
 */
async function sendMail({ to, subject, html }) {
  await transporter.sendMail({
    from: smtp.from,
    to,
    subject,
    html,
  });
}

const PRODUCTION_CLIENT_URL = 'https://blood-sync-app.vercel.app';

const getBaseClientUrl = () => {
  const raw = clientUrl || '';
  // If the configured URL is missing, localhost, or invalid, use the production domain.
  if (!raw || raw.includes('localhost') || raw.includes('127.0.0.1') || raw === '*' || raw.includes('blood-link-20')) {
    return PRODUCTION_CLIENT_URL;
  }
  return raw.replace(/\/+$/, '');
};


/**
 * Sends the account email-verification link.
 *
 * @param {{ name: string, email: string, token: string }} recipient
 */
async function sendVerificationEmail({ name, email, token }) {
  const verifyUrl = `${getBaseClientUrl()}/verify-email?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Verify your BloodSync email</title>
      <style>
        body { margin: 0; padding: 0; background: #0d0d0f; font-family: 'Segoe UI', Arial, sans-serif; }
        .wrapper { max-width: 560px; margin: 40px auto; background: #141418; border-radius: 16px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #c0392b, #96281b); padding: 36px 40px; text-align: center; }
        .header h1 { margin: 0; color: #fff; font-size: 24px; letter-spacing: 0.5px; }
        .header p  { margin: 6px 0 0; color: rgba(255,255,255,0.75); font-size: 13px; }
        .body { padding: 36px 40px; color: #ccc; font-size: 15px; line-height: 1.7; }
        .body strong { color: #fff; }
        .btn-wrap { text-align: center; margin: 32px 0; }
        .btn { display: inline-block; padding: 14px 36px; background: #c0392b;
               color: #fff; text-decoration: none; border-radius: 8px;
               font-size: 15px; font-weight: 600; letter-spacing: 0.3px; }
        .footer { padding: 20px 40px; border-top: 1px solid #222; color: #555; font-size: 12px; text-align: center; }
        .url { word-break: break-all; color: #888; font-size: 12px; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1>🩸 BloodSync 2.0</h1>
          <p>Connecting donors, seekers & hospitals</p>
        </div>
        <div class="body">
          <p>Hi <strong>${name}</strong>,</p>
          <p>
            Thank you for joining BloodSync. Before your account goes live,
            please confirm your email address by clicking the button below.
            This link expires in <strong>2 hours</strong>. Any new request automatically invalidates older links.

          </p>
          <div class="btn-wrap">
            <a href="${verifyUrl}" class="btn">Verify Email Address</a>
          </div>
          <p>If you did not create a BloodSync account, you can safely ignore this email.</p>
          <p class="url">Or paste this link in your browser:<br />${verifyUrl}</p>
        </div>
        <div class="footer">© ${new Date().getFullYear()} BloodSync — A university project</div>
      </div>
    </body>
    </html>
  `;

  await sendMail({ to: email, subject: 'Verify your BloodSync email address', html });
}

/**
 * Sends a welcome email after successful email verification.
 *
 * @param {{ name: string, email: string, role: string }} recipient
 */
async function sendWelcomeEmail({ name, email, role }) {
  const dashboardUrl = `${getBaseClientUrl()}/dashboard`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Welcome to BloodSync</title>
      <style>
        body { margin: 0; padding: 0; background: #0d0d0f; font-family: 'Segoe UI', Arial, sans-serif; }
        .wrapper { max-width: 560px; margin: 40px auto; background: #141418; border-radius: 16px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #1565c0, #0d47a1); padding: 36px 40px; text-align: center; }
        .header h1 { margin: 0; color: #fff; font-size: 24px; }
        .body { padding: 36px 40px; color: #ccc; font-size: 15px; line-height: 1.7; }
        .body strong { color: #fff; }
        .btn-wrap { text-align: center; margin: 32px 0; }
        .btn { display: inline-block; padding: 14px 36px; background: #1565c0;
               color: #fff; text-decoration: none; border-radius: 8px;
               font-size: 15px; font-weight: 600; }
        .footer { padding: 20px 40px; border-top: 1px solid #222; color: #555; font-size: 12px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1>🩸 Welcome to BloodSync</h1>
        </div>
        <div class="body">
          <p>Hi <strong>${name}</strong>,</p>
          <p>
            Your email is verified and your <strong>${role}</strong> account is now active.
            Head to your dashboard to complete your profile.
          </p>
          <div class="btn-wrap">
            <a href="${dashboardUrl}" class="btn">Go to Dashboard</a>
          </div>
          <p>Every donation saves lives. Thank you for being part of the network.</p>
        </div>
        <div class="footer">© ${new Date().getFullYear()} BloodSync — A university project</div>
      </div>
    </body>
    </html>
  `;

  await sendMail({ to: email, subject: 'You are verified — Welcome to BloodSync!', html });
}

/**
 * Sends a password reset email.
 *
 * @param {{ name: string, email: string, token: string }} recipient
 */
async function sendPasswordResetEmail({ name, email, token }) {
  const resetUrl = `${getBaseClientUrl()}/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Reset your BloodSync password</title>
      <style>
        body { margin: 0; padding: 0; background: #0d0d0f; font-family: 'Segoe UI', Arial, sans-serif; }
        .wrapper { max-width: 560px; margin: 40px auto; background: #141418; border-radius: 16px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #c0392b, #96281b); padding: 36px 40px; text-align: center; }
        .header h1 { margin: 0; color: #fff; font-size: 24px; }
        .body { padding: 36px 40px; color: #ccc; font-size: 15px; line-height: 1.7; }
        .body strong { color: #fff; }
        .btn-wrap { text-align: center; margin: 32px 0; }
        .btn { display: inline-block; padding: 14px 36px; background: #c0392b;
               color: #fff; text-decoration: none; border-radius: 8px;
               font-size: 15px; font-weight: 600; }
        .footer { padding: 20px 40px; border-top: 1px solid #222; color: #555; font-size: 12px; text-align: center; }
        .url { word-break: break-all; color: #888; font-size: 12px; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1>🩸 Reset Password</h1>
        </div>
        <div class="body">
          <p>Hi <strong>${name}</strong>,</p>
          <p>
            We received a request to reset your password for your BloodSync account.
            Click the button below to set a new password. This link is valid for <strong>10 minutes</strong>. Any newer request automatically invalidates older links.

          </p>
          <div class="btn-wrap">
            <a href="${resetUrl}" class="btn">Reset Password</a>
          </div>
          <p>If you did not request a password reset, you can safely ignore this email.</p>
          <p class="url">Or paste this link in your browser:<br />${resetUrl}</p>
        </div>
        <div class="footer">© ${new Date().getFullYear()} BloodSync</div>
      </div>
    </body>
    </html>
  `;

  await sendMail({ to: email, subject: 'Reset your BloodSync password', html });
}

/**
 * Sends a contact support message to zeeshansajid361@gmail.com.
 *
 * @param {{ name: string, email: string, message: string }} details
 */
async function sendContactSupportEmail({ name, email, message }) {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Support Inquiry</title>
      <style>
        body { margin: 0; padding: 0; background: #0d0d0f; font-family: 'Segoe UI', Arial, sans-serif; }
        .wrapper { max-width: 560px; margin: 40px auto; background: #141418; border-radius: 16px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #c0392b, #96281b); padding: 24px 32px; color: #fff; }
        .body { padding: 24px 32px; color: #ccc; font-size: 15px; line-height: 1.6; }
        .body strong { color: #fff; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h2 style="margin:0;">🩸 New Support Inquiry</h2>
        </div>
        <div class="body">
          <p><strong>Sender Name:</strong> ${name}</p>
          <p><strong>Sender Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <div style="background: #1c1c22; padding: 16px; border-radius: 8px; color: #eee; white-space: pre-wrap;">${message}</div>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendMail({ to: 'zeeshansajid361@gmail.com', subject: `[BloodSync Contact] Message from ${name}`, html });
}

module.exports = { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail, sendContactSupportEmail };


