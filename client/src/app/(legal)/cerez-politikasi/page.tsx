import type { Metadata } from 'next';
import Link from 'next/link';
import { Cookie, Settings, Mail, ExternalLink } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Çerez Politikası | Slaytim',
  description:
    "Slaytim'in kullandığı çerez türleri, amaçları ve Google AdSense reklam çerezleri hakkında bilgi.",
  alternates: { canonical: 'https://slaytim.com/cerez-politikasi' },
};

const LAST_UPDATED = '21 Nisan 2026';

export default function CerezPolitikasiPage() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <Cookie className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">Çerez Politikası</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Son güncelleme: {LAST_UPDATED}</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-4">
        Bu politika, <strong className="text-foreground">slaytim.com</strong> ziyaretiniz sırasında hangi çerezlerin
        kullanıldığını, neden kullanıldığını ve nasıl yönetebileceğinizi açıklamaktadır.
      </p>

      {/* What is a cookie */}
      <section className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-3">
        <h2 className="font-bold text-base text-foreground">1. Çerez Nedir?</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Çerezler, web sitelerinin tarayıcınıza kaydettiği küçük metin dosyalarıdır. Oturum yönetimi,
          tercihlerin hatırlanması ve kullanım istatistikleri gibi işlevler için kullanılır.
        </p>
      </section>

      {/* Cookie types */}
      <section className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-5">
        <h2 className="font-bold text-base text-foreground">2. Kullandığımız Çerez Türleri</h2>

        <CookieCategory
          badge="Zorunlu"
          badgeColor="bg-green-500/10 text-green-600"
          title="Zorunlu Çerezler"
          desc="Sitenin temel işlevleri için zorunludur; onay gerekmez ve devre dışı bırakılamaz."
          rows={[
            { name: 'slaytim-consent', purpose: 'Çerez tercihlerinizin hatırlanması', duration: '1 yıl' },
            { name: 'auth-token (localStorage)', purpose: 'Oturum kimlik doğrulaması (JWT)', duration: '7 gün' },
          ]}
        />

        <CookieCategory
          badge="İsteğe Bağlı"
          badgeColor="bg-blue-500/10 text-blue-600"
          title="Analitik Çerezler"
          desc="Sitenin nasıl kullanıldığını anlamamıza yardımcı olur. Yalnızca onayınız hâlinde etkinleşir."
          rows={[
            { name: 'Google Analytics', purpose: 'Sayfa görüntüleme, trafik kaynağı analizi', duration: '2 yıl' },
          ]}
        />

        <CookieCategory
          badge="İsteğe Bağlı"
          badgeColor="bg-orange-500/10 text-orange-600"
          title="Reklam ve Pazarlama Çerezleri"
          desc="Kişiselleştirilmiş reklam gösterimi için kullanılır. Yalnızca onayınız hâlinde etkinleşir."
          rows={[
            { name: 'Google AdSense', purpose: 'Kişiselleştirilmiş reklam gösterimi', duration: '13 ay' },
            { name: 'Google DoubleClick', purpose: 'Reklam frekans sınırlaması ve raporlama', duration: '13 ay' },
          ]}
        />
      </section>

      {/* Google AdSense */}
      <section className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-4">
        <h2 className="font-bold text-base text-foreground">3. Google AdSense ve Gizlilik</h2>
        <p className="text-sm text-muted-foreground">
          Slaytim, içerik finansmanını desteklemek amacıyla <strong className="text-foreground">Google AdSense</strong> reklamcılık hizmetini kullanmaktadır.
        </p>
        <ul className="space-y-2">
          {[
            'Google, sizi yeniden tanımlayabilmek amacıyla DoubleClick çerezi ve benzeri teknolojiler kullanabilir.',
            'Bu çerezler, ilgi alanlarınıza dayalı reklamların gösterilmesini sağlar.',
            'Tarayıcı parmak izi ve benzeri reklamcılık tanımlayıcıları da kullanılabilir.',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3 mt-2">
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Google Gizlilik Politikası
          </a>
          <a
            href="https://www.google.com/settings/ads"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Google Reklam Ayarları
          </a>
          <a
            href="https://optout.aboutads.info/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            YourAdChoices Çıkış
          </a>
        </div>
      </section>

      {/* Managing preferences */}
      <section className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <h2 className="font-bold text-base text-foreground">4. Çerez Tercihlerinizi Yönetme</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="p-4 rounded-xl border border-border bg-muted/20">
            <p className="text-sm font-semibold text-foreground mb-1">Çerez Banner</p>
            <p className="text-xs text-muted-foreground">
              Site ilk ziyaretinizde ekranın altında belirir. "Özelleştir" seçeneğiyle ayrıntılı tercih belirleyebilirsiniz.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-muted/20">
            <p className="text-sm font-semibold text-foreground mb-1">Tarayıcı Ayarları</p>
            <p className="text-xs text-muted-foreground">
              Tüm çerezleri tarayıcınızdan yönetebilir veya silebilirsiniz. Bu, sitenin bazı işlevlerini etkileyebilir.
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Zorunlu çerezler dışındaki tüm çerezleri reddetmek için "Yalnızca Zorunlu" seçeneğini kullanabilirsiniz.
        </p>
      </section>

      {/* Contact */}
      <section className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-3">
        <h2 className="font-bold text-base text-foreground">5. İletişim</h2>
        <p className="text-sm text-muted-foreground">
          Çerez uygulamalarımız hakkında sorularınız için:
        </p>
        <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border bg-muted/30">
          <Mail className="w-4 h-4 text-primary shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Çerez ve Gizlilik</p>
            <a href="mailto:admin@slaytim.com" className="text-sm font-semibold text-primary hover:underline">admin@slaytim.com</a>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          KVKK kapsamındaki haklarınız için{' '}
          <Link href="/kvkk" className="text-primary hover:underline font-medium">KVKK Aydınlatma Metnimizi</Link> inceleyiniz.
        </p>
      </section>
    </div>
  );
}

function CookieCategory({
  badge, badgeColor, title, desc, rows,
}: {
  badge: string; badgeColor: string; title: string; desc: string;
  rows: { name: string; purpose: string; duration: string }[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <p className="text-xs text-muted-foreground">{desc}</p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-foreground">Çerez / Sağlayıcı</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-foreground">Amaç</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-foreground">Süre</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((r) => (
              <tr key={r.name} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-2.5 font-mono text-xs text-foreground">{r.name}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.purpose}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{r.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
