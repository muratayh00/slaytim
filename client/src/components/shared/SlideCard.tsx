'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Heart, Bookmark, ArrowUpRight, Presentation, Lock, Eye } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { resolveMediaUrl } from '@/lib/media';
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
    isSponsored?: boolean;
    sponsorName?: string | null;
    createdAt: string;
    user: { id: number; username: string; avatarUrl?: string | null };
    topic?: { id: number; title: string };
  };
  /** Set true for the first visible card on the page to hint fetchpriority=high */
  priority?: boolean;
}

export default function SlideCard({ slide, priority = false }: SlideCardProps) {
  const { user } = useAuthStore();
  const avatarColor = AVATAR_COLORS[slide.user.id % AVATAR_COLORS.length];
  const fileExt = slide.fileUrl?.split('.').pop()?.toUpperCase() || 'PPTX';
  const [thumbError, setThumbError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const href = buildSlidePath(slide);
  const thumbSrc = resolveMediaUrl(slide.thumbnailUrl);
  const avatarSrc = resolveMediaUrl(slide.user.avatarUrl);

  return (
    <a href={href} className="block group">
      <article className="bg-card border border-border rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-all card-hover">
        {/* Thumbnail — next/image for automatic WebP/AVIF conversion, correct
            srcset, and fetchpriority=high on the LCP element. The fill mode
            fills the aspect-video container without a hard-coded width/height. */}
        <div className="aspect-video relative overflow-hidden bg-muted border-b border-border/60">
          {slide.isSponsored && (
            <div className="absolute top-2 left-2 z-10 rounded-md bg-amber-500/90 px-2 py-1 text-[10px] font-bold text-white">
              Sponsorlu
            </div>
          )}
          {thumbSrc && !thumbError ? (
            <Image
              src={thumbSrc}
              alt={slide.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover"
              loading={priority ? 'eager' : 'lazy'}
              priority={priority}
              onError={() => setThumbError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Presentation className="w-7 h-7" strokeWidth={1.8} />
              <span className="text-[10px] font-semibold tracking-wide">{fileExt}</span>
            </div>
          )}

          {!user && (
            <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 bg-black/70 text-white rounded-md px-2 py-1">
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
          {slide.isSponsored && (
            <p className="mt-2 text-[10px] text-amber-600 font-semibold">
              Sponsor: {slide.sponsorName || 'Is Birligi'}
            </p>
          )}

          <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-border/60">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-5 h-5 rounded-full ${avatarColor} flex items-center justify-center text-[8px] font-black text-white overflow-hidden shrink-0 relative`}>
                {slide.user.username.slice(0, 1).toUpperCase()}
                {avatarSrc && !avatarError && (
                  <Image
                    src={avatarSrc}
                    alt={slide.user.username}
                    fill
                    className="object-cover"
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
    </a>
  );
}
