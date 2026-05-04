'use strict';

/**
 * mail.service.js — Resend-powered transactional e-mail service
 *
 * Provider : Resend (https://resend.com)
 * From     : hello@slaytim.com  (set via EMAIL_FROM env)
 * Fallback : admin@slaytim.com
 *
 * Environment variables required in production:
 *   RESEND_API_KEY   — Resend secret key (re_xxxx…)
 *   EMAIL_FROM       — Sender address, e.g. "Slaytim <hello@slaytim.com>"
 *
 * Callers use the same interface as before:
 *   sendMail({ to, subject, html, text? })
 *
 * Logging:
 *   [mail] ✓ sent  → id:<resend_id>  to:<email>  subject:<subject>
 *   [mail] ✗ error → <message>       to:<email>  subject:<subject>
 *   [mail] ~ dev   → (no API key — email skipped in development)
 */

const { Resend } = require('resend');
const logger = require('../lib/logger');

// ─── Config ───────────────────────────────────────────────────────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const EMAIL_FROM =
  process.env.EMAIL_FROM ||
  'Slaytim <hello@slaytim.com>';

const IS_PROD = process.env.NODE_ENV === 'production';

// Lazy singleton — only instantiated when key is present.
let _client = null;
function getClient() {
  if (!_client) {
    if (!RESEND_API_KEY) return null;
    _client = new Resend(RESEND_API_KEY);
  }
  return _client;
}

// ─── Core send function ───────────────────────────────────────────────────────

/**
 * Send a transactional e-mail.
 *
 * @param {{ to: string, subject: string, html: string, text?: string }} opts
 * @returns {Promise<void>}
 */
async function sendMail({ to, subject, html, text }) {
  const client = getClient();

  // Development / missing key: log and skip (never throw).
  if (!client) {
    if (IS_PROD) {
      const err = new Error(
        'RESEND_API_KEY is not configured — set it in your production environment.',
      );
      logger.error('[mail] ✗ missing RESEND_API_KEY', { to, subject });
      throw err;
    }
    logger.warn(`[mail] ~ dev — e-posta gönderilmedi (RESEND_API_KEY yok)`, {
      to,
      subject,
    });
    return;
  }

  // Auto-generate plain-text fallback if not supplied.
  const plainText = text || htmlToPlainText(html);

  try {
    const { data, error } = await client.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      text: plainText,
    });

    if (error) {
      logger.error('[mail] ✗ Resend API error', {
        to,
        subject,
        resendError: error.message || JSON.stringify(error),
      });
      throw new Error(`Resend error: ${error.message || JSON.stringify(error)}`);
    }

    logger.info('[mail] ✓ sent', {
      to,
      subject,
      resendId: data?.id ?? 'unknown',
    });
  } catch (err) {
    // Re-throw so fire-and-forget callers in auth.controller can catch & log.
    logger.error('[mail] ✗ send failed', {
      to,
      subject,
      message: err.message,
    });
    throw err;
  }
}

// ─── Plain-text extractor ─────────────────────────────────────────────────────
// Minimal HTML→text so spam filters see a readable plain-text part.

function htmlToPlainText(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&thinsp;/g, ' ')
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ─── Shared layout helpers ────────────────────────────────────────────────────

/**
 * Wraps an HTML snippet in the standard Slaytim email chrome.
 * Inbox-safe table layout, dark background, mobile-first.
 */
function emailWrapper(content, { preview = '' } = {}) {
  // Invisible preheader text (appears as inbox snippet on most clients)
  const preheader = preview
    ? `<div style="display:none;font-size:1px;color:#0f0f0f;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preview}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="tr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>Slaytim</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings>
    <o:PixelsPerInch>96</o:PixelsPerInch>
  </o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .email-body      { padding: 24px 20px !important; }
      .email-header    { padding: 20px 20px 16px !important; }
      .email-footer    { padding: 16px 20px !important; }
      .btn-primary     { display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#0f0f0f;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
${preheader}

<!-- Outer wrapper -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="background-color:#0f0f0f;padding:40px 16px;">
  <tr>
    <td align="center">

      <!-- Card -->
      <table role="presentation" class="email-container" width="520" cellpadding="0" cellspacing="0" border="0"
             style="max-width:520px;width:100%;background-color:#1a1a1a;border-radius:16px;border:1px solid #2a2a2a;">

        <!-- Header -->
        <tr>
          <td class="email-header" style="padding:24px 32px 20px;border-bottom:1px solid #2a2a2a;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="width:34px;height:34px;background-color:#6366f1;border-radius:8px;text-align:center;vertical-align:middle;">
                  <span style="color:#ffffff;font-size:17px;font-weight:900;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;line-height:34px;">S</span>
                </td>
                <td style="padding-left:10px;vertical-align:middle;">
                  <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:17px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">slaytim</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td class="email-body" style="padding:32px;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td class="email-footer" style="padding:18px 32px;border-top:1px solid #2a2a2a;">
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#555555;font-size:12px;line-height:1.6;text-align:center;">
              Bu e-posta <a href="https://slaytim.com" style="color:#6366f1;text-decoration:none;">Slaytim</a> tarafından gönderilmiştir.<br />
              Eğer bu işlemi siz yapmadıysanız bu e-postayı güvenle görmezden gelebilirsiniz.
            </p>
          </td>
        </tr>

      </table>
      <!-- /Card -->

    </td>
  </tr>
</table>
<!-- /Outer wrapper -->

</body>
</html>`;
}

/** Indigo CTA button — inbox-safe inline-block anchor */
function primaryButton(href, label) {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
  <tr>
    <td style="border-radius:12px;background-color:#6366f1;">
      <a href="${href}" class="btn-primary" target="_blank" rel="noopener noreferrer"
         style="display:inline-block;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
                font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;
                padding:14px 32px;border-radius:12px;mso-padding-alt:0;
                text-align:center;min-width:160px;">
        <!--[if mso]><i style="letter-spacing:25px;mso-font-width:-100%;mso-text-raise:30pt">&nbsp;</i><![endif]-->
        ${label}
        <!--[if mso]><i style="letter-spacing:25px;mso-font-width:-100%">&nbsp;</i><![endif]-->
      </a>
    </td>
  </tr>
</table>`;
}

/** Fallback plain-text link shown below the button */
function fallbackLink(href) {
  return `
<p style="margin:20px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <span style="color:#666666;font-size:12px;">Buton çalışmıyorsa bu adresi kopyalayıp tarayıcına yapıştır:</span><br />
  <a href="${href}" style="color:#6366f1;font-size:12px;word-break:break-all;">${href}</a>
</p>`;
}

/** Section divider */
function divider() {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;">
  <tr><td style="border-top:1px solid #2a2a2a;"></td></tr>
</table>`;
}

// ─── E-posta Doğrulama ────────────────────────────────────────────────────────

/**
 * Sends the account verification e-mail sent right after registration.
 * @param {string} verifyUrl
 */
function verifyEmailHtml(verifyUrl) {
  return emailWrapper(
    `
    <h2 style="margin:0 0 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
               color:#ffffff;font-size:22px;font-weight:800;line-height:1.3;">
      E-posta adresini doğrula
    </h2>
    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
              color:#aaaaaa;font-size:14px;line-height:1.7;">
      Slaytim'e hoş geldin! Hesabını aktifleştirmek ve slayt paylaşmaya başlamak
      için aşağıdaki butona tıkla.
    </p>
    ${primaryButton(verifyUrl, 'E-posta Adresimi Doğrula')}
    ${fallbackLink(verifyUrl)}
    <p style="margin:20px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
              color:#555555;font-size:12px;">
      Bu link <strong style="color:#777777;">24 saat</strong> geçerlidir.
      Doğrulama yapmak istemiyorsan bu e-postayı silebilirsin.
    </p>`,
    { preview: 'Hesabını aktifleştirmek için e-posta adresini doğrula.' },
  );
}

// ─── Şifre Sıfırlama ─────────────────────────────────────────────────────────

/**
 * @param {string} resetUrl
 */
function resetPasswordHtml(resetUrl) {
  return emailWrapper(
    `
    <h2 style="margin:0 0 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
               color:#ffffff;font-size:22px;font-weight:800;line-height:1.3;">
      Şifre Sıfırlama
    </h2>
    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
              color:#aaaaaa;font-size:14px;line-height:1.7;">
      Slaytim hesabın için şifre sıfırlama talebinde bulundun.<br />
      Aşağıdaki butona tıklayarak yeni şifreni belirleyebilirsin.
    </p>
    ${primaryButton(resetUrl, 'Şifremi Sıfırla')}
    ${fallbackLink(resetUrl)}
    <p style="margin:20px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
              color:#555555;font-size:12px;">
      Bu link <strong style="color:#777777;">30 dakika</strong> geçerlidir.
      Bu talebi sen yapmadıysan şifreni değiştirmeyi düşünebilirsin.
    </p>`,
    { preview: 'Slaytim hesabın için şifre sıfırlama bağlantısı.' },
  );
}

// ─── Magic Link / OTP ─────────────────────────────────────────────────────────

/**
 * @param {string}      magicUrl - One-click login URL
 * @param {string|null} code     - 6-digit OTP for cross-device login (null = omit)
 */
function magicLinkHtml(magicUrl, code) {
  const formattedCode = code
    ? `${code.slice(0, 3)}&thinsp;${code.slice(3)}`
    : null;

  const codeSection = formattedCode
    ? `
    ${divider()}
    <p style="margin:20px 0 6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
              color:#aaaaaa;font-size:13px;font-weight:600;
              text-transform:uppercase;letter-spacing:0.6px;">
      Başka bir cihazda mısın?
    </p>
    <p style="margin:0 0 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
              color:#888888;font-size:13px;line-height:1.6;">
      Kodu giriş sayfasındaki &ldquo;Magic Link&rdquo; sekmesine gir.
      15 dakika geçerli, tek kullanımlık.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="background-color:#111111;border:1px solid #333333;border-radius:12px;padding:14px 28px;text-align:center;">
          <span style="font-family:'Courier New',Courier,monospace;font-size:30px;font-weight:800;
                       color:#ffffff;letter-spacing:8px;">
            ${formattedCode}
          </span>
        </td>
      </tr>
    </table>`
    : '';

  return emailWrapper(
    `
    <h2 style="margin:0 0 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
               color:#ffffff;font-size:22px;font-weight:800;line-height:1.3;">
      Giriş Bağlantısı
    </h2>
    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
              color:#aaaaaa;font-size:14px;line-height:1.7;">
      <strong style="color:#dddddd;">Bu cihazda</strong> giriş yapmak için butona tıkla.<br />
      Bağlantı yalnızca bir kez kullanılabilir.
    </p>
    ${primaryButton(magicUrl, "Slaytim'e Giriş Yap")}
    ${fallbackLink(magicUrl)}
    <p style="margin:20px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
              color:#555555;font-size:12px;">
      Bu link <strong style="color:#777777;">15 dakika</strong> geçerlidir.
    </p>
    ${codeSection}`,
    { preview: "Slaytim'e tek tıkla giriş yap." },
  );
}

// ─── Hoş Geldin E-postası ─────────────────────────────────────────────────────

/**
 * Optional welcome e-mail sent after email verification is confirmed.
 * Call this from verifyEmail handler if you want a post-verification touchpoint.
 *
 * @param {{ username: string }} user
 */
function welcomeHtml({ username }) {
  return emailWrapper(
    `
    <h2 style="margin:0 0 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
               color:#ffffff;font-size:22px;font-weight:800;line-height:1.3;">
      Hoş geldin, ${escapeHtml(username)}! 🎉
    </h2>
    <p style="margin:0 0 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
              color:#aaaaaa;font-size:14px;line-height:1.7;">
      Hesabın doğrulandı. Artık sunumlarını yükleyebilir, konularla paylaşabilir
      ve Slideo akışında keşfedebilirsin.
    </p>

    <!-- Feature list -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
      ${[
        ['📤', 'PPT/PPTX yükle', 'PDF ve thumbnail otomatik oluşur'],
        ['🔍', 'Keşfet', 'Binlerce sunumu kategorilere göre bul'],
        ['▶️', 'Slideo', 'Kısa dikey akışta içerik keşfet'],
      ]
        .map(
          ([emoji, title, desc]) => `
      <tr>
        <td style="padding:8px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="width:36px;font-size:18px;vertical-align:top;">${emoji}</td>
              <td style="vertical-align:top;padding-left:4px;">
                <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
                             font-size:14px;font-weight:700;color:#dddddd;">${title}</span>
                <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
                             font-size:13px;color:#888888;"> — ${desc}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>`,
        )
        .join('')}
    </table>

    ${primaryButton('https://slaytim.com/kesfet', 'Keşfetmeye Başla')}`,
    { preview: `Slaytim'e hoş geldin ${username}! Hesabın hazır.` },
  );
}

// ─── Bildirim E-postası ───────────────────────────────────────────────────────

/**
 * Generic notification e-mail. Used for moderation alerts, follow notifications etc.
 *
 * @param {{ title: string, body: string, ctaLabel?: string, ctaUrl?: string }} opts
 */
function notificationHtml({ title, body, ctaLabel, ctaUrl }) {
  const cta =
    ctaLabel && ctaUrl ? primaryButton(ctaUrl, ctaLabel) : '';

  return emailWrapper(
    `
    <h2 style="margin:0 0 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
               color:#ffffff;font-size:20px;font-weight:800;line-height:1.3;">
      ${escapeHtml(title)}
    </h2>
    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
              color:#aaaaaa;font-size:14px;line-height:1.7;">
      ${escapeHtml(body)}
    </p>
    ${cta}`,
    { preview: title },
  );
}

// ─── Util ─────────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  sendMail,
  // HTML template builders
  verifyEmailHtml,
  resetPasswordHtml,
  magicLinkHtml,
  welcomeHtml,
  notificationHtml,
};
