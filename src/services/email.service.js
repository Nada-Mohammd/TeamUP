const nodemailer = require("nodemailer");

let transporter;

const getTransporter = () => {
  if (transporter) return transporter;

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error(
      "Email provider is enabled, but EMAIL_USER or EMAIL_PASS is missing.",
    );
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });

  return transporter;
};

const buildPasswordResetTemplate = ({ firstName, otp }) => {
  return {
    subject: "TeamUp Password Reset Code",
    html: `
      <div style="background:#f4f7fb;padding:24px;font-family:Segoe UI,Arial,sans-serif;color:#1f2937;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:#0f766e;padding:20px 24px;">
              <h1 style="margin:0;font-size:22px;line-height:1.2;color:#ffffff;">TeamUp</h1>
              <p style="margin:6px 0 0 0;color:#ccfbf1;font-size:13px;">Secure Account Recovery</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 14px 0;font-size:15px;">Hello ${firstName},</p>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;">
                We received a request to reset your TeamUp password. Use the OTP below to continue:
              </p>
              <div style="margin:18px 0 22px 0;padding:14px 18px;border:1px dashed #14b8a6;border-radius:10px;background:#f0fdfa;text-align:center;">
                <span style="font-size:34px;letter-spacing:8px;font-weight:700;color:#115e59;">${otp}</span>
              </div>
              <p style="margin:0 0 10px 0;font-size:14px;color:#374151;">This code expires in <strong>10 minutes</strong>.</p>
              <p style="margin:0;font-size:13px;color:#6b7280;">
                If you did not request this reset, please ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#6b7280;">TeamUp Security Team</p>
            </td>
          </tr>
        </table>
      </div>
    `,
  };
};

const sendPasswordResetOtpEmail = async (email, otp, firstName = "User") => {
  const enabled =
    String(process.env.EMAIL_PROVIDER_ENABLED || "false").toLowerCase() ===
    "true";

  if (!enabled) {
    console.log(
      `[PasswordResetOTP] recipient=${email} name=${firstName} otp=${otp} (email provider disabled)`,
    );
    return;
  }

  const mailTransporter = getTransporter();
  const from = process.env.EMAIL_FROM || `TeamUp <${process.env.EMAIL_USER}>`;
  const template = buildPasswordResetTemplate({ firstName, otp });

  await mailTransporter.sendMail({
    from,
    to: email,
    subject: template.subject,
    html: template.html,
  });
};

module.exports = {
  sendPasswordResetOtpEmail,
};
