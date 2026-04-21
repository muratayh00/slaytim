import type { Metadata } from 'next';
import Link from 'next/link';
import { Eye, Lock, Database, Users, Clock, Mail, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Gizlilik Politikası | Slaytim',
  description:
    "Slaytim'in kişisel veri işleme ilkeleri, veri güvenliği uygulamaları ve kullanıcı hakları hakkında gizlilik politikası.",
  alternates: { canonical: 'https://slaytim.com/gizlilik' },
};

const LAST_UPDATED = '21 Nisan 2026';

export default function GizlilikPage() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <Eye className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">Gizlilik Politikası</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Son güncelleme: {LAST_UPDATED}</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-4">
        Bu politika, <strong className="text-foreground">slaytim.com</strong> hizmetlerini kullanırken kişisel verilerinizin
        nasıl toplandığını, işlendiğini ve korunduğunu açıklamaktadır. Sitemizi kullanarak bu politikayı kabul etmiş sayılırsınız.
      </p>

      {/* Section 1 */}
      <Section icon={<Database className="w-5 h-5 text-primary" />} title="1. Topladığımız Bilgiler">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">Doğrudan Sağladığınız Bilgiler</p>
            <ul className="space-y-1.5">
              {[
                ['Hesap bilgileri', 'Kullanıcı adı, e-posta adresi, şifre (hashed)'],
                ['Profil bilgileri', 'Biyografi, avatar görseli'],
                ['İçerik', 'Yüklediğiniz slaytlar, yorumlarınız, konu başlıklarınız'],
                ['İletişim', 'Bize gönderdiğiniz geri bildirim ve destek talepleri'],
              ].map(([label, val]) => (
                <li key={label} className="flex items-start gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <span><strong className="text-foreground">{label}:</strong> <span className="text-muted-foreground">{val}</span></span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">Otomatik Olarak Toplanan Bilgiler</p>
            <ul className="space-y-1.5">
              {[
                'IP adresi ve tarayıcı bilgisi (sunucu erişim logları, 90 gün saklanır)',
                'Görüntülenen slayt ve konu başlıkları (görüntülenme sayacı)',
                'Etkileşimler: beğeni, kaydetme, takip etme, yorum',
                'Çerez kimlikleri (rıza vermeniz hâlinde analitik ve reklam çerezleri)',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 mt-1.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Section 2 */}
      <Section icon={<Eye className="w-5 h-5 text-primary" />} title="2. Bilgileri Nasıl Kullanıyoruz">
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ['Hizmet Sunumu', 'Hesap yönetimi, içerik gösterimi, bildirimler'],
            ['Güvenlik', 'Spam tespiti, kötüye kullanım önleme, rate limiting'],
            ['Kişiselleştirme', 'İlgi alanlarına göre içerik önerisi (yerel algoritma)'],
            ['Analitik', 'Site performansı ve kullanım istatistikleri'],
            ['Reklamcılık', 'Kişiselleştirilmiş reklamlar (yalnızca onaylı çerezlerle)'],
            ['Yasal', 'Yetkili makam taleplerine yanıt'],
          ].map(([title, desc]) => (
            <div key={title} className="p-3.5 rounded-xl border border-border bg-muted/20">
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Section 3 */}
      <Section icon={<Users className="w-5 h-5 text-primary" />} title="3. Bilgilerin Paylaşımı">
        <p className="text-sm text-muted-foreground">
          Kişisel verilerinizi <strong className="text-foreground">satmıyor, kiralamıyor</strong> veya ticari amaçla üçüncü taraflarla paylaşmıyoruz. Yalnızca şu durumlarda paylaşım yapılabilir:
        </p>
        <ul className="space-y-2 mt-2">
          {[
            ['Altyapı sağlayıcısı', 'Sunucu ve depolama hizmetleri (veri işleme sözleşmesi kapsamında)'],
            ['Google AdSense', 'Reklam çerezlerine onay vermeniz hâlinde reklam kimlikleri ve ilgi kategorileri'],
            ['Yasal zorunluluk', 'Mahkeme kararı veya resmi makam talebi'],
            ['Kullanıcı izni', 'Açıkça onay vermeniz hâlinde'],
          ].map(([who, what]) => (
            <li key={who} className="flex gap-3 p-3 rounded-xl bg-muted/30 border border-border/60">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">{who}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{what}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {/* Section 4 */}
      <Section icon={<Lock className="w-5 h-5 text-primary" />} title="4. Veri Güvenliği">
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ['bcrypt', 'Parola hashleme (cost 10); düz metin saklanmaz'],
            ['JWT', 'Kimlik doğrulama tokenları 7 günde geçersiz olur'],
            ['HTTPS', 'Tüm bağlantılar TLS ile şifrelenir'],
            ['Helmet', 'HTTP güvenlik başlıkları uygulanır'],
            ['50 MB Limit', 'Magic byte doğrulaması ile dosya tipi kontrolü'],
            ['Rate Limiting', 'Brute-force saldırılarına karşı IP koruması'],
          ].map(([tech, desc]) => (
            <div key={tech} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20">
              <code className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded shrink-0">{tech}</code>
              <span className="text-xs text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Section 5 */}
      <Section icon={<Clock className="w-5 h-5 text-primary" />} title="5. Veri Saklama">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ['Hesap verileri', 'Hesap silinene kadar + 30 gün yedekten kaldırma'],
            ['Slayt dosyaları', 'Slayt silindiğinde anında kaldırılır'],
            ['Sunucu logları', '90 gün'],
            ['Çerez verileri', 'Zorunlu: 1 yıl · Analitik/Reklam: en fazla 2 yıl'],
          ].map(([label, value]) => (
            <div key={label} className="p-3.5 rounded-xl border border-border bg-muted/20">
              <p className="text-xs font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-1">{value}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Section 6 */}
      <Section icon={<Shield className="w-5 h-5 text-primary" />} title="6. Çocukların Gizliliği">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Slaytim, 13 yaşın altındaki bireylere yönelik değildir. 13 yaşın altındaki birinden bilerek veri toplamıyoruz.
          Bu durumun farkındaysanız lütfen bize bildirin.
        </p>
      </Section>

      {/* Section 7 */}
      <Section icon={<Eye className="w-5 h-5 text-primary" />} title="7. Haklarınız">
        <p className="text-sm text-muted-foreground">
          KVKK madde 11 kapsamındaki haklarınız için{' '}
          <Link href="/kvkk" className="text-primary hover:underline font-medium">KVKK Aydınlatma Metnini</Link>{' '}
          inceleyin. Talepler en geç <strong className="text-foreground">30 gün</strong> içinde yanıtlanır.
        </p>
      </Section>

      {/* Contact */}
      <section className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-3">
        <h2 className="font-bold text-base text-foreground">8. İletişim</h2>
        <p className="text-sm text-muted-foreground">Gizlilik politikamıza ilişkin soru ve talepleriniz için:</p>
        <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border bg-muted/30">
          <Mail className="w-4 h-4 text-primary shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Gizlilik İletişim</p>
            <a href="mailto:admin@slaytim.com" className="text-sm font-semibold text-primary hover:underline">admin@slaytim.com</a>
          </div>
        </div>
      </section>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">{icon}</div>
        <h2 className="font-bold text-base text-foreground">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
