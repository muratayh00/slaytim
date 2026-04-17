'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, Bookmark, ArrowUpRight, Presentation, Lock, Eye } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { resolveFileUrl } from '@/lib/pdfRenderer';
import { buildSlidePath } from '@/lib/url';

const AVATAR_COLORS = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500'];

interface SlideCardProps {
  slide: {
    id: number;
    slug?: string | null;
    title: string;
    description?: string | null;
    fileUrl: string;
    thumbnailUrl?: string | null;
    likesCount: number;
    savesCount: number;
    viewsCount?: number;
    createdAt: string;
    user: { id: number; username: string; avatarUrl?: string | null };
    topic?: { id: number; title: string };
  };
}

export default function SlideCard({ slide }: SlideCardProps) {
  const { user } = useAuthStore();
  const avatarColor = AVATAR_COLORS[slide.user.id % AVATAR_COLORS.length];
  const fileExt = slide.fileUrl?.split('.').pop()?.toUpperCase() ?? 'PPTX';
  const [thumbError, setThumbError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const thumbSrc = resolveFileUrl(slide.thumbnailUrl || '');
  const avatarSrc = resolveFileUrl(slide.user.avatarUrl || '');

  return (
    <Link href={buildSlidePath(slide)} className="block group" prefetch={false}>
      <article className="bg-card border border-border rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-all card-hover">
        <div className="aspect-video relative overflow-hidden bg-muted border-b border-border/60">
          {slide.thumbnailUrl && !thumbError ? (
            // Plain <img> avoids the Next.js image-optimizer round-trip.
            // Thumbnails are already small server-side images; optimizer adds
            // latency and a failure point without meaningful quality gain here.
            <img
              src={thumbSrc}
              alt={slide.title}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              onError={() => setThumbError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Presentation className="w-7 h-7" strokeWidth={1.8} />
              <span className="text-[10px] font-semibold tracking-wide">{fileExt}</span>
            </div>
          )}

          {!user && (
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/70 text-white rounded-md px-2 py-1">
              <Lock className="w-3 h-3" />
              <span className="text-[10px] font-semibold">Uye ol</span>
            </div>
          )}
        </div>

        <div className="p-3.5">
          <h3 className="font-semibold text-[13.5px] leading-snug mb-1 line-clamp-2 group-hover:text-primary transition-colors">
            {slide.title}
          </h3>
          {slide.description && (
            <p className="text-[11.5px] text-muted-foreground leading-relaxed line-clamp-2">
              {slide.description}
            </p>
          )}
          {slide.topic?.title && (
            <div className="mt-2">
              <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                #{slide.topic.title}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-border/60">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-5 h-5 rounded-full ${avatarColor} flex items-center justify-center text-[8px] font-black text-white overflow-hidden shrink-0 relative`}>
                {slide.user.username.slice(0, 1).toUpperCase()}
                {slide.user.avatarUrl && !avatarError && (
                  <img
                    src={avatarSrc}
                    alt={slide.user.username}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                )}
              </div>
              <span className="text-[11.5px] text-muted-foreground font-medium truncate">{slide.user.username}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground shrink-0">
              <span className="flex items-center gap-1"><Heart className="w-3 h-3" strokeWidth={2} />{slide.likesCount}</span>
              <span className="flex items-center gap-1"><Bookmark className="w-3 h-3" strokeWidth={2} />{slide.savesCount}</span>
              {slide.viewsCount !== undefined && <span className="flex items-center gap-1"><Eye className="w-3 h-3" strokeWidth={2} />{slide.viewsCount}</span>}
              <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
