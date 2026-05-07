/**
 * AppLink — next/link wrapper with prefetch disabled by default.
 *
 * All internal navigation in Slaytim uses AppLink instead of Link to prevent
 * RSC prefetch spam on dynamic/server-rendered routes.
 *
 * Usage: drop-in replacement for <Link> — same props, same behavior,
 * except prefetch defaults to false instead of true.
 */
import Link from 'next/link';
import type { ComponentProps } from 'react';

type AppLinkProps = ComponentProps<typeof Link>;

export default function AppLink({ prefetch = false, ...props }: AppLinkProps) {
  return <Link prefetch={prefetch} {...props} />;
}
