'use client';

import { useState, useRef } from 'react';
import { Share2, Copy, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { shareUrl } from '@/lib/shareUrl';

interface Props {
  url: string;
  title: string;
  /** Optional: called after a successful share/copy for analytics */
  onShared?: () => void;
  className?: string;
}

/**
 * SlideoShareButton
 *
 * Standalone share button for the /slideo/[id] detail page.
 * Uses shareUrl utility (Web Share API → Clipboard → execCommand).
 * When all methods fail, shows the URL in a visible copy-able input so the
 * user is never left without a way to get the link.
 */
export default function SlideoShareButton({ url, title, onShared, className }: Props) {
  const [showFallback, setShowFallback] = useState(false);
  const [justCopied, setJustCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleShare = async () => {
    const result = await shareUrl(url, title);

    if (result.userCancelled) return;

    if (result.ok) {
      onShared?.();
      toast.success('Link kopyalandı');
    } else {
      // All copy methods failed — show the URL so user can copy manually
      setShowFallback(true);
      setTimeout(() => inputRef.current?.select(), 50);
    }
  };

  const handleManualCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      inputRef.current?.select();
    }
    setJustCopied(true);
    onShared?.();
    toast.success('Link kopyalandı');
    setTimeout(() => setJustCopied(false), 2000);
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-bold hover:bg-accent transition-colors"
      >
        <Share2 className="w-4 h-4" />
        Paylaş
      </button>

      {showFallback && (
        <div className="mt-3 rounded-xl border border-border bg-muted/50 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground">Linki kopyalayın</p>
            <button
              type="button"
              onClick={() => setShowFallback(false)}
              className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              readOnly
              value={url}
              onFocus={(e) => e.target.select()}
              className="flex-1 min-w-0 px-3 py-1.5 text-xs rounded-lg border border-border bg-background font-mono truncate focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
            <button
              type="button"
              onClick={handleManualCopy}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-accent transition-colors"
              title="Kopyala"
            >
              {justCopied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
