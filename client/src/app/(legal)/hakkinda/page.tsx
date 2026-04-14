import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hakkında',
  description: 'Slaytim ve Slideo platformu hakkında bilgiler.',
};

export default function AboutPage() {
  return (
    <article className="prose prose-sm max-w-none dark:prose-invert">
      <h1>Hakkında</h1>
      <p>Slaytim, sunumları keşfetmeyi ve kısa formatta paylaşmayı kolaylaştıran bir slide sosyal platformudur.</p>
      <p>Hedefimiz: içerik üreticilerinin slaytlarından hem klasik sunum hem de kısa “Slideo” formatında değer üretmesini sağlamak.</p>
      <h2>Öne Çıkan Özellikler</h2>
      <ul>
        <li>Slide yükleme ve PDF önizleme</li>
        <li>Slayttan Slideo üretimi</li>
        <li>Koleksiyonlar, odalar ve sosyal etkileşimler</li>
        <li>SEO-odaklı içerik keşif mimarisi</li>
      </ul>
    </article>
  );
}
