'use strict';

/**
 * mail.service.js — Slaytim transactional email service (Resend)
 *
 * Provider : Resend  <https://resend.com>
 * From     : hello@slaytim.com  (EMAIL_FROM env)
 *
 * Templates (all table-based, inbox-safe, mobile-first):
 *   verifyEmailHtml(verifyUrl)
 *   resetPasswordHtml(resetUrl)
 *   magicLinkHtml(magicUrl, code?)
 *   welcomeHtml({ username })
 *   notificationHtml({ title, body, ctaLabel?, ctaUrl? })
 *
 * Logging:
 *   [mail] ✓ sent    resendId:re_xxx   to:...  subject:...
 *   [mail] ✗ error   resendError:...   to:...  subject:...
 *   [mail] ~ dev     (no API key — skipped, not thrown)
 */

const { Resend } = require('resend');
const logger = require('../lib/logger');

// ─── Config ───────────────────────────────────────────────────────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const EMAIL_FROM     = process.env.EMAIL_FROM || 'Slaytim <hello@slaytim.com>';
const IS_PROD        = process.env.NODE_ENV === 'production';

let _client = null;
function getClient() {
  if (!_client && RESEND_API_KEY) _client = new Resend(RESEND_API_KEY);
  return _client;
}

// ─── Core sendMail ────────────────────────────────────────────────────────────

/**
 * @param {{ to: string, subject: string, html: string, text?: string }} opts
 */
async function sendMail({ to, subject, html, text }) {
  const client = getClient();

  if (!client) {
    if (IS_PROD) {
      logger.error('[mail] ✗ missing RESEND_API_KEY', { to, subject });
      throw new Error('RESEND_API_KEY is not configured — set it in your production environment.');
    }
    logger.warn('[mail] ~ dev — e-posta gönderilmedi (RESEND_API_KEY yok)', { to, subject });
    return;
  }

  try {
    const { data, error } = await client.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      text: text || htmlToPlainText(html),
    });

    if (error) {
      logger.error('[mail] ✗ Resend API error', { to, subject, resendError: error.message ?? JSON.stringify(error) });
      throw new Error(`Resend error: ${error.message ?? JSON.stringify(error)}`);
    }

    logger.info('[mail] ✓ sent', { to, subject, resendId: data?.id ?? 'unknown' });
  } catch (err) {
    logger.error('[mail] ✗ send failed', { to, subject, message: err.message });
    throw err;
  }
}

// ─── Plain-text extractor ─────────────────────────────────────────────────────

function htmlToPlainText(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&thinsp;/g, ' ').replace(/&zwnj;/g, '').replace(/&mdash;/g, '—')
    .replace(/\s{2,}/g, ' ').trim();
}

// ─── HTML escape ─────────────────────────────────────────────────────────────

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ─────────────────────────────────────────────────────────────────────────────
//  SHARED HTML COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Invisible preheader — controls inbox snippet preview text
 */
function _preheader(text) {
  const padding = '&zwnj;&nbsp;'.repeat(40);
  return `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;font-family:sans-serif;">${esc(text)}${padding}</div>`;
}

/**
 * Logo badge — gradient (CSS) with solid Outlook fallback (VML-free approach)
 * We use background-color on the <td> for Outlook, and background on an inner div for others.
 */
function _logoBadge() {
  return `
              <td style="vertical-align:middle;" width="40">
                <!--[if mso]>
                <table cellpadding="0" cellspacing="0" border="0"><tr>
                <td style="width:40px;height:40px;background-color:#EA580C;border-radius:10px;text-align:center;vertical-align:middle;font-family:Arial,sans-serif;font-size:20px;font-weight:900;color:#ffffff;">S</td>
                </tr></table>
                <![endif]-->
                <!--[if !mso]><!-->
                <div style="width:40px;height:40px;background:linear-gradient(135deg,#C2410C 0%,#FF8C1A 100%);border-radius:10px;text-align:center;line-height:40px;display:inline-block;">
                  <span style="color:#ffffff;font-size:20px;font-weight:900;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;display:inline-block;line-height:40px;vertical-align:middle;">S</span>
                </div>
                <!--<![endif]-->
              </td>`;
}

/**
 * Email card header with logo
 */
function _header() {
  return `
          <!-- Gradient accent stripe -->
          <tr>
            <td height="4" style="background:linear-gradient(90deg,#C2410C 0%,#FF8C1A 100%);font-size:0;line-height:0;mso-line-height-rule:exactly;" bgcolor="#EA580C">&nbsp;</td>
          </tr>
          <!-- Logo header -->
          <tr>
            <td class="header-td" style="padding:24px 48px;background-color:#ffffff;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  ${_logoBadge()}
                  <td style="vertical-align:middle;padding-left:10px;">
                    <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:20px;font-weight:800;color:#111827;letter-spacing:-0.4px;display:inline-block;line-height:1;">slaytim</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Header border -->
          <tr>
            <td height="1" style="background-color:#F3F4F6;font-size:0;line-height:0;mso-line-height-rule:exactly;" bgcolor="#F3F4F6">&nbsp;</td>
          </tr>`;
}

/**
 * Email card footer
 */
function _footer() {
  return `
          <!-- Footer border -->
          <tr>
            <td height="1" style="background-color:#F3F4F6;font-size:0;line-height:0;mso-line-height-rule:exactly;" bgcolor="#F3F4F6">&nbsp;</td>
          </tr>
          <!-- Footer -->
          <tr>
            <td class="footer-td" style="padding:20px 48px 24px;background-color:#F9FAFB;border-radius:0 0 16px 16px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <p style="margin:0 0 6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#9CA3AF;line-height:1.6;">
                      Bu e-posta <a href="https://slaytim.com" style="color:#EA580C;text-decoration:none;font-weight:600;">Slaytim</a> tarafından gönderilmiştir.
                    </p>
                    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#D1D5DB;line-height:1.6;">
                      <a href="https://slaytim.com/gizlilik" style="color:#D1D5DB;text-decoration:none;">Gizlilik Politikası</a>
                      &nbsp;&middot;&nbsp;
                      <a href="https://slaytim.com/kullanim-kosullari" style="color:#D1D5DB;text-decoration:none;">Kullanım Koşulları</a>
                      &nbsp;&middot;&nbsp;
                      <a href="https://slaytim.com/iletisim" style="color:#D1D5DB;text-decoration:none;">İletişim</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

/**
 * Full email wrapper — table-based, Outlook-safe, mobile-first
 */
function _wrap({ title, preheaderText, content }) {
  return `<!DOCTYPE html>
<html lang="tr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${esc(title)}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings>
    <o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch>
  </o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style type="text/css">
    /* Force light mode — prevents Apple Mail dark inversion */
    :root { color-scheme: light only; }
    html, body { margin: 0 !important; padding: 0 !important; background-color: #F3F4F6 !important; }
    /* Reset */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
    /* Mobile */
    @media only screen and (max-width: 620px) {
      .email-card  { width: 100% !important; border-radius: 0 !important; }
      .header-td   { padding: 20px 24px !important; }
      .content-td  { padding: 32px 24px !important; }
      .footer-td   { padding: 20px 24px !important; }
      .btn-table   { width: 100% !important; }
      .btn-a       { display: block !important; text-align: center !important; }
      .fallback-td { padding: 14px 16px !important; }
      .otp-code    { font-size: 38px !important; letter-spacing: 10px !important; }
      h1           { font-size: 22px !important; }
      .feat-col    { display: block !important; width: 100% !important; padding: 0 0 16px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;-webkit-font-smoothing:antialiased;">

  ${_preheader(preheaderText)}

  <!-- Outer -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
         style="background-color:#F3F4F6;padding:40px 16px;">
    <tr>
      <td align="center" valign="top">

        <!-- Card -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0"
               class="email-card"
               style="width:600px;max-width:600px;background-color:#ffffff;border-radius:16px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.07),0 2px 4px -2px rgba(0,0,0,0.05);">
          ${_header()}

          <!-- Content -->
          <tr>
            <td class="content-td" style="padding:40px 48px;background-color:#ffffff;">
              ${content}
            </td>
          </tr>

          ${_footer()}
        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
  <!-- /Outer -->

</body>
</html>`;
}

// ─── Reusable content blocks ─────────────────────────────────────────────────

/**
 * Gradient CTA button — VML for Outlook, CSS gradient for all others
 * @param {string} href
 * @param {string} label
 */
function _btn(href, label) {
  return `
        <!-- CTA Button -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="btn-table" style="margin:32px 0 0;">
          <tr>
            <td align="left">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                href="${href}"
                style="height:50px;v-text-anchor:middle;width:260px;"
                arcsize="12%" stroke="f" fillcolor="#EA580C">
                <w:anchorlock/>
                <center style="color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:15px;font-weight:700;">${esc(label)} &rarr;</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-->
              <a href="${href}" class="btn-a" target="_blank" rel="noopener noreferrer"
                 style="display:inline-block;background:linear-gradient(135deg,#C2410C 0%,#FF8C1A 100%);color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;mso-hide:all;letter-spacing:0.1px;">
                ${esc(label)} →
              </a>
              <!--<![endif]-->
            </td>
          </tr>
        </table>`;
}

/**
 * Copyable fallback URL box (shown below button)
 */
function _fallbackUrl(href) {
  return `
        <!-- Fallback URL -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:20px;">
          <tr>
            <td class="fallback-td" style="padding:14px 18px;background-color:#F9FAFB;border-radius:8px;border:1px solid #E5E7EB;">
              <p style="margin:0 0 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">
                Buton çalışmıyorsa kopyala &amp; yapıştır
              </p>
              <a href="${href}" style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#EA580C;text-decoration:none;word-break:break-all;line-height:1.5;">
                ${href}
              </a>
            </td>
          </tr>
        </table>`;
}

/**
 * Expiry notice — inline, below the fallback URL
 */
function _expiry(text) {
  return `
        <p style="margin:20px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#9CA3AF;line-height:1.6;">
          ⏱ ${esc(text)}
        </p>`;
}

/**
 * Orange left-bordered security/warning box
 */
function _securityBox(text) {
  return `
        <!-- Security notice -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:28px;">
          <tr>
            <td style="padding:14px 18px;background-color:#FFF7ED;border-radius:8px;border-left:4px solid #EA580C;">
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#92400E;line-height:1.7;">
                🔒 ${esc(text)}
              </p>
            </td>
          </tr>
        </table>`;
}

/**
 * Horizontal rule / section divider
 */
function _hr() {
  return `
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:28px 0 0;">
          <tr><td height="1" style="background-color:#F3F4F6;font-size:0;line-height:0;" bgcolor="#F3F4F6">&nbsp;</td></tr>
        </table>`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  1. EMAIL VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sent right after registration.
 * @param {string} verifyUrl
 */
function verifyEmailHtml(verifyUrl) {
  const content = `
        <!-- Badge icon -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr>
            <td style="width:52px;height:52px;background:linear-gradient(135deg,#FFF7ED,#FFEDD5);border-radius:14px;text-align:center;line-height:52px;font-size:26px;" bgcolor="#FFF7ED">
              ✉️
            </td>
          </tr>
        </table>

        <!-- Title -->
        <h1 style="margin:0 0 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:26px;font-weight:800;color:#111827;line-height:1.25;letter-spacing:-0.5px;">
          E-posta adresini doğrula
        </h1>

        <!-- Body -->
        <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;color:#6B7280;line-height:1.75;">
          Slaytim'e hoş geldin! Hesabını aktifleştirmek ve slayt paylaşmaya başlamak için aşağıdaki butona tıkla.
        </p>

        ${_btn(verifyUrl, 'E-posta Adresimi Doğrula')}
        ${_fallbackUrl(verifyUrl)}
        ${_expiry('Bu bağlantı 24 saat içinde geçersiz olacak.')}
        ${_securityBox('Bu isteği sen yapmadıysan bu e-postayı görmezden gel. Slaytim şifreni asla istemez.')}
`;

  return _wrap({
    title: 'E-posta Adresini Doğrula — Slaytim',
    preheaderText: 'Slaytim hesabını aktifleştirmek için e-posta adresini doğrula. Bu link 24 saat geçerlidir.',
    content,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  2. PASSWORD RESET
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {string} resetUrl
 */
function resetPasswordHtml(resetUrl) {
  const content = `
        <!-- Badge icon -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr>
            <td style="width:52px;height:52px;background:linear-gradient(135deg,#FFF7ED,#FFEDD5);border-radius:14px;text-align:center;line-height:52px;font-size:26px;" bgcolor="#FFF7ED">
              🔑
            </td>
          </tr>
        </table>

        <!-- Title -->
        <h1 style="margin:0 0 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:26px;font-weight:800;color:#111827;line-height:1.25;letter-spacing:-0.5px;">
          Şifre Sıfırlama
        </h1>

        <!-- Body -->
        <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;color:#6B7280;line-height:1.75;">
          Slaytim hesabın için şifre sıfırlama talebinde bulundun. Aşağıdaki butona tıklayarak yeni şifreni belirleyebilirsin.
        </p>

        ${_btn(resetUrl, 'Şifremi Sıfırla')}
        ${_fallbackUrl(resetUrl)}
        ${_expiry('Bu bağlantı 30 dakika içinde geçersiz olacak ve yalnızca bir kez kullanılabilir.')}

        ${_hr()}

        <!-- Didn't request this? -->
        <p style="margin:20px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:14px;color:#6B7280;line-height:1.7;">
          Bu isteği sen yapmadıysan hesabına yetkisiz erişim girişimi olmuş olabilir.<br>
          Lütfen hesabını güvende tut ve bu e-postayı görmezden gel — şifren değişmeyecek.
        </p>

        ${_securityBox('Slaytim şifreni asla e-posta ile sormaz. Şüpheli bir durum fark edersen support@slaytim.com adresine bildir.')}
`;

  return _wrap({
    title: 'Şifre Sıfırlama — Slaytim',
    preheaderText: 'Slaytim hesabın için şifre sıfırlama bağlantısı. Bu link 30 dakika geçerlidir.',
    content,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  3. MAGIC LINK / OTP
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One-click login email — button + optional cross-device OTP code.
 * @param {string}      magicUrl - One-click login URL
 * @param {string|null} code     - 6-digit OTP (null = omit code section)
 */
function magicLinkHtml(magicUrl, code) {
  // Format as "123 456" for readability
  const formattedCode = code ? `${code.slice(0, 3)} ${code.slice(3)}` : null;

  const otpSection = formattedCode ? `
        ${_hr()}

        <!-- Cross-device OTP section -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:24px;">
          <tr>
            <td>
              <p style="margin:0 0 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:11px;font-weight:700;color:#EA580C;text-transform:uppercase;letter-spacing:1px;">
                Farklı Bir Cihazda mısın?
              </p>
              <p style="margin:0 0 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:14px;color:#6B7280;line-height:1.7;">
                Giriş sayfasındaki <strong style="color:#374151;">"Magic Link"</strong> sekmesine aşağıdaki kodu gir. Tek kullanımlık, 15 dakika geçerli.
              </p>

              <!-- OTP display -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:18px 28px;background:linear-gradient(135deg,#FFF7ED,#FFEDD5);border-radius:12px;border:1.5px solid #FED7AA;text-align:center;" bgcolor="#FFF7ED">
                    <span class="otp-code" style="font-family:'Courier New',Courier,'Lucida Console',monospace;font-size:44px;font-weight:900;color:#C2410C;letter-spacing:14px;mso-font-width:80%;">
                      ${esc(formattedCode)}
                    </span>
                  </td>
                </tr>
              </table>

              <p style="margin:12px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#9CA3AF;line-height:1.6;">
                Kodu kimseyle paylaşma. Slaytim ekibi bu kodu asla senden istemez.
              </p>
            </td>
          </tr>
        </table>` : '';

  const content = `
        <!-- Badge icon -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr>
            <td style="width:52px;height:52px;background:linear-gradient(135deg,#FFF7ED,#FFEDD5);border-radius:14px;text-align:center;line-height:52px;font-size:26px;" bgcolor="#FFF7ED">
              ⚡️
            </td>
          </tr>
        </table>

        <!-- Title -->
        <h1 style="margin:0 0 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:26px;font-weight:800;color:#111827;line-height:1.25;letter-spacing:-0.5px;">
          Giriş Bağlantısı
        </h1>

        <!-- Body -->
        <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;color:#6B7280;line-height:1.75;">
          <strong style="color:#374151;">Bu cihazda</strong> giriş yapmak için aşağıdaki butona tıkla. Bağlantı yalnızca bir kez kullanılabilir.
        </p>

        ${_btn(magicUrl, "Slaytim'e Giriş Yap")}
        ${_fallbackUrl(magicUrl)}
        ${_expiry('Bu bağlantı 15 dakika içinde geçersiz olacak ve yalnızca bir kez çalışır.')}
        ${otpSection}
        ${_securityBox("Bu isteği sen yapmadıysan bu e-postayı görmezden gel — hesabın güvende. Slaytim şifreni veya bu kodu asla istemez.")}
`;

  return _wrap({
    title: "Slaytim'e Giriş — Magic Link",
    preheaderText: "Slaytim'e tek tıkla giriş yap. Bu link 15 dakika geçerli, bir kez kullanılabilir.",
    content,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  4. WELCOME EMAIL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sent after email verification is confirmed.
 * @param {{ username: string }} user
 */
function welcomeHtml({ username }) {
  const features = [
    {
      emoji: '📤',
      title: 'Slayt Yükle',
      desc: 'PPT/PPTX dosyalarını yükle, PDF ve thumbnail otomatik oluştur.',
    },
    {
      emoji: '🔍',
      title: 'Keşfet',
      desc: 'Binlerce sunumu kategorilere göre ara ve bul.',
    },
    {
      emoji: '▶️',
      title: 'Slideo',
      desc: 'TikTok tarzı dikey akışta kısa slayt içerikleri izle.',
    },
  ];

  const featureCols = features.map(({ emoji, title, desc }) => `
                <td class="feat-col" style="width:33.33%;vertical-align:top;padding:0 8px;" valign="top">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="padding:16px;background-color:#F9FAFB;border-radius:12px;border:1px solid #F3F4F6;text-align:center;" align="center">
                        <div style="font-size:28px;line-height:1;margin-bottom:8px;">${emoji}</div>
                        <p style="margin:0 0 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:13px;font-weight:700;color:#111827;">${esc(title)}</p>
                        <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#9CA3AF;line-height:1.5;">${esc(desc)}</p>
                      </td>
                    </tr>
                  </table>
                </td>`).join('');

  const content = `
        <!-- Gradient welcome banner -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
          <tr>
            <td style="padding:24px;background:linear-gradient(135deg,#C2410C 0%,#FF8C1A 100%);border-radius:12px;text-align:center;" bgcolor="#EA580C">
              <p style="margin:0 0 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
                Hoş geldin, ${esc(username)}! 🎉
              </p>
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:14px;color:rgba(255,255,255,0.85);line-height:1.6;">
                Hesabın doğrulandı. Slaytim'e artık tam erişimin var.
              </p>
            </td>
          </tr>
        </table>

        <!-- Intro text -->
        <h1 style="margin:0 0 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:22px;font-weight:800;color:#111827;line-height:1.3;letter-spacing:-0.3px;">
          Neler yapabilirsin?
        </h1>
        <p style="margin:0 0 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;color:#6B7280;line-height:1.75;">
          Slaytim'de sunumlarını paylaşabilir, topluluktan içerik keşfedebilir ve Slideo akışında görünür olabilirsin.
        </p>

        <!-- Feature cards (3-col) -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:8px;">
          <tr style="margin:0 -8px;">
            ${featureCols}
          </tr>
        </table>

        ${_btn('https://slaytim.com/kesfet', 'Keşfetmeye Başla')}

        ${_hr()}

        <!-- Quick tips -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:24px;">
          <tr>
            <td>
              <p style="margin:0 0 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">
                Hızlı Başlangıç
              </p>
              ${[
                ['1.', 'Profilini tamamla', '/settings', 'Fotoğraf ve bio ekle'],
                ['2.', 'İlk slaytını yükle', '/upload', 'PPT/PPTX dosyaları kabul edilir'],
                ['3.', 'Toplulukla paylaş', '/kesfet', 'Konulara bağlayarak keşfet'],
              ].map(([num, label, href, hint]) => `
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:8px;">
                <tr>
                  <td style="width:24px;vertical-align:top;padding-top:1px;">
                    <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:13px;font-weight:800;color:#EA580C;">${esc(num)}</span>
                  </td>
                  <td style="vertical-align:top;padding-left:8px;">
                    <a href="https://slaytim.com${href}" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:14px;font-weight:600;color:#111827;text-decoration:none;">${esc(label)}</a>
                    <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:13px;color:#9CA3AF;"> — ${esc(hint)}</span>
                  </td>
                </tr>
              </table>`).join('')}
            </td>
          </tr>
        </table>

        ${_securityBox('Hesap güvenliğin için: güçlü bir şifre seç ve şifreni kimseyle paylaşma.')}
`;

  return _wrap({
    title: `Slaytim'e Hoş Geldin, ${username}!`,
    preheaderText: `Hoş geldin ${username}! Hesabın doğrulandı — keşfetmeye başla.`,
    content,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  5. GENERIC NOTIFICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generic notification (moderation alerts, follow notifications, etc.)
 * @param {{ title: string, body: string, ctaLabel?: string, ctaUrl?: string }} opts
 */
function notificationHtml({ title, body, ctaLabel, ctaUrl }) {
  const cta = ctaLabel && ctaUrl ? _btn(ctaUrl, ctaLabel) : '';

  const content = `
        <!-- Badge icon -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr>
            <td style="width:52px;height:52px;background:linear-gradient(135deg,#FFF7ED,#FFEDD5);border-radius:14px;text-align:center;line-height:52px;font-size:26px;" bgcolor="#FFF7ED">
              🔔
            </td>
          </tr>
        </table>

        <h1 style="margin:0 0 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:24px;font-weight:800;color:#111827;line-height:1.3;letter-spacing:-0.4px;">
          ${esc(title)}
        </h1>
        <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;color:#6B7280;line-height:1.75;">
          ${esc(body)}
        </p>
        ${cta}
`;

  return _wrap({
    title: `${title} — Slaytim`,
    preheaderText: title,
    content,
  });
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  sendMail,
  verifyEmailHtml,
  resetPasswordHtml,
  magicLinkHtml,
  welcomeHtml,
  notificationHtml,
};
