import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kullanım Koşulları',
  description: 'Slaytim kullanım koşulları ve topluluk kuralları.',
};

export default function TermsPage() {
  return (
    <article className="prose prose-sm max-w-none dark:prose-invert">
      <h1>Kullanım Koşulları</h1>
      <p>Son güncelleme: 12 Nisan 2026</p>
      <h2>1. Hizmet Kullanımı</h2>
      <p>Slaytim’e yüklenen içeriklerden kullanıcı sorumludur. Telif ihlali, zararlı yazılım veya yasa dışı içerik paylaşımı yasaktır.</p>
      <h2>2. Hesap Güvenliği</h2>
      <p>Hesap bilgilerinizi korumak sizin sorumluluğunuzdadır. Şüpheli kullanım durumunda destek ekibine bildirim yapabilirsiniz.</p>
      <h2>3. İçerik Moderasyonu</h2>
      <p>Platform, raporlanan içerikleri inceleme ve gerekli durumlarda görünürlüğü kısıtlama/silme hakkını saklı tutar.</p>
      <h2>4. Hizmet Sürekliliği</h2>
      <p>Bakım, güvenlik veya altyapı gereksinimleri nedeniyle geçici kesintiler yaşanabilir.</p>
      <h2>5. İletişim</h2>
      <p>Kullanım koşullarıyla ilgili sorular için <a href="/iletisim">İletişim</a> sayfasını kullanın.</p>
    </article>
  );
}
