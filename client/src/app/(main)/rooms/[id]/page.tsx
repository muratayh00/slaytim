'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Users, Crown, Lock, Globe, Share2, Plus, Send, Loader2, MessageCircle, Trash2, Settings } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';
import { buildRoomPath, buildTopicCreatePath, buildTopicPath } from '@/lib/url';
import { getApiOrigin } from '@/lib/api-origin';

type RoomMessage = {
  id: number;
  content: string;
  createdAt: string;
  user: {
    id: number;
    username: string;
    avatarUrl?: string | null;
  };
};

const API_ORIGIN = getApiOrigin();

const formatMessageTime = (value: string | null | undefined) => {
  if (!value) return '--:--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
};

export default function RoomDetailPage() {
  const { id } = useParams();
  // URL segment can be a slug (e.g. "benim-odam") or a legacy numeric ID.
  // Backend resolves both. We keep it as a string for API calls.
  const roomSlug = String(id || '').trim();
  const { user } = useAuthStore();

  const [room, setRoom] = useState<any>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);

  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [olderLoading, setOlderLoading] = useState(false);
  const [nextBeforeId, setNextBeforeId] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [messageBusy, setMessageBusy] = useState(false);
  const [streamMode, setStreamMode] = useState<'off' | 'sse' | 'poll'>('off');
  const [onlineCount, setOnlineCount] = useState(0);

  const listEndRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);

  // Numeric ID from loaded room data (used for topic creation path)
  const numericRoomId: number | null = room?.id ? Number(room.id) : null;

  const isMember = useMemo(() => {
    if (!user || !room?.members) return Boolean(room?.viewerIsMember);
    return room.members.some((m: any) => m.user?.id === user.id);
  }, [user, room]);

  const isOwner = room?.owner?.id === user?.id;

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 0);
  }, []);

  const mergeMessages = useCallback((incoming: RoomMessage[]) => {
    setMessages((prev) => {
      const map = new Map<number, RoomMessage>();
      for (const item of prev) map.set(item.id, item);
      for (const item of incoming) map.set(item.id, item);
      return [...map.values()].sort((a, b) => a.id - b.id);
    });
  }, []);

  const loadMessages = useCallback(async () => {
    if (!roomSlug || !user || !isMember) return;
    setMessagesLoading(true);
    try {
      const { data } = await api.get(`/rooms/${roomSlug}/messages?limit=60`);
      const rows = Array.isArray(data?.messages) ? data.messages : [];
      setMessages(rows);
      setNextBeforeId(data?.nextBeforeId ?? null);
      setHasMore(Boolean(data?.hasMore));
      if (rows.length > 0) scrollToBottom();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Mesajlar yüklenemedi');
    } finally {
      setMessagesLoading(false);
    }
  }, [roomSlug, user, isMember, scrollToBottom]);

  const loadOlderMessages = useCallback(async () => {
    if (!roomSlug || !nextBeforeId || olderLoading) return;
    setOlderLoading(true);
    try {
      const { data } = await api.get(`/rooms/${roomSlug}/messages?limit=40&beforeId=${nextBeforeId}`);
      const rows = Array.isArray(data?.messages) ? data.messages : [];
      setMessages((prev) => {
        const map = new Map<number, RoomMessage>();
        for (const m of rows) map.set(m.id, m);
        for (const m of prev) map.set(m.id, m);
        return [...map.values()].sort((a, b) => a.id - b.id);
      });
      setNextBeforeId(data?.nextBeforeId ?? null);
      setHasMore(Boolean(data?.hasMore));
    } catch {
      toast.error('Eski mesajlar yüklenemedi');
    } finally {
      setOlderLoading(false);
    }
  }, [roomSlug, nextBeforeId, olderLoading]);

  const closeRealtime = useCallback(() => {
    if (streamRef.current) {
      try { streamRef.current.close(); } catch {}
      streamRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    setStreamMode('off');
  }, []);

  const connectRealtime = useCallback(() => {
    if (!user || !isMember || !roomSlug) return;

    if (streamRef.current) {
      try { streamRef.current.close(); } catch {}
      streamRef.current = null;
    }

    const url = `${API_ORIGIN}/api/rooms/${roomSlug}/messages/stream`;
    const stream = new EventSource(url, { withCredentials: true });
    streamRef.current = stream;

    stream.addEventListener('ready', (ev: MessageEvent) => {
      reconnectAttemptRef.current = 0;
      setStreamMode('sse');
      try {
        const payload = JSON.parse(ev.data || '{}');
        if (typeof payload?.onlineCount === 'number') setOnlineCount(payload.onlineCount);
      } catch {}
    });

    stream.addEventListener('presence', (ev: MessageEvent) => {
      try {
        const payload = JSON.parse(ev.data || '{}');
        if (typeof payload?.onlineCount === 'number') setOnlineCount(payload.onlineCount);
      } catch {}
    });

    stream.addEventListener('room_message', (ev: MessageEvent) => {
      try {
        const payload = JSON.parse(ev.data || '{}');
        if (payload?.message?.id) {
          mergeMessages([payload.message]);
          scrollToBottom();
        }
      } catch {}
    });

    stream.onerror = () => {
      try { stream.close(); } catch {}
      streamRef.current = null;
      setStreamMode('poll');
      reconnectAttemptRef.current += 1;
      const waitMs = Math.min(5000, 400 * (2 ** Math.min(5, reconnectAttemptRef.current - 1)));
      reconnectTimerRef.current = setTimeout(() => {
        if (document.visibilityState === 'hidden') {
          reconnectTimerRef.current = setTimeout(connectRealtime, 1500);
          return;
        }
        connectRealtime();
      }, waitMs);
    };
  }, [isMember, mergeMessages, roomSlug, scrollToBottom, user]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/rooms/${roomSlug}`);
      setRoom(data);

      const resolvedId = data?.id;
      if (data?.isPublic || data?.viewerIsMember || (Array.isArray(data?.members) && data.members.length > 0)) {
        try {
          const topicsRes = await api.get(`/topics?roomId=${resolvedId}&sort=latest&page=1&limit=30`);
          setTopics(Array.isArray(topicsRes?.data?.topics) ? topicsRes.data.topics : []);
        } catch {
          setTopics([]);
        }
      } else {
        setTopics([]);
      }
    } catch {
      setRoom(null);
      setTopics([]);
    } finally {
      setLoading(false);
    }
  }, [roomSlug]);

  useEffect(() => {
    if (!roomSlug) {
      setLoading(false);
      setRoom(null);
      return;
    }
    load();
  }, [load, roomSlug, user]);

  useEffect(() => {
    if (!isMember) {
      closeRealtime();
      setMessages([]);
      return;
    }
    loadMessages();
    connectRealtime();

    return () => {
      closeRealtime();
    };
  }, [isMember, loadMessages, connectRealtime, closeRealtime]);

  const follow = async () => {
    if (!user) return toast.error('Takip etmek için giriş yapmalısın');
    setPasswordBusy(true);
    try {
      if (!room?.isPublic) {
        if (!password.trim()) return toast.error('Bu oda şifre korumalı');
        await api.post(`/rooms/${roomSlug}/join`, { password });
      } else {
        await api.post(`/rooms/${roomSlug}/follow`);
      }
      await load();
      setPassword('');
      toast.success('Odaya giriş yapıldı');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Katılınamadı');
    } finally {
      setPasswordBusy(false);
    }
  };

  const leave = async () => {
    if (!user) return;
    if (isOwner) return toast.error('Kurucu odadan ayrılamaz');
    try {
      await api.post(`/rooms/${roomSlug}/unfollow`);
      await load();
      toast.success('Odadan ayrıldın');
    } catch {
      toast.error('Ayrılma başarısız');
    }
  };

  const deleteRoom = async () => {
    if (!confirm(`"${room?.name}" odasını kalıcı olarak silmek istediğine emin misin? Tüm mesajlar silinecek.`)) return;
    try {
      await api.delete(`/rooms/${roomSlug}`);
      toast.success('Oda silindi');
      window.location.href = '/rooms';
    } catch {
      toast.error('Oda silinemedi');
    }
  };

  const deleteMessage = async (messageId: number) => {
    try {
      await api.delete(`/rooms/${roomSlug}/messages/${messageId}`);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch {
      toast.error('Mesaj silinemedi');
    }
  };

  const shareRoom = async () => {
    const slug = room?.slug || roomSlug;
    const url = `${window.location.origin}${buildRoomPath({ slug })}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Oda linki kopyalandı');
    } catch {
      toast.error('Link kopyalanamadı');
    }
  };

  const sendMessage = async () => {
    if (!isMember || !user) return;
    const text = messageText.trim();
    if (!text) return;
    setMessageBusy(true);
    try {
      const { data } = await api.post(`/rooms/${roomSlug}/messages`, { content: text });
      if (data?.message?.id) {
        mergeMessages([data.message]);
        setMessageText('');
        scrollToBottom();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Mesaj gönderilemedi');
    } finally {
      setMessageBusy(false);
    }
  };

  if (loading) return <div className="max-w-5xl mx-auto px-4 py-8 text-muted-foreground">Yükleniyor...</div>;
  if (!room) return <div className="max-w-5xl mx-auto px-4 py-8 text-muted-foreground">Oda bulunamadı veya erişimin yok.</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/rooms" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-5">
        <ArrowLeft className="w-4 h-4" /> Odalara Dön
      </Link>

      <div className="border border-border rounded-2xl p-6 bg-card mb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{room.name}</h1>
            {room.description && <p className="text-sm text-muted-foreground mt-2">{room.description}</p>}
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-muted inline-flex items-center gap-1">
            {room.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            {room.isPublic ? 'Açık Oda' : 'Gizli Oda'}
          </span>
        </div>

        <div className="mt-4 text-sm text-muted-foreground inline-flex items-center gap-2">
          <Users className="w-4 h-4" />
          {Number(room._count?.members || 0)} üye
        </div>

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          {!isMember && user && (
            <>
              {!room.isPublic && (
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Oda şifresi"
                  type="password"
                  className="px-3 py-2 rounded-xl border border-border bg-muted/50 focus:outline-none text-sm"
                />
              )}
              <button
                onClick={follow}
                className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold"
                disabled={passwordBusy || (!room.isPublic && !password.trim())}
              >
                {room.isPublic ? 'Takip Et' : 'Şifre ile Gir'}
              </button>
            </>
          )}
          {isMember && !isOwner && (
            <button onClick={leave} className="px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted">
              Ayrıl
            </button>
          )}
          <button onClick={shareRoom} className="px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted inline-flex items-center gap-2">
            <Share2 className="w-4 h-4" /> Odayı Paylaş
          </button>
          {isMember && (
            <Link href={buildTopicCreatePath(numericRoomId ?? undefined)} className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Bu Odada Konu Aç
            </Link>
          )}
          {isOwner && (
            <button
              onClick={deleteRoom}
              className="px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/5 text-red-600 text-sm font-semibold hover:bg-red-500/10 inline-flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Odayı Sil
            </button>
          )}
        </div>
      </div>

      {room.requiresPassword && !isMember ? (
        <div className="border border-border rounded-2xl p-5 bg-card text-sm text-muted-foreground">
          Bu oda şifre korumalı. Katılmak için oda şifresini girip "Şifre ile Gir" butonunu kullan.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 space-y-5">
            <div className="border border-border rounded-2xl p-5 bg-card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold">Oda Konuları</h2>
                {isMember && <span className="text-xs text-muted-foreground">Konuya girip alttan slayt yükleyebilirsin</span>}
              </div>
              {topics.length === 0 ? (
                <div className="text-sm text-muted-foreground py-2">Bu odada henüz konu yok.</div>
              ) : (
                <div className="space-y-2">
                  {topics.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between py-2 border-b border-border/60 last:border-b-0">
                      <div>
                        <div className="text-sm font-semibold">{t.title}</div>
                        <div className="text-xs text-muted-foreground">{Number(t?._count?.slides || 0)} slayt</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={buildTopicPath({ id: t.id, slug: t.slug, title: t.title })} className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted">
                          Konuya Git
                        </Link>
                        {isMember && (
                          <Link href={buildTopicPath({ id: t.id, slug: t.slug, title: t.title })} className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold">
                            Slayt Yükle
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border border-border rounded-2xl p-5 bg-card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold">Üyeler <span className="text-muted-foreground font-normal text-sm">({room._count?.members || 0})</span></h2>
              </div>
              {Array.isArray(room.members) && room.members.length > 5 && (
                <MemberSearch members={room.members} />
              )}
              {Array.isArray(room.members) && room.members.length <= 5 && (
                <div className="space-y-2">
                  {room.members.map((m: any) => (
                    <div key={m.user?.id} className="flex items-center justify-between py-2 border-b border-border/60 last:border-b-0">
                      <div className="text-sm font-medium">{m.user?.username || 'Kullanıcı'}</div>
                      <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                        {m.role === 'owner' && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                        {m.role}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="xl:col-span-1">
            <div className="border border-border rounded-2xl p-4 bg-card h-[620px] flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold inline-flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-primary" />
                  Oda Sohbeti
                </h2>
                <div className="flex items-center gap-2">
                  {/* Online presence indicator */}
                  {streamMode === 'sse' && onlineCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {onlineCount} çevrimiçi
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    {streamMode === 'sse' ? 'Canlı' : streamMode === 'poll' ? 'Bağlanıyor...' : 'Kapalı'}
                  </span>
                </div>
              </div>

              {!isMember ? (
                <div className="flex-1 rounded-xl border border-dashed border-border flex items-center justify-center text-center text-sm text-muted-foreground px-3">
                  Sohbeti görmek ve yazmak için önce odaya katılmalısın.
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto rounded-xl border border-border/70 bg-muted/20 p-3 space-y-2">
                    {/* Load older messages */}
                    {hasMore && !messagesLoading && (
                      <div className="flex justify-center pb-1">
                        <button
                          onClick={loadOlderMessages}
                          disabled={olderLoading}
                          className="text-[11px] text-primary hover:underline disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          {olderLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          {olderLoading ? 'Yükleniyor...' : 'Daha eski mesajları göster'}
                        </button>
                      </div>
                    )}
                    {messagesLoading ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-center text-xs text-muted-foreground px-3">
                        Henüz mesaj yok. İlk mesajı sen gönder.
                      </div>
                    ) : (
                      messages.map((m) => {
                        const mine = m.user?.id === user?.id;
                        const canDelete = mine || isOwner;
                        return (
                          <div key={m.id} className={`group flex ${mine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${mine ? 'bg-primary text-white' : 'bg-card border border-border'}`}>
                              <div className={`flex items-center justify-between gap-2 mb-1 ${mine ? 'text-white/90' : 'text-foreground'}`}>
                                <span className="font-semibold">{m.user?.username || 'Kullanıcı'}</span>
                                {canDelete && (
                                  <button
                                    onClick={() => deleteMessage(m.id)}
                                    className={`opacity-0 group-hover:opacity-100 transition-opacity ${mine ? 'text-white/60 hover:text-white' : 'text-muted-foreground hover:text-red-500'}`}
                                    title="Mesajı sil"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <p className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
                              <div className={`mt-1 text-[10px] ${mine ? 'text-white/70' : 'text-muted-foreground'}`}>
                                {formatMessageTime(m.createdAt)}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={listEndRef} />
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (!messageBusy && messageText.trim()) void sendMessage();
                        }
                      }}
                      placeholder="Mesaj yaz..."
                      maxLength={1500}
                      className="flex-1 px-3 py-2 text-sm rounded-xl border border-border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/25"
                    />
                    <button
                      type="button"
                      onClick={() => void sendMessage()}
                      disabled={messageBusy || !messageText.trim()}
                      className="px-3 py-2 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      {messageBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MemberSearch({ members }: { members: any[] }) {
  const [q, setQ] = useState('');
  const filtered = q.trim()
    ? members.filter((m) => m.user?.username?.toLowerCase().includes(q.toLowerCase()))
    : members;

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Üye ara..."
        className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-muted/40 focus:outline-none mb-2"
      />
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Üye bulunamadı</p>
        ) : (
          filtered.map((m: any) => (
            <div key={m.user?.id} className="flex items-center justify-between py-1.5 border-b border-border/60 last:border-b-0">
              <div className="text-sm font-medium">{m.user?.username || 'Kullanıcı'}</div>
              <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                {m.role === 'owner' && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                {m.role}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
