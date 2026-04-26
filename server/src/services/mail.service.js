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

// ─── Shared layout wrapper ─────────────────────────────────────────────────────

function emailWrapper(content) {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Slaytim</title>
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#1a1a1a;border-radius:16px;border:1px solid #2a2a2a;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:28px 32px 20px;border-bottom:1px solid #2a2a2a;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="width:32px;height:32px;background:#6366f1;border-radius:8px;display:inline-block;text-align:center;line-height:32px;vertical-align:middle;">
                      <span style="color:#fff;font-size:16px;font-weight:800;">S</span>
                    </div>
                  </td>
                  <td style="padding-left:10px;vertical-align:middle;">
                    <span style="font-size:17px;font-weight:800;color:#fff;letter-spacing:-0.3px;">slaytim</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #2a2a2a;text-align:center;">
              <p style="margin:0;color:#555;font-size:12px;line-height:1.5;">
                Bu e-posta Slaytim tarafından gönderilmiştir.<br />
                Eğer bu işlemi siz yapmadıysanız bu e-postayı görmezden gelin.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function primaryButton(href, label) {
  return `<a href="${href}"
    style="display:inline-block;background:#6366f1;color:#fff;font-weight:700;
           padding:14px 32px;border-radius:12px;text-decoration:none;font-size:14px;
           margin-top:24px;margin-bottom:8px;">
    ${label}
  </a>`;
}

function fallbackLink(href) {
  return `<p style="margin:20px 0 0;word-break:break-all;">
    <span style="color:#555;font-size:12px;">Buton çalışmıyorsa şu adresi kopyala:</span><br />
    <a href="${href}" style="color:#6366f1;font-size:12px;word-break:break-all;">${href}</a>
  </p>`;
}

// ─── Email Verification ────────────────────────────────────────────────────────

function verifyEmailHtml(verifyUrl) {
  return emailWrapper(`
    <h2 style="margin:0 0 8px;color:#fff;font-size:22px;font-weight:800;">E-posta adresini doğrula</h2>
    <p style="margin:0;color:#aaa;font-size:14px;line-height:1.6;">
      Slaytim'e hoş geldin! Hesabını aktifleştirmek için aşağıdaki butona tıkla.
    </p>
    ${primaryButton(verifyUrl, 'E-posta Adresimi Doğrula')}
    ${fallbackLink(verifyUrl)}
    <p style="margin:24px 0 0;color:#555;font-size:12px;">Bu link 24 saat geçerlidir.</p>
  `);
}

// ─── Password Reset ────────────────────────────────────────────────────────────

function resetPasswordHtml(resetUrl) {
  return emailWrapper(`
    <h2 style="margin:0 0 8px;color:#fff;font-size:22px;font-weight:800;">Şifre Sıfırlama</h2>
    <p style="margin:0;color:#aaa;font-size:14px;line-height:1.6;">
      Slaytim hesabın için şifre sıfırlama talebinde bulundun.<br />
      Aşağıdaki butona tıklayarak yeni şifreni belirle.
    </p>
    ${primaryButton(resetUrl, 'Şifremi Sıfırla')}
    ${fallbackLink(resetUrl)}
    <p style="margin:24px 0 0;color:#555;font-size:12px;">Bu link 30 dakika geçerlidir.</p>
  `);
}

// ─── Magic Link ────────────────────────────────────────────────────────────────

function magicLinkHtml(magicUrl) {
  return emailWrapper(`
    <h2 style="margin:0 0 8px;color:#fff;font-size:22px;font-weight:800;">Giriş Bağlantısı</h2>
    <p style="margin:0;color:#aaa;font-size:14px;line-height:1.6;">
      Slaytim'e şifresiz giriş yapmak için aşağıdaki butona tıkla.<br />
      Bu link yalnızca bir kez kullanılabilir.
    </p>
    ${primaryButton(magicUrl, "Slaytim'e Giriş Yap")}
    ${fallbackLink(magicUrl)}
    <p style="margin:24px 0 0;color:#555;font-size:12px;">Bu link 15 dakika geçerlidir.</p>
  `);
}

module.exports = { sendMail, verifyEmailHtml, resetPasswordHtml, magicLinkHtml };
