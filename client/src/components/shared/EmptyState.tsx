'use client';

import Link from 'next/link';
import { Sparkles, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Action = {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'outline';
};

type Props = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  primaryAction?: Action;
  secondaryAction?: Action;
  /** Override outer container classes (e.g. dark slideo bg). */
  className?: string;
  /** Override icon color/size classes. */
  iconClassName?: string;
  /** Tighter padding for inline section empties. */
  compact?: boolean;
  /** When the parent is forced-dark (e.g. /slideo black bg), use light text. */
  tone?: 'default' | 'dark';
};

/**
 * Reusable empty-state block.
 *
 * Default container: dashed border, rounded-2xl, centered.  Pass `className`
 * to override (e.g. transparent dark variant for /slideo).  Buttons render as
 * <Link> when `href` is provided, otherwise <button>.
 */
export default function EmptyState({
  icon: Icon = Sparkles,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
  iconClassName,
  compact = false,
  tone = 'default',
}: Props) {
  const isDark = tone === 'dark';
  return (
    <div
      className={cn(
        'w-full flex flex-col items-center justify-center text-center',
        'border-2 border-dashed border-border rounded-2xl bg-card/40',
        compact ? 'py-10 px-5' : 'py-16 px-6',
        className,
      )}
    >
      <div
        className={cn(
          'w-14 h-14 rounded-2xl flex items-center justify-center mb-4',
          isDark ? 'bg-white/5' : 'bg-muted/60',
        )}
      >
        <Icon
          className={cn(
            'w-7 h-7',
            isDark ? 'text-white/70' : 'text-muted-foreground/50',
            iconClassName,
          )}
          strokeWidth={1.5}
        />
      </div>
      <h3
        className={cn(
          'text-lg sm:text-xl font-semibold mb-1.5',
          isDark ? 'text-white' : 'text-foreground',
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={cn(
            'text-sm max-w-md mx-auto leading-relaxed',
            isDark ? 'text-white/70' : 'text-muted-foreground',
          )}
        >
          {description}
        </p>
      )}
      {(primaryAction || secondaryAction) && (
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto justify-center">
          {primaryAction && <ActionButton action={primaryAction} variant="primary" />}
          {secondaryAction && <ActionButton action={secondaryAction} variant="outline" />}
        </div>
      )}
    </div>
  );
}

function ActionButton({ action, variant }: { action: Action; variant: 'primary' | 'outline' }) {
  const v = action.variant ?? variant;
  const base =
    'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors min-h-[44px] w-full sm:w-auto';
  const styles =
    v === 'primary'
      ? 'bg-primary text-white hover:opacity-90'
      : 'border border-border bg-background text-foreground hover:bg-muted';

  if (action.href) {
    return (
      <Link href={action.href} className={cn(base, styles)} prefetch={false}>
        {action.label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={action.onClick} className={cn(base, styles)}>
      {action.label}
    </button>
  );
}
