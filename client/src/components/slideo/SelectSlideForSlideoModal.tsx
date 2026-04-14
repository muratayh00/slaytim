'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Play, Search, X } from 'lucide-react';
import api from '@/lib/api';
import CreateSlideoModal from '@/components/slideo/CreateSlideoModal';
import { resolveFileUrl } from '@/lib/pdfRenderer';

interface MySlide {
  id: number;
  title: string;
  conversionStatus: string;
  pdfUrl?: string | null;
  thumbnailUrl?: string | null;
  topic?: { id: number; title: string; slug?: string | null } | null;
}

interface Props {
  onClose: () => void;
  onCreated?: () => void;
}

export default function SelectSlideForSlideoModal({ onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(true);
  const [slides, setSlides] = useState<MySlide[]>([]);
  const [query, setQuery] = useState('');
  const [selectedSlide, setSelectedSlide] = useState<MySlide | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/slides/my?onlyDone=true');
        if (!cancelled) setSlides(Array.isArray(data?.slides) ? data.slides : []);
      } catch {
        if (!cancelled) setSlides([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSlides = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return slides;
    return slides.filter((s) => `${s.title} ${s.topic?.title || ''}`.toLowerCase().includes(q));
  }, [slides, query]);

  if (selectedSlide) {
    return (
      <CreateSlideoModal
        slide={{
          id: selectedSlide.id,
          title: selectedSlide.title,
          conversionStatus: selectedSlide.conversionStatus,
          pdfUrl: selectedSlide.pdfUrl || null,
        }}
        onClose={() => setSelectedSlide(null)}
        onCreated={onCreated}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-lg shadow-card w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-semibold text-base flex items-center gap-2">
              <Play className="w-4 h-4 text-primary" fill="currentColor" />
              Slideo Oluştur
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Mevcut slaytlarından birini seç, ardından 3-7 sayfa belirle
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 border-b border-border shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Slayt ara..."
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : filteredSlides.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground text-center">
              Slideo için hazır (PDF dönüşümü tamamlanmış) slayt bulunamadı.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AnimatePresence>
                {filteredSlides.map((s) => (
                  <motion.button
                    key={s.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    onClick={() => setSelectedSlide(s)}
                    className="text-left border border-border rounded-xl overflow-hidden bg-muted/20 hover:border-primary/50 hover:bg-muted/40 transition-colors"
                  >
                    <div className="h-28 bg-black/60 flex items-center justify-center">
                      {s.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={resolveFileUrl(s.thumbnailUrl)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Play className="w-5 h-5 text-white/40" fill="currentColor" />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold line-clamp-2">{s.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{s.topic?.title || 'Konu yok'}</p>
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
