'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, Eye, Layers, ArrowUpRight } from 'lucide-react';
import { formatRelative } from '@/lib/utils';
import { buildTopicPath } from '@/lib/url';
import { resolveMediaUrl } from '@/lib/media';

interface TopicCardProps {
  topic: {
    id: number;
    slug?: string;
    title: string;
    description?: string | null;
    likesCount: number;
    viewsCount: number;
    createdAt: string;
    user: { id: number; username: string; avatarUrl?: string | null };
    category: { name: string; slug: string };
    _count?: { slides: number };
  };
}

const AVATAR_COLORS = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500'];

export default function TopicCard({ topic }: TopicCardProps) {
  const avatarColor = AVATAR_COLORS[topic.user.id % AVATAR_COLORS.length];
  const href = buildTopicPath(topic);

  return (
    <Link href={href} className="block group">
      <article className="bg-card border border-border rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-all card-hover">
        <div className="px-4 py-3 border-b border-border/60 bg-muted/30 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            {topic.category.name}
          </span>
          {topic._count !== undefined && (
            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {topic._count.slides} slayt
            </span>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <div className={`w-6 h-6 rounded-full ${avatarColor} flex items-center justify-center text-[9px] font-black text-white shrink-0 overflow-hidden relative`}>
              {resolveMediaUrl(topic.user.avatarUrl)
                ? <Image src={resolveMediaUrl(topic.user.avatarUrl)!} alt={topic.user.username} fill sizes="24px" className="object-cover" />
                : topic.user.username.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-[12px] font-medium text-muted-foreground truncate">{topic.user.username}</span>
            <span className="text-[11px] text-muted-foreground/70 ml-auto shrink-0">{formatRelative(topic.createdAt)}</span>
          </div>

          <h3 className="font-semibold text-[15px] leading-snug mb-1.5 line-clamp-2 group-hover:text-primary transition-colors">
            {topic.title}
          </h3>

          {topic.description && (
            <p className="text-[12.5px] text-muted-foreground line-clamp-2 leading-relaxed">
              {topic.description}
            </p>
          )}

          <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-border/60">
            <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" strokeWidth={2} />
                <span className="font-medium">{topic.likesCount}</span>
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" strokeWidth={2} />
                <span className="font-medium">{topic.viewsCount}</span>
              </span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
          </div>
        </div>
      </article>
    </Link>
  );
}
