/**
 * shareUrl — cross-browser share + clipboard utility
 *
 * Priority:
 *   1. Web Share API (mobile native sheet)
 *   2. Clipboard API (modern desktop/mobile)
 *   3. execCommand('copy') (deprecated but wide fallback)
 *   4. Returns { copied: false, url } so the caller can show the URL in UI
 */
export async function shareUrl(
  url: string,
  title: string,
): Promise<{ ok: boolean; userCancelled?: boolean; url: string }> {
  // 1. Native share (mobile)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, url });
      return { ok: true, url };
    } catch (e: any) {
      if (e?.name === 'AbortError') return { ok: false, userCancelled: true, url };
      // Non-cancel error → fall through to clipboard
    }
  }

  // 2. Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(url);
      return { ok: true, url };
    } catch {
      // blocked → try execCommand
    }
  }

  // 3. execCommand fallback (deprecated)
  try {
    const el = document.createElement('textarea');
    el.value = url;
    el.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;pointer-events:none';
    document.body.appendChild(el);
    el.focus();
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    if (ok) return { ok: true, url };
  } catch { /* ignore */ }

  // 4. All methods failed — caller should show the URL in visible UI
  return { ok: false, url };
}
