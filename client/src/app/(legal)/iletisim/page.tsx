import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'İletişim',
  description: 'Slaytim iletişim ve destek kanalları.',
};

export default function ContactPage() {
  return (
    <article className="prose prose-sm max-w-none dark:prose-invert">
      <h1>İletişim</h1>
      <p>Destek talepleri, güvenlik bildirimleri ve iş birliği konuları için aşağıdaki kanalları kullanabilirsiniz.</p>
      <ul>
        <li>E-posta: <a href="mailto:destek@slaytim.com">destek@slaytim.com</a></li>
        <li>Güvenlik: <a href="mailto:security@slaytim.com">security@slaytim.com</a></li>
        <li>Ürün geri bildirimi: uygulama içi geri bildirim bileşeni</li>
      </ul>
      <p>Hafta içi 09:00-18:00 (Europe/Istanbul) saatleri arasında dönüş yapılır.</p>
    </article>
  );
}
