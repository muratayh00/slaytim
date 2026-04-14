'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, MessageCircle, Heart, UserPlus, Layers, X } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { formatDate } from '@/lib/utils';

interface Notification {
  id: number;
  type: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

interface RealtimeEnvelope {
  type: string;
  id?: string;
  createdAt?: string;
  data?: any;
}

const TYPE_ICONS: Record<string, any> = {
  comment: MessageCircle,
  like: Heart,
  follow: UserPlus,
  slide: Layers,
};

// Keep fallback poll aggressive so users do not feel gaps when stream reconnects.
const POLL_ACTIVE = 4000;
const POLL_HIDDEN = 15000;
const SSE_RECONNECT_BASE_MS = 500;
const SSE_RECONNECT_MAX_MS = 5000;
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api').replace(/\/api\/?$/, '');
const logSoftError = (scope: string, err?: unknown) => {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[NotificationBell] ${scope}`, err);
  }
};

export default function NotificationBell() {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [realtimeMode, setRealtimeMode] = useState<'sse' | 'poll' | 'off'>('off');
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const reconnectAttemptRef = useRef(0);
  const manualCloseRef = useRef(false);
  const lastEventIdRef = useRef<string>('0');

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchCount = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/notifications/unread-count');
      setUnread(data.count);
    } catch (err) {
      logSoftError('fetchCount failed', err);
    }
  }, [user]);

  const syncMissedNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/notifications/since', {
        params: { lastEventId: lastEventIdRef.current || '0' },
      });
      const events: RealtimeEnvelope[] = Array.isArray(data?.events) ? data.events : [];
      for (const evt of events) {
        if (!evt) continue;
        if (evt.id) lastEventIdRef.current = String(evt.id);
        if (evt.type === 'notification' && evt.data?.notification) {
          const incoming = evt.data.notification;
          setNotifications((prev) => {
            const deduped = prev.filter((n) => n.id !== incoming.id);
            return [incoming, ...deduped].slice(0, 30);
          });
        }
      }
      if (typeof data?.unread === 'number') setUnread(data.unread);
      if (data?.latestEventId) lastEventIdRef.current = String(data.latestEventId);
    } catch (err) {
      logSoftError('syncMissedNotifications failed', err);
    }
  }, [user]);

  const handleRealtimeEnvelope = useCallback((envelope: RealtimeEnvelope) => {
    const event = String(envelope?.type || '');
    const payload = envelope?.data || {};
    if (envelope?.id) {
      lastEventIdRef.current = String(envelope.id);
    }
    if (event === 'unread_count') {
      setUnread(Number(payload?.count || 0));
      return;
    }
    if (event === 'notification') {
      if (typeof payload?.unread === 'number') setUnread(payload.unread);
      if (payload?.notification) {
        const incoming = payload.notification;
        setNotifications((prev) => {
          const deduped = prev.filter((n) => n.id !== incoming.id);
          return [incoming, ...deduped].slice(0, 30);
        });
      }
    }
  }, []);

  const closeRealtime = useCallback(() => {
    manualCloseRef.current = true;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (sseRef.current) {
      try { sseRef.current.close(); } catch {}
      sseRef.current = null;
    }
    setRealtimeConnected(false);
  }, []);

  const connectSse = useCallback(() => {
    if (!user || manualCloseRef.current) return;
    if (sseRef.current) {
      try { sseRef.current.close(); } catch {}
      sseRef.current = null;
    }

    const stream = new EventSource(`${API_BASE}/api/notifications/stream`, { withCredentials: true });
    sseRef.current = stream;

    stream.addEventListener('unread_count', (ev: MessageEvent) => {
      try {
        handleRealtimeEnvelope(JSON.parse(ev.data || '{}'));
      } catch (err) {
        logSoftError('failed to parse unread_count event', err);
      }
    });
    stream.addEventListener('notification', (ev: MessageEvent) => {
      try {
        handleRealtimeEnvelope(JSON.parse(ev.data || '{}'));
      } catch (err) {
        logSoftError('failed to parse notification event', err);
      }
    });

    stream.onopen = () => {
      reconnectAttemptRef.current = 0;
      setRealtimeConnected(true);
      setRealtimeMode('sse');
      void syncMissedNotifications();
    };

    stream.onerror = () => {
      if (manualCloseRef.current) return;
      try { stream.close(); } catch {}
      sseRef.current = null;
      setRealtimeConnected(false);
      setRealtimeMode('poll');

      const attempt = reconnectAttemptRef.current + 1;
      reconnectAttemptRef.current = attempt;
      const waitMs = Math.min(SSE_RECONNECT_MAX_MS, SSE_RECONNECT_BASE_MS * Math.pow(2, Math.min(4, attempt - 1)));

      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        connectSse();
      }, waitMs);
    };
  }, [handleRealtimeEnvelope, syncMissedNotifications, user]);

  useEffect(() => {
    if (!user) return;

    manualCloseRef.current = false;
    reconnectAttemptRef.current = 0;
    fetchCount();
    syncMissedNotifications();
    connectSse();

    return () => {
      closeRealtime();
      setRealtimeMode('off');
    };
  }, [user, connectSse, closeRealtime, fetchCount, syncMissedNotifications]);

  useEffect(() => {
    if (!user || realtimeConnected) return;
    const schedule = () => {
      const hidden = document.visibilityState === 'hidden';
      timerRef.current = setTimeout(() => {
        fetchCount();
        syncMissedNotifications();
        schedule();
      }, hidden ? POLL_HIDDEN : POLL_ACTIVE);
    };
    schedule();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (timerRef.current) clearTimeout(timerRef.current);
        fetchCount();
        syncMissedNotifications();
        schedule();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user, realtimeConnected, fetchCount, syncMissedNotifications]);

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(async () => {
      try {
        await syncMissedNotifications();
        if (!realtimeConnected) {
          const { data } = await api.get('/notifications');
          setNotifications(data);
          setUnread(data.filter((n: Notification) => !n.isRead).length);
        }
      } catch {}
    }, POLL_ACTIVE);
    return () => clearInterval(interval);
  }, [open, realtimeConnected, syncMissedNotifications]);

  const openPanel = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setLoading(true);
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data);
      if (Array.isArray(data) && data.length > 0) {
        lastEventIdRef.current = String(data[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    await api.patch('/notifications/all/read');
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
  };

  const markOneRead = async (id: number) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnread((c) => Math.max(0, c - 1));
  };

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={openPanel}
        aria-label={`Bildirimler${unread > 0 ? ` (${unread} okunmamis)` : ''}`}
        className="relative w-9 h-9 rounded-xl border border-border bg-card/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
      >
        <Bell className="w-[17px] h-[17px]" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-80 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
              <span className="font-extrabold text-sm">Bildirimler</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground px-1.5">
                  {realtimeConnected ? realtimeMode.toUpperCase() : 'POLL'}
                </span>
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-semibold px-2 py-1 rounded-lg hover:bg-primary/10 transition-all"
                  >
                    <Check className="w-3 h-3" /> Tumunu okundu isaretle
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="skeleton w-8 h-8 rounded-full shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="skeleton h-3 w-full rounded" />
                        <div className="skeleton h-3 w-2/3 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="w-8 h-8 mx-auto text-muted-foreground/20 mb-2" />
                  <p className="text-sm text-muted-foreground font-medium">Henuz bildirim yok</p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const Icon = TYPE_ICONS[notif.type] || Bell;
                  const content = (
                    <div
                      className={`flex gap-3 px-4 py-3 hover:bg-muted/60 transition-colors cursor-pointer ${!notif.isRead ? 'bg-primary/5' : ''}`}
                      onClick={() => !notif.isRead && markOneRead(notif.id)}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!notif.isRead ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs leading-relaxed ${!notif.isRead ? 'font-semibold' : 'text-muted-foreground'}`}>
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(notif.createdAt)}</p>
                      </div>
                      {!notif.isRead && <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />}
                    </div>
                  );

                  return notif.link ? (
                    <Link key={notif.id} href={notif.link}>{content}</Link>
                  ) : (
                    <div key={notif.id}>{content}</div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
