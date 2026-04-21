import type { Metadata } from 'next';
import { Mail, Shield, MessageSquare, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'İletişim | Slaytim',
  description: 'Slaytim destek, güvenlik bildirimi ve iş birliği iletişim kanalları.',
  alternates: { canonical: 'https://slaytim.com/iletisim' },
};

export default function ContactPage() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <Mail className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">İletişim</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Destek, güvenlik bildirimi ve iş birliği konuları için aşağıdaki kanalları kullanabilirsiniz.
          </p>
        </div>
      </div>

      {/* Contact cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <ContactCard
          icon={<Mail className="w-5 h-5 text-primary" />}
          title="Genel Destek"
          desc="Hesap sorunları, teknik destek ve genel sorular için."
          email="admin@slaytim.com"
          label="Destek E-postası"
        />
        <ContactCard
          icon={<Shield className="w-5 h-5 text-primary" />}
          title="Güvenlik Bildirimi"
          desc="Güvenlik açığı veya veri ihlali bildirimleri için."
          email="admin@slaytim.com"
          label="Güvenlik E-postası"
        />
        <ContactCard
          icon={<MessageSquare className="w-5 h-5 text-primary" />}
          title="KVKK ve Gizlilik"
          desc="Kişisel veri talepleri ve KVKK hakları için."
          email="admin@slaytim.com"
          label="Gizlilik E-postası"
        />
        <ContactCard
          icon={<Mail className="w-5 h-5 text-primary" />}
          title="İş Birliği"
          desc="Sponsorluk, iş ortaklığı ve reklam teklifleri için."
          email="admin@slaytim.com"
          label="İş Birliği E-postası"
        />
      </div>

      {/* Response time */}
      <section className="bg-card border border-border rounded-2xl p-5 md:p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <h2 className="font-bold text-base text-foreground">Yanıt Süreleri</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['Genel Destek', 'Hafta içi 09:00–18:00 (Europe/Istanbul) saatleri içinde'],
            ['Güvenlik', 'Kritik bildiriler için 24 saat içinde'],
            ['KVKK Talepleri', 'En geç 30 gün içinde yasal zorunluluk kapsamında'],
          ].map(([label, time]) => (
            <div key={label} className="p-3.5 rounded-xl border border-border bg-muted/20">
              <p className="text-xs font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-1">{time}</p>
            </div>
          ))}
        </div>
      </section>

      {/* In-app feedback */}
      <section className="bg-muted/30 border border-border/60 rounded-2xl p-5">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Ürün geri bildirimi</strong> için uygulama içi geri bildirim bileşenini de kullanabilirsiniz — sağ alt köşedeki geri bildirim butonuna tıklayın.
        </p>
      </section>
    </div>
  );
}

function ContactCard({
  icon, title, desc, email, label,
}: {
  icon: React.ReactNode; title: string; desc: string; email: string; label: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-3 hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">{icon}</div>
        <h2 className="font-bold text-sm text-foreground">{title}</h2>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
      <div className="pt-1">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">{label}</p>
        <a
          href={`mailto:${email}`}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {email}
        </a>
      </div>
    </div>
  );
}
