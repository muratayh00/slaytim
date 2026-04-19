'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Loader2, PlusCircle, HelpCircle } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

type FlashcardQuestion = {
  id: number;
  prompt: string;
  options: string[];
  explanation?: string | null;
};

type FlashcardSet = {
  id: number;
  title: string;
  mode: 'two' | 'four';
  isPublished: boolean;
  questions: FlashcardQuestion[];
};

type Props = {
  slideId: number;
  isOwner: boolean;
  sets: FlashcardSet[];
  onRefresh: () => Promise<void>;
};

const emptyQuestion = (mode: 'two' | 'four') => ({
  prompt: '',
  options: mode === 'two' ? ['', ''] : ['', '', '', ''],
  correctOption: 0,
  explanation: '',
});

export default function SlideFlashcardsPanel({ slideId, isOwner, sets, onRefresh }: Props) {
  const [selectedSetId, setSelectedSetId] = useState<number | null>(sets[0]?.id ?? null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; percent: number } | null>(null);

  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<'two' | 'four'>('four');
  const [questions, setQuestions] = useState([emptyQuestion('four')]);

  const selectedSet = useMemo(
    () => sets.find((s) => s.id === selectedSetId) || sets[0] || null,
    [selectedSetId, sets],
  );

  const updateMode = (next: 'two' | 'four') => {
    setMode(next);
    setQuestions((prev) =>
      prev.map((q) => ({
        ...q,
        options: next === 'two' ? [q.options[0] || '', q.options[1] || ''] : [q.options[0] || '', q.options[1] || '', q.options[2] || '', q.options[3] || ''],
        correctOption: Math.min(q.correctOption, next === 'two' ? 1 : 3),
      })),
    );
  };

  const addQuestion = () => setQuestions((prev) => [...prev, emptyQuestion(mode)]);

  const saveSet = async () => {
    if (!title.trim()) return toast.error('Set başlığı gerekli');
    if (!questions.length) return toast.error('En az 1 soru gerekli');
    setSaving(true);
    try {
      await api.post(`/flashcards/slide/${slideId}`, {
        title: title.trim(),
        mode,
        isPublished: true,
        questions: questions.map((q) => ({
          prompt: q.prompt,
          options: q.options,
          correctOption: q.correctOption,
          explanation: q.explanation,
        })),
      });
      toast.success('Flashcard set oluşturuldu');
      setCreating(false);
      setTitle('');
      setQuestions([emptyQuestion(mode)]);
      await onRefresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Set oluşturulamadı');
    } finally {
      setSaving(false);
    }
  };

  const submitQuiz = async () => {
    if (!selectedSet) return;
    setSubmitting(true);
    try {
      const payload = {
        answers: Object.entries(answers).map(([questionId, answerIndex]) => ({
          questionId: Number(questionId),
          answerIndex,
        })),
      };
      const { data } = await api.post(`/flashcards/${selectedSet.id}/submit`, payload);
      setResult({ score: data.score, total: data.total, percent: data.percent });
      toast.success(`Skor: ${data.score}/${data.total}`);
    } catch {
      toast.error('Sınav gönderilemedi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-8 border border-border rounded-2xl p-4 sm:p-5 bg-card">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <h3 className="text-[15px] font-extrabold">Flashcard ve Mini Sınav</h3>
          <p className="text-xs text-muted-foreground">Bu slayt için 2 veya 4 şıklı quiz çöz.</p>
        </div>
        {isOwner && (
          <button
            onClick={() => setCreating((v) => !v)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            {creating ? 'Kapat' : 'Set Oluştur'}
          </button>
        )}
      </div>

      {creating && isOwner && (
        <div className="mb-5 p-4 rounded-xl border border-border bg-muted/20 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Set başlığı"
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={() => updateMode('two')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${mode === 'two' ? 'bg-primary/10 text-primary border-primary/30' : 'border-border'}`}
            >
              2 Şık
            </button>
            <button
              onClick={() => updateMode('four')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${mode === 'four' ? 'bg-primary/10 text-primary border-primary/30' : 'border-border'}`}
            >
              4 Şık
            </button>
          </div>

          <div className="space-y-3">
            {questions.map((q, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-border bg-background space-y-2">
                <input
                  value={q.prompt}
                  onChange={(e) => {
                    const next = [...questions];
                    next[idx].prompt = e.target.value;
                    setQuestions(next);
                  }}
                  placeholder={`Soru ${idx + 1}`}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                />
                {q.options.map((opt, optIndex) => (
                  <div key={optIndex} className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={q.correctOption === optIndex}
                      onChange={() => {
                        const next = [...questions];
                        next[idx].correctOption = optIndex;
                        setQuestions(next);
                      }}
                    />
                    <input
                      value={opt}
                      onChange={(e) => {
                        const next = [...questions];
                        next[idx].options[optIndex] = e.target.value;
                        setQuestions(next);
                      }}
                      placeholder={`Seçenek ${optIndex + 1}`}
                      className="flex-1 px-3 py-2 rounded-lg border border-border text-sm"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={addQuestion} className="px-3 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">
              + Soru Ekle
            </button>
            <button
              onClick={saveSet}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-60 transition-colors inline-flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Kaydet
            </button>
          </div>
        </div>
      )}

      {!sets.length ? (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <HelpCircle className="w-4 h-4" />
          Henüz flashcard seti yok.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {sets.map((set) => (
              <button
                key={set.id}
                onClick={() => {
                  setSelectedSetId(set.id);
                  setAnswers({});
                  setResult(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                  selectedSet?.id === set.id
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'border-border hover:bg-muted'
                }`}
              >
                {set.title} ({set.mode === 'two' ? '2' : '4'} şık)
              </button>
            ))}
          </div>

          {selectedSet && (
            <div className="space-y-3">
              {selectedSet.questions.map((q, idx) => (
                <div key={q.id} className="p-3 rounded-xl border border-border bg-background">
                  <p className="text-sm font-semibold mb-2">
                    {idx + 1}. {q.prompt}
                  </p>
                  <div className="space-y-1.5">
                    {q.options.map((opt, i) => (
                      <label key={i} className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          checked={answers[q.id] === i}
                          onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: i }))}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={submitQuiz}
              disabled={submitting || !selectedSet}
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-60 inline-flex items-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Sınavı Bitir
            </button>
            {result && (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
                {result.score}/{result.total} ({result.percent}%)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
