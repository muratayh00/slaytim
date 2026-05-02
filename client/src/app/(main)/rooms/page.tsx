'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, Plus, Lock, Globe, Loader2, Search } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';
import { buildRoomPath } from '@/lib/url';
import EmptyState from '@/components/shared/EmptyState';

type Room = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  isPublic: boolean;
  _count?: { members?: number };
  owner?: { id: number; username: string };
};

export default function RoomsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', isPublic: true, accessPassword: '' });
  const [privateAccess, setPrivateAccess] = useState({ name: '', password: '' });
  const [privateAccessBusy, setPrivateAccessBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const myRoomIds = useMemo(() => new Set(myRooms.map((r) => r.id)), [myRooms]);
  const ownedRoomsCount = useMemo(
    () => myRooms.filter((r) => r.owner?.id === user?.id).length,
    [myRooms, user?.id],
  );

  // Client-side filter — backend also supports ?q= for server-side search
  const filteredRooms = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return rooms;
    return rooms.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q) ||
        (r.owner?.username || '').toLowerCase().includes(q),
    );
  }, [rooms, searchQuery]);

  const navigateSafely = useCallback((path: string) => {
    try {
      router.push(path);
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          const expectedPath = path.split('?')[0];
          if (window.location.pathname !== expectedPath) {
            window.location.assign(path);
          }
        }
      }, 1200);
    } catch {
      if (typeof window !== 'undefined') {
        window.location.assign(path);
      }
    }
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allRes, mineRes] = await Promise.all([
        api.get('/rooms'),
        user ? api.get('/rooms/me') : Promise.resolve({ data: { rooms: [] } }),
      ]);
      setRooms(Array.isArray(allRes?.data?.rooms) ? allRes.data.rooms : []);
      setMyRooms(Array.isArray(mineRes?.data?.rooms) ? mineRes.data.rooms : []);
    } catch {
      toast.error('Odalar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const createRoom = async () => {
    if (!user) return toast.error('Oda oluşturmak için giriş yapmalısın');
    if (!form.name.trim()) return;
    setCreateBusy(true);
    try {
      const { data } = await api.post('/rooms', {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        isPublic: form.isPublic,
        accessPassword: form.isPublic ? undefined : form.accessPassword,
      });
      setForm({ name: '', description: '', isPublic: true, accessPassword: '' });
      setCreateOpen(false);
      toast.success('Oda oluşturuldu');
      if (data?.id) {
        navigateSafely(buildRoomPath(data));
        return;
      }
      await load();
    } catch (err: any) {
      const code = err?.response?.data?.code;
      if (code === 'ROOM_LIMIT_REACHED') {
        const maxRooms = Number(err?.response?.data?.maxRooms || 2);
        toast.error(`Oda limiti doldu. En fazla ${maxRooms} oda acabilirsin.`);
      } else {
        toast.error(err?.response?.data?.error || 'Oda olusturulamadi');
      }
    } finally {
      setCreateBusy(false);
    }
  };

  const followRoom = async (roomId: number, slug?: string) => {
    if (!user) return toast.error('Takip için giriş yapmalısın');
    try {
      await api.post(`/rooms/${slug || roomId}/follow`);
      await load();
      toast.success('Odayı takip etmeye başladın');
    } catch {
      toast.error('Oda takip edilemedi');
    }
  };

  const accessPrivateRoom = async () => {
    if (!user) return toast.error('Kapalı odaya girmek için giriş yapmalısın');
    if (!privateAccess.name.trim() || !privateAccess.password.trim()) {
      return toast.error('Oda adı ve şifre gerekli');
    }
    setPrivateAccessBusy(true);
    try {
      const { data } = await api.post('/rooms/access', {
        name: privateAccess.name.trim(),
        password: privateAccess.password,
      });
      toast.success('Kapalı odaya giriş yapıldı');
      setPrivateAccess({ name: '', password: '' });
      await load();
      if (data?.slug) window.location.href = buildRoomPath({ slug: data.slug });
      else if (data?.roomId) window.location.href = `/rooms/${data.roomId}`;
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Kapalı odaya giriş başarısız');
    } finally {
      setPrivateAccessBusy(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Odalar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Herkese açık odaları keşfet, kapalı odalara şifre ile gir</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Oda ara..."
              className="pl-9 pr-3 py-2 text-sm rounded-xl border border-border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/25 w-48 sm:w-56"
            />
          </div>
          {user && (
            <button
              onClick={() => ownedRoomsCount < 2 && setCreateOpen((s) => !s)}
              disabled={ownedRoomsCount >= 2}
              title={ownedRoomsCount >= 2 ? 'En fazla 2 oda açabilirsin' : undefined}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Oda Aç {ownedRoomsCount > 0 && <span className="text-white/70 font-normal">({ownedRoomsCount}/2)</span>}
            </button>
          )}
        </div>
      </div>

      {createOpen && user && ownedRoomsCount < 2 && (
        <div className="mb-6 border border-border rounded-2xl p-4 bg-card">
          <p className="text-xs text-muted-foreground mb-3">
            Oda limiti: <span className="font-semibold">{ownedRoomsCount}/2</span>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Oda adı"
              className="px-3 py-2 rounded-xl border border-border bg-muted/50 focus:outline-none"
            />
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Açıklama (opsiyonel)"
              className="px-3 py-2 rounded-xl border border-border bg-muted/50 focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
            <label className="text-sm font-medium inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isPublic}
                onChange={(e) => setForm((f) => ({ ...f, isPublic: e.target.checked }))}
              />
              Herkese açık oda
            </label>
            {!form.isPublic && (
              <input
                value={form.accessPassword}
                onChange={(e) => setForm((f) => ({ ...f, accessPassword: e.target.value }))}
                placeholder="Oda şifresi (min 4 karakter)"
                type="password"
                className="px-3 py-2 rounded-xl border border-border bg-muted/50 focus:outline-none text-sm"
              />
            )}
            <button
              onClick={createRoom}
              disabled={createBusy || !form.name.trim() || (!form.isPublic && form.accessPassword.trim().length < 4)}
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-60"
            >
              {createBusy ? 'Oluşturuluyor...' : 'Oluştur'}
            </button>
          </div>
        </div>
      )}

      {user && (
        <div className="mb-6 border border-border rounded-2xl p-4 bg-card">
          <h3 className="font-bold text-sm mb-3">Kapalı Odaya Gir</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={privateAccess.name}
              onChange={(e) => setPrivateAccess((s) => ({ ...s, name: e.target.value }))}
              placeholder="Oda adı"
              className="px-3 py-2 rounded-xl border border-border bg-muted/50 focus:outline-none"
            />
            <input
              value={privateAccess.password}
              onChange={(e) => setPrivateAccess((s) => ({ ...s, password: e.target.value }))}
              placeholder="Şifre"
              type="password"
              className="px-3 py-2 rounded-xl border border-border bg-muted/50 focus:outline-none"
            />
            <button
              onClick={accessPrivateRoom}
              disabled={privateAccessBusy || !privateAccess.name.trim() || !privateAccess.password.trim()}
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-60"
            >
              {privateAccessBusy ? 'Giriliyor...' : 'Odaya Gir'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
          Yükleniyor...
        </div>
      ) : filteredRooms.length === 0 ? (
        searchQuery ? (
          <EmptyState
            icon={Search}
            title={`"${searchQuery}" için oda bulunamadı`}
            description="Farklı bir kelime dene veya tüm odalara göz at."
            primaryAction={{
              label: 'Aramayı Temizle',
              onClick: () => setSearchQuery(''),
            }}
          />
        ) : (
          <EmptyState
            icon={Users}
            title="Henüz herkese açık oda yok"
            description="Ders, ekip veya topluluk odanı oluşturarak ilk sohbeti başlat."
            primaryAction={
              user
                ? {
                    label: 'Oda Oluştur',
                    onClick: () => ownedRoomsCount < 2 && setCreateOpen(true),
                  }
                : { label: 'Giriş Yap', href: '/login' }
            }
            secondaryAction={{
              label: 'Konuları Keşfet',
              href: '/kesfet',
              variant: 'outline',
            }}
          />
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRooms.map((room) => {
            const joined = myRoomIds.has(room.id);
            return (
              <div
                key={room.id}
                className="border border-border rounded-2xl p-4 bg-card hover:border-primary/30 hover:shadow-card-hover hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h2 className="font-bold text-base leading-tight line-clamp-1 flex-1">
                    {room.name}
                  </h2>
                  <span
                    className={`text-[11px] font-semibold px-2 py-1 rounded-full inline-flex items-center gap-1 shrink-0 ${
                      room.isPublic
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400'
                    }`}
                  >
                    {room.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    {room.isPublic ? 'Açık' : 'Gizli'}
                  </span>
                </div>
                {room.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {room.description}
                  </p>
                )}
                <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    <span className="font-semibold text-foreground">
                      {Number(room._count?.members || 0)}
                    </span>
                    üye
                  </span>
                  {room.owner?.username && (
                    <span className="truncate">@{room.owner.username}</span>
                  )}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Link
                    href={buildRoomPath(room)}
                    prefetch={false}
                    className="px-3.5 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors min-h-[40px] inline-flex items-center"
                  >
                    Odayı Aç
                  </Link>
                  {!joined && user && room.isPublic && (
                    <button
                      onClick={() => followRoom(room.id, room.slug)}
                      className="px-3.5 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 min-h-[40px] inline-flex items-center"
                    >
                      Takip Et
                    </button>
                  )}
                  {joined && (
                    <span className="px-3.5 py-2 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-sm font-semibold min-h-[40px] inline-flex items-center">
                      Takiptesin
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
