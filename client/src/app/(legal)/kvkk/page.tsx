import type { Metadata } from 'next';
import { Shield, Mail, Clock, Database, Lock, Users, FileText, AlertCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'KVKK Aydınlatma Metni | Slaytim',
  description:
    '6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında Slaytim kullanıcılarına yönelik aydınlatma metni.',
  alternates: { canonical: 'https://slaytim.com/kvkk' },
};

const LAST_UPDATED = '21 Nisan 2026';

export default function KVKKPage() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">KVKK Aydınlatma Metni</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            6698 sayılı Kişisel Verilerin Korunması Kanunu · Son güncelleme: {LAST_UPDATED}
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-4">
        Bu aydınlatma metni, 6698 sayılı <strong className="text-foreground">Kişisel Verilerin Korunması Kanunu</strong> ("KVKK")
        madde 10 uyarınca <strong className="text-foreground">Slaytim</strong> ("Veri Sorumlusu") tarafından hazırlanmıştır.
      </p>

      {/* Section 1 */}
      <Section icon={<Users className="w-5 h-5 text-primary" />} number="1" title="Veri Sorumlusu">
        <p>
          Slaytim platformu, <strong>slaytim.com</strong> alan adı üzerinden hizmet vermektedir. Kişisel verileriniz
          Slaytim işletmecisi tarafından işlenmektedir.
        </p>
        <ContactCard label="KVKK İletişim" email="admin@slaytim.com" />
      </Section>

      {/* Section 2 */}
      <Section icon={<Database className="w-5 h-5 text-primary" />} number="2" title="İşlenen Kişisel Veriler">
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left px-4 py-3 font-semibold text-foreground">Kategori</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Veriler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {[
                ['Kimlik', 'Ad–soyad, kullanıcı adı'],
                ['İletişim', 'E-posta adresi'],
                ['İşlem Güvenliği', 'Şifrelenmiş parola (bcrypt), JWT tokenları'],
                ['Davranışsal', 'Görüntülenen slaytlar, beğeniler, kaydetmeler, takip ilişkileri'],
                ['Teknik', 'IP adresi, tarayıcı bilgisi, çerez kimlikleri'],
                ['İçerik', 'Yüklenen slayt dosyaları, yorumlar, profil fotoğrafı'],
              ].map(([cat, data]) => (
                <tr key={cat} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{cat}</td>
                  <td className="px-4 py-3 text-muted-foreground">{data}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Section 3 */}
      <Section icon={<FileText className="w-5 h-5 text-primary" />} number="3" title="İşleme Amaçları ve Hukuki Sebepler">
        <ul className="space-y-3">
          {[
            ['Sözleşmenin ifası (KVKK m.5/2-c)', 'Hesap oluşturma, giriş, içerik yükleme ve paylaşma, bildirimler.'],
            ['Meşru menfaat (KVKK m.5/2-f)', 'Spam önleme, kötüye kullanım tespiti, site güvenliğinin sağlanması, istatistiksel analiz.'],
            ['Açık rıza (KVKK m.5/1)', 'Analitik çerezler ve kişiselleştirilmiş reklam gösterimi — yalnızca çerez tercihlerinizi onaylamanız hâlinde gerçekleştirilir.'],
            ['Kanuni yükümlülük (KVKK m.5/2-ç)', 'Yasal taleplere yanıt, içerik kaldırma bildirimleri.'],
          ].map(([title, desc]) => (
            <li key={title} className="flex gap-3 p-3 rounded-xl bg-muted/30 border border-border/60">
              <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {/* Section 4 */}
      <Section icon={<Users className="w-5 h-5 text-primary" />} number="4" title="Veri Aktarımı">
        <p className="text-sm text-muted-foreground">
          Kişisel verileriniz; yalnızca hizmetin sunulması amacıyla ve gerekli ölçüde aşağıdaki taraflarla paylaşılabilir:
        </p>
        <ul className="space-y-2 mt-3">
          {[
            ['Altyapı sağlayıcısı', 'Barındırma ve CDN hizmetleri (veri işleme sözleşmesi kapsamında).'],
            ['Google LLC', 'AdSense reklam hizmetleri — yalnızca reklam çerezlerine onay vermeniz hâlinde (ABD aktarımı, Standart Sözleşme Maddeleri kapsamında).'],
            ['Yetkili kurumlar', 'Yargı veya idari mercilerin yasal talepleri.'],
          ].map(([who, what]) => (
            <li key={who} className="flex gap-3 items-start text-sm">
              <span className="text-primary font-bold shrink-0">·</span>
              <span><strong className="text-foreground">{who}:</strong> <span className="text-muted-foreground">{what}</span></span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Section 5 */}
      <Section icon={<Clock className="w-5 h-5 text-primary" />} number="5" title="Saklama Süreleri">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ['Hesap verileri', 'Hesabın silinmesine kadar + 30 gün yedek saklama'],
            ['Yüklenen slaytlar', 'Slayt silinene kadar; disk kaldırma işlemi anında gerçekleşir'],
            ['Log kayıtları', 'Sunucu erişim logları: 90 gün'],
            ['Analitik çerezler', 'Çerez politikasında belirtilen süre (en fazla 2 yıl)'],
          ].map(([label, value]) => (
            <div key={label} className="p-3.5 rounded-xl border border-border bg-muted/20">
              <p className="text-xs font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-1">{value}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Section 6 */}
      <Section icon={<AlertCircle className="w-5 h-5 text-primary" />} number="6" title="Haklarınız (KVKK m.11)">
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            'Kişisel verilerinizin işlenip işlenmediğini öğrenme',
            'İşlenmişse buna ilişkin bilgi talep etme',
            'Yanlış verilerin düzeltilmesini isteme',
            'Verilerin silinmesini veya yok edilmesini talep etme',
            'İşlemenin kısıtlanmasını isteme',
            'Otomatik işleme sonuçlarına itiraz etme',
            'Zararın giderilmesini talep etme',
          ].map((right) => (
            <div key={right} className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              {right}
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Haklarınızı kullanmak için <a href="mailto:admin@slaytim.com" className="text-primary hover:underline font-medium">admin@slaytim.com</a> adresine
          e-posta gönderebilir veya hesap ayarlarınızdan "Verilerimi Sil" seçeneğini kullanabilirsiniz.
          Talepler en geç <strong className="text-foreground">30 gün</strong> içinde yanıtlanır.
        </p>
      </Section>

      {/* Section 7 */}
      <Section icon={<Lock className="w-5 h-5 text-primary" />} number="7" title="Güvenlik Önlemleri">
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ['bcrypt', 'Parola hashleme (cost factor 10)'],
            ['JWT', 'Token tabanlı kimlik doğrulama (7 gün)'],
            ['HTTPS', 'Tüm bağlantılar şifrelenir'],
            ['Helmet', 'HTTP güvenlik başlıkları'],
            ['Rate Limiting', 'IP bazlı istek sınırlandırma'],
            ['50 MB Limit', 'Dosya boyutu ve tür kısıtlaması'],
          ].map(([tech, desc]) => (
            <div key={tech} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20">
              <code className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{tech}</code>
              <span className="text-xs text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Section 8 */}
      <Section icon={<FileText className="w-5 h-5 text-primary" />} number="8" title="Çerezler">
        <p className="text-sm text-muted-foreground">
          Çerez kullanımına ilişkin ayrıntılı bilgi için{' '}
          <a href="/cerez-politikasi" className="text-primary hover:underline font-medium">Çerez Politikamızı</a> inceleyiniz.
        </p>
      </Section>

      {/* Section 9 */}
      <Section icon={<Clock className="w-5 h-5 text-primary" />} number="9" title="Bu Metnin Güncellenmesi">
        <p className="text-sm text-muted-foreground">
          Bu metin, yasal düzenlemeler veya platform özellikleri değiştiğinde güncellenebilir.
          Önemli değişiklikler hesabınıza kayıtlı e-posta adresinize bildirilir.
        </p>
      </Section>
    </div>
  );
}

function Section({ icon, number, title, children }: { icon: React.ReactNode; number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <h2 className="font-bold text-base text-foreground">{number}. {title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ContactCard({ label, email }: { label: string; email: string }) {
  return (
    <div className="inline-flex items-center gap-3 mt-2 px-4 py-2.5 rounded-xl border border-border bg-muted/30">
      <Mail className="w-4 h-4 text-primary shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <a href={`mailto:${email}`} className="text-sm font-semibold text-primary hover:underline">{email}</a>
      </div>
    </div>
  );
}
