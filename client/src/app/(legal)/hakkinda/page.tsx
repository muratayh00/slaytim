import type { Metadata } from 'next';
import { Presentation, Play, Layers, Users, Search, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Hakkında | Slaytim',
  description: 'Slaytim — sunumları keşfetmeyi ve kısa formatta paylaşmayı kolaylaştıran Türkiye\'nin slayt platformu.',
  alternates: { canonical: 'https://slaytim.com/hakkinda' },
};

export default function AboutPage() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shrink-0">
          <Presentation className="w-6 h-6 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">Slaytim Hakkında</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Türkiye'nin slayt keşif ve paylaşım platformu</p>
        </div>
      </div>

      {/* Mission */}
      <section className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-3">
        <h2 className="font-bold text-base text-foreground">Misyonumuz</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Slaytim, sunumları keşfetmeyi ve kısa formatta paylaşmayı kolaylaştıran bir slide sosyal platformudur.
          Hedefimiz; içerik üreticilerinin slaytlarından hem klasik sunum hem de kısa <strong className="text-foreground">"Slideo"</strong> formatında
          değer üretmesini sağlamaktır.
        </p>
      </section>

      {/* Features */}
      <section className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-4">
        <h2 className="font-bold text-base text-foreground">Öne Çıkan Özellikler</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { icon: <Layers className="w-4 h-4 text-primary" />, title: 'Slayt Yükleme', desc: 'PDF ve PowerPoint formatlarını yükle, önizle, paylaş.' },
            { icon: <Play className="w-4 h-4 text-primary" />, title: 'Slideo Formatı', desc: 'Slaytından 3-7 sayfa seçerek kısa, dikey video benzeri içerik oluştur.' },
            { icon: <Users className="w-4 h-4 text-primary" />, title: 'Sosyal Etkileşim', desc: 'Koleksiyonlar, odalar, beğeniler, yorumlar ve takip sistemi.' },
            { icon: <Search className="w-4 h-4 text-primary" />, title: 'Keşif Motoru', desc: 'Kategoriler, konular ve etiketlerle içerik keşfet.' },
            { icon: <Zap className="w-4 h-4 text-primary" />, title: 'Hızlı Önizleme', desc: 'WebP tabanlı sayfa önizlemeleri ile anında yüklenen slaytlar.' },
            { icon: <Presentation className="w-4 h-4 text-primary" />, title: 'SEO-Odaklı', desc: 'Her slayt ve konu için optimize edilmiş URL ve metadata.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-muted/20">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">{icon}</div>
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-3">
        <h2 className="font-bold text-base text-foreground">Değerlerimiz</h2>
        <ul className="space-y-2">
          {[
            ['Açıklık', 'Kullanıcıların içerik üzerinde tam kontrole sahip olduğu şeffaf bir platform.'],
            ['Gizlilik Önce', 'Kişisel veriler yalnızca hizmetin işletilmesi için minimum ölçüde işlenir.'],
            ['Kalite', 'İçerik moderasyonu ile kaliteli ve güvenilir bir ekosistem.'],
          ].map(([val, desc]) => (
            <li key={val} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/60">
              <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">{val}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
