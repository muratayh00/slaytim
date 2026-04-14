'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, X, Send, Loader2, Check } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const TYPES = [
  { key: 'feature', label: 'Özellik İsteği' },
  { key: 'bug', label: 'Hata Bildirimi' },
  { key: 'general', label: 'Genel' },
] as const;

type FeedbackType = typeof TYPES[number]['key'];

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>('general');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      await api.post('/feedback', { type, message });
      setSent(true);
      setTimeout(() => {
        setOpen(false);
        setSent(false);
        setMessage('');
        setType('general');
      }, 2200);
    } catch {
      toast.error('Gönderilemedi, tekrar dene');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        className="fixed bottom-6 left-6 z-40 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-border shadow-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/30 hover:shadow-xl transition-all"
      >
        <MessageSquarePlus className="w-4 h-4 shrink-0" />
        Geri Bildirim
      </motion.button>

      {/* Popup panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-[4.5rem] left-6 z-50 w-72 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <MessageSquarePlus className="w-4 h-4 text-primary" />
                <h4 className="font-extrabold text-sm">Geri Bildirim</h4>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-4">
              {sent ? (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center gap-2 py-5 text-center"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Check className="w-5 h-5 text-emerald-500" />
                  </div>
                  <p className="font-bold text-sm">Teşekkürler!</p>
                  <p className="text-xs text-muted-foreground">Geri bildirimin alındı.</p>
                </motion.div>
              ) : (
                <>
                  {/* Type selector */}
                  <div className="flex gap-1.5 mb-3 flex-wrap">
                    {TYPES.map(t => (
                      <button
                        key={t.key}
                        onClick={() => setType(t.key)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all',
                          type === t.key
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Message */}
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(); }}
                    placeholder={
                      type === 'feature' ? 'Hangi özelliği eklemek istersin?' :
                      type === 'bug'     ? 'Hangi hatayı gördün? Nasıl tetiklendi?' :
                                           'Ne düşünüyorsun? Her şeyi yazabilirsin.'
                    }
                    maxLength={1000}
                    className="w-full h-24 px-3 py-2.5 text-sm rounded-xl border border-border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 resize-none transition-all leading-relaxed"
                  />
                  <div className="flex items-center justify-between mt-1.5 mb-3">
                    <span className="text-[10px] text-muted-foreground/60">{message.length}/1000</span>
                    <span className="text-[10px] text-muted-foreground/50">Ctrl+Enter ile gönder</span>
                  </div>

                  {/* Submit */}
                  <button
                    onClick={submit}
                    disabled={sending || !message.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-40"
                  >
                    {sending
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Send className="w-4 h-4" />
                    }
                    Gönder
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
