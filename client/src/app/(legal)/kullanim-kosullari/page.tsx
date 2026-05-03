import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, Upload, Lock, Flag, Zap, Tag, Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Kullanım Koşulları | Slaytim',
  description: 'Slaytim kullanım koşulları, topluluk kuralları ve içerik politikası.',
  alternates: { canonical: 'https://slaytim.com/kullanim-kosullari' },
};

const LAST_UPDATED = '21 Nisan 2026';

export default function TermsPage() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <FileText className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">Kullanım Koşulları</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Son güncelleme: {LAST_UPDATED}</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-4">
        Slaytim'i kullanarak aşağıdaki koşulları kabul etmiş sayılırsınız. Lütfen dikkatlice okuyunuz.
      </p>

      {/* Sections */}
      <Section icon={<Upload className="w-5 h-5 text-primary" />} title="1. Hizmet Kullanımı">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Slaytim'e yüklenen içeriklerden yükleyen kullanıcı sorumludur.
          Aşağıdaki içerik türleri <strong className="text-foreground">kesinlikle yasaktır:</strong>
        </p>
        <ul className="space-y-2 mt-2">
          {[
            'Telif hakkı ihlali içeren materyaller',
            'Zararlı yazılım veya kötü amaçlı kod',
            'Yasa dışı, taciz edici veya nefret içeren içerikler',
            'Başkasının kişisel verilerini rızasız paylaşmak',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500/60 mt-1.5 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <Section icon={<Lock className="w-5 h-5 text-primary" />} title="2. Hesap Güvenliği">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Hesap bilgilerinizi (şifre, e-posta) korumak sizin sorumluluğunuzdadır.
          Hesabınıza yetkisiz erişim şüphesi durumunda şifrenizi değiştirin ve{' '}
          <a href="mailto:support@slaytim.com" className="text-primary hover:underline font-medium">support@slaytim.com</a>{' '}
          adresinden destek ekibine bildirim yapabilirsiniz.
        </p>
      </Section>

      <Section icon={<Flag className="w-5 h-5 text-primary" />} title="3. İçerik Moderasyonu">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Platform, raporlanan içerikleri inceleme ve gerekli durumlarda görünürlüğü kısıtlama,
          içeriği kaldırma veya hesabı askıya alma hakkını saklı tutar. Moderasyon kararlarına
          itiraz için <a href="mailto:support@slaytim.com" className="text-primary hover:underline font-medium">support@slaytim.com</a> ile iletişime geçebilirsiniz.
        </p>
      </Section>

      <Section icon={<Zap className="w-5 h-5 text-primary" />} title="4. Hizmet Sürekliliği">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Bakım, güvenlik veya altyapı gereksinimleri nedeniyle geçici kesintiler yaşanabilir.
          Planlanmış kesintiler önceden duyurulur. Beklenmedik kesintilerde destek ekibimizle iletişime geçebilirsiniz.
        </p>
      </Section>

      <Section icon={<Tag className="w-5 h-5 text-primary" />} title="5. Sponsorlu İçerik Açıklaması">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Platformda sponsorlu veya ücretli iş birliği kapsamında yayınlanan içerikler{' '}
          <strong className="text-foreground">"Sponsorlu"</strong> etiketi ve açıklama metni ile işaretlenir.
          Reklamveren ile yapılan iş birliği, içerik sahibinin görüşlerinden bağımsız olabilir.
        </p>
        <div className="p-3.5 rounded-xl border border-border bg-muted/20 mt-2">
          <p className="text-xs text-muted-foreground">
            Sponsorlu içeriklerde <strong className="text-foreground">sponsor markası</strong>,{' '}
            <strong className="text-foreground">kampanya kodu</strong>,{' '}
            <strong className="text-foreground">açıklama metni</strong> ve varsa sponsor bağlantısı
            kullanıcıya görünür şekilde sunulur.
          </p>
        </div>
      </Section>

      {/* Contact */}
      <section className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <h2 className="font-bold text-base text-foreground">6. İletişim</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Kullanım koşullarıyla ilgili sorularınız için{' '}
          <Link href="/iletisim" className="text-primary hover:underline font-medium">İletişim</Link> sayfasını
          ziyaret edebilir ya da doğrudan bize yazabilirsiniz.
        </p>
        <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border bg-muted/30">
          <Mail className="w-4 h-4 text-primary shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Genel İletişim</p>
            <a href="mailto:hello@slaytim.com" className="text-sm font-semibold text-primary hover:underline">hello@slaytim.com</a>
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
