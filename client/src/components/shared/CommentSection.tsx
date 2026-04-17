'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, Send, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media';
import { useAuthStore } from '@/store/auth';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { buildProfilePath } from '@/lib/url';

const AVATAR_COLORS = [
  'from-indigo-500 to-violet-500',
  'from-violet-500 to-purple-500',
  'from-blue-500 to-indigo-500',
  'from-emerald-500 to-teal-500',
  'from-rose-500 to-pink-500',
  'from-amber-500 to-orange-500',
];

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  user: { id: number; username: string; avatarUrl?: string };
}

export default function CommentSection({ topicId }: { topicId: number }) {
  const { user } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/comments/topic/${topicId}`)
      .then((r) => setComments(r.data))
      .catch((err) => { console.error('[CommentSection] fetch failed:', err); })
      .finally(() => setLoading(false));
  }, [topicId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/comments/topic/${topicId}`, { content: text.trim() });
      setComments((prev) => [...prev, data]);
      setText('');
    } catch {
      toast.error('Yorum gönderilemedi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/comments/${id}`);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch {
      toast.error('Yorum silinemedi');
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/60 flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-primary" />
        <h3 className="font-extrabold text-sm">
          Yorumlar
          {comments.length > 0 && (
            <span className="ml-1.5 text-xs font-bold text-muted-foreground">({comments.length})</span>
          )}
        </h3>
      </div>

      <div className="p-6">
        {/* Comment input */}
        {user ? (
          <form onSubmit={handleSubmit} className="flex gap-3 mb-6">
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${AVATAR_COLORS[user.id % AVATAR_COLORS.length]} flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5`}>
              {user.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Yorum yaz..."
                maxLength={500}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
              <button
                type="submit"
                disabled={submitting || !text.trim()}
                className="px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all shadow-button disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-6 p-4 rounded-xl bg-muted/60 text-sm text-muted-foreground text-center border border-border/50">
            Yorum yapmak için{' '}
            <Link href="/login" className="text-primary font-bold hover:underline">giriş yap</Link>
            {' '}veya{' '}
            <Link href="/register" className="text-primary font-bold hover:underline">kayıt ol</Link>
          </div>
        )}

        {/* Comment list */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 skeleton rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3 w-24 rounded" />
                  <div className="skeleton h-4 w-full rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="w-10 h-10 mx-auto mb-2 text-muted-foreground/20" />
            <p className="text-sm font-medium">Henüz yorum yok</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">İlk yorumu sen yap!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => {
              const gradient = AVATAR_COLORS[comment.user.id % AVATAR_COLORS.length];
              const isOwn = user?.id === comment.user.id;
              return (
                <div key={comment.id} className="flex gap-3 group">
                    <Link href={`${buildProfilePath(comment.user.username)}`} className="shrink-0">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-xs font-bold text-white overflow-hidden relative`}>
                        {comment.user.username.slice(0, 2).toUpperCase()}
                        {resolveMediaUrl(comment.user.avatarUrl) && (
                          <img src={resolveMediaUrl(comment.user.avatarUrl)!} alt={comment.user.username}
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                        )}
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <Link href={`${buildProfilePath(comment.user.username)}`} className="text-xs font-bold hover:text-primary transition-colors">
                          @{comment.user.username}
                        </Link>
                        <span className="text-[10px] text-muted-foreground">{formatDate(comment.createdAt)}</span>
                      </div>
                      <p className="text-sm text-foreground mt-0.5 leading-relaxed">{comment.content}</p>
                    </div>
                    {isOwn && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="shrink-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 text-muted-foreground transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

