'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Users, Plus, Lock, Globe, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';

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
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', isPublic: true, accessPassword: '' });
  const [privateAccess, setPrivateAccess] = useState({ name: '', password: '' });
  const [privateAccessBusy, setPrivateAccessBusy] = useState(false);

  const myRoomIds = useMemo(() => new Set(myRooms.map((r) => r.id)), [myRooms]);

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
      toast.error('Odalar yuklenemedi');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const createRoom = async () => {
    if (!user) return toast.error('Oda olusturmak icin giris yapmalisin');
    if (!form.name.trim()) return;
    setCreateBusy(true);
    try {
      await api.post('/rooms', {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        isPublic: form.isPublic,
        accessPassword: form.isPublic ? undefined : form.accessPassword,
      });
      setForm({ name: '', description: '', isPublic: true, accessPassword: '' });
      setCreateOpen(false);
      await load();
      toast.success('Oda olusturuldu');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Oda olusturulamadi');
    } finally {
      setCreateBusy(false);
    }
  };

  const followRoom = async (roomId: number) => {
    if (!user) return toast.error('Takip icin giris yapmalisin');
    try {
      await api.post(`/rooms/${roomId}/follow`);
      await load();
      toast.success('Odayi takip etmeye basladin');
    } catch {
      toast.error('Oda takip edilemedi');
    }
  };

  const accessPrivateRoom = async () => {
    if (!user) return toast.error('Kapali odaya girmek icin giris yapmalisin');
    if (!privateAccess.name.trim() || !privateAccess.password.trim()) {
      return toast.error('Oda adi ve sifre gerekli');
    }
    setPrivateAccessBusy(true);
    try {
      const { data } = await api.post('/rooms/access', {
        name: privateAccess.name.trim(),
        password: privateAccess.password,
      });
      toast.success('Kapali odaya giris yapildi');
      setPrivateAccess({ name: '', password: '' });
      await load();
      if (data?.roomId) window.location.href = `/rooms/${data.roomId}`;
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Kapali odaya giris basarisiz');
    } finally {
      setPrivateAccessBusy(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Odalar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Herkese acik odalari kesfet, kapali odalara sifre ile gir</p>
        </div>
        {user && (
          <button
            onClick={() => setCreateOpen((s) => !s)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Oda Ac
          </button>
        )}
      </div>

      {createOpen && user && (
        <div className="mb-6 border border-border rounded-2xl p-4 bg-card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Oda adi"
              className="px-3 py-2 rounded-xl border border-border bg-muted/50 focus:outline-none"
            />
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Aciklama (opsiyonel)"
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
              Herkese acik oda
            </label>
            {!form.isPublic && (
              <input
                value={form.accessPassword}
                onChange={(e) => setForm((f) => ({ ...f, accessPassword: e.target.value }))}
                placeholder="Oda sifresi (min 4 karakter)"
                type="password"
                className="px-3 py-2 rounded-xl border border-border bg-muted/50 focus:outline-none text-sm"
              />
            )}
            <button
              onClick={createRoom}
              disabled={createBusy || !form.name.trim() || (!form.isPublic && form.accessPassword.trim().length < 4)}
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-60"
            >
              {createBusy ? 'Olusturuluyor...' : 'Olustur'}
            </button>
          </div>
        </div>
      )}

      {user && (
        <div className="mb-6 border border-border rounded-2xl p-4 bg-card">
          <h3 className="font-bold text-sm mb-3">Kapali Odaya Gir</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={privateAccess.name}
              onChange={(e) => setPrivateAccess((s) => ({ ...s, name: e.target.value }))}
              placeholder="Oda adi"
              className="px-3 py-2 rounded-xl border border-border bg-muted/50 focus:outline-none"
            />
            <input
              value={privateAccess.password}
              onChange={(e) => setPrivateAccess((s) => ({ ...s, password: e.target.value }))}
              placeholder="Sifre"
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
          Yukleniyor...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rooms.map((room) => {
            const joined = myRoomIds.has(room.id);
            return (
              <div key={room.id} className="border border-border rounded-2xl p-4 bg-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-base">{room.name}</h2>
                    {room.description && <p className="text-sm text-muted-foreground mt-1">{room.description}</p>}
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-muted inline-flex items-center gap-1">
                    {room.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    {room.isPublic ? 'Acik' : 'Gizli'}
                  </span>
                </div>
                <div className="mt-3 text-xs text-muted-foreground flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {Number(room._count?.members || 0)} uye
                  </span>
                  {room.owner?.username && <span>Kurucu: {room.owner.username}</span>}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Link
                    href={`/rooms/${room.id}`}
                    className="px-3 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
                  >
                    Odayi Ac
                  </Link>
                  {!joined && user && room.isPublic && (
                    <button
                      onClick={() => followRoom(room.id)}
                      className="px-3 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90"
                    >
                      Takip Et
                    </button>
                  )}
                  {joined && (
                    <span className="px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 text-sm font-semibold">
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
