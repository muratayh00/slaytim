const nodemailer = require('nodemailer');

// Configure via environment variables:
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
// For Gmail: use App Password (not your real password)
// For production: use Resend, Mailgun, SendGrid etc.

function createTransport() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  // Dev fallback: Ethereal (fake SMTP, view at ethereal.email)
  return null;
}

async function sendMail({ to, subject, html }) {
  let transporter = createTransport();

  if (!transporter) {
    // Auto-create Ethereal test account in development (network failure = silent skip)
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      const info = await transporter.sendMail({
        from: `"Slaytim" <${testAccount.user}>`,
        to, subject, html,
      });
      console.log('[mail] Preview URL:', nodemailer.getTestMessageUrl(info));
    } catch (err) {
      console.warn('[mail] Ethereal test account unavailable — e-posta gönderilmedi:', err.message);
    }
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"Slaytim" <${process.env.SMTP_USER}>`,
    to, subject, html,
  });
}

function resetPasswordHtml(resetUrl) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #111;">
      <h2 style="margin-bottom: 8px;">Şifre Sıfırlama</h2>
      <p style="color: #555; margin-bottom: 24px;">
        Slaytim hesabınız için şifre sıfırlama talebinde bulundunuz.<br>
        Aşağıdaki butona tıklayarak yeni şifrenizi belirleyin.
      </p>
      <a href="${resetUrl}"
        style="display: inline-block; background: #6366f1; color: #fff; font-weight: 700;
               padding: 12px 28px; border-radius: 12px; text-decoration: none; font-size: 14px;">
        Şifremi Sıfırla
      </a>
      <p style="color: #999; font-size: 12px; margin-top: 24px;">
        Bu link 1 saat geçerlidir. Eğer bu talebi siz yapmadıysanız bu e-postayı görmezden gelin.
      </p>
    </div>
  `;
}

module.exports = { sendMail, resetPasswordHtml };
