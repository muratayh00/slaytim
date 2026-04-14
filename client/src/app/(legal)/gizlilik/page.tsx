import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Gizlilik Politikası | Slaytim',
  description:
    "Slaytim'in kişisel veri işleme ilkeleri, veri güvenliği uygulamaları ve kullanıcı hakları hakkında gizlilik politikası.",
  alternates: { canonical: 'https://slaytim.com/gizlilik' },
};

const LAST_UPDATED = '28 Mart 2026';

export default function GizlilikPage() {
  return (
    <article className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
      <h1>Gizlilik Politikası</h1>
      <p className="text-muted-foreground text-sm">Son güncelleme: {LAST_UPDATED}</p>

      <p>
        Bu politika, <strong>slaytim.com</strong> hizmetlerini kullanırken kişisel verilerinizin
        nasıl toplandığını, işlendiğini ve korunduğunu açıklamaktadır. Sitemizi kullanarak bu
        politikayı kabul etmiş sayılırsınız.
      </p>

      <h2>1. Topladığımız Bilgiler</h2>

      <h3>1.1 Doğrudan Sağladığınız Bilgiler</h3>
      <ul>
        <li><strong>Hesap bilgileri:</strong> Kullanıcı adı, e-posta adresi, şifre (hashed).</li>
        <li><strong>Profil bilgileri:</strong> Biyografi, avatar görseli.</li>
        <li><strong>İçerik:</strong> Yüklediğiniz slaytlar, yorumlarınız, konu başlıklarınız.</li>
        <li><strong>İletişim:</strong> Bize gönderdiğiniz geri bildirim ve destek talepleri.</li>
      </ul>

      <h3>1.2 Otomatik Olarak Toplanan Bilgiler</h3>
      <ul>
        <li>IP adresi ve tarayıcı bilgisi (sunucu erişim logları, 90 gün saklanır).</li>
        <li>Görüntülenen slayt ve konu başlıkları (görüntülenme sayacı).</li>
        <li>Etkileşimler: beğeni, kaydetme, takip etme, yorum.</li>
        <li>Çerez kimlikleri (rıza vermeniz hâlinde analitik ve reklam çerezleri).</li>
      </ul>

      <h2>2. Bilgileri Nasıl Kullanıyoruz</h2>
      <ul>
        <li>Hizmet sunumu: hesap yönetimi, içerik gösterimi, bildirimler.</li>
        <li>Güvenlik: spam tespiti, kötüye kullanım önleme, rate limiting.</li>
        <li>Kişiselleştirme: ilgi alanlarına göre içerik önerisi (yerel algoritma, 3. taraf olmadan).</li>
        <li>Analitik: site performansı ve kullanım istatistikleri (onaylı çerezler ile).</li>
        <li>Reklamcılık: kişiselleştirilmiş reklamlar (yalnızca onaylı reklam çerezleri ile).</li>
        <li>Yasal yükümlülükler: yetkili makam talepleri.</li>
      </ul>

      <h2>3. Bilgilerin Paylaşımı</h2>
      <p>
        Kişisel verilerinizi satmıyor, kiralamıyor veya ticari amaçla üçüncü taraflarla
        paylaşmıyoruz. Yalnızca şu durumlarda paylaşım yapılabilir:
      </p>
      <ul>
        <li>
          <strong>Altyapı sağlayıcısı:</strong> Sunucu ve depolama hizmetleri için (veri işleme
          sözleşmesi kapsamında).
        </li>
        <li>
          <strong>Google AdSense:</strong> Reklam çerezlerine onay vermeniz hâlinde (reklam
          kimlikleri ve ilgi kategorileri). Ayrıntılar için{' '}
          <Link href="/cerez-politikasi">Çerez Politikamızı</Link> inceleyin.
        </li>
        <li>
          <strong>Yasal zorunluluk:</strong> Mahkeme kararı veya resmi makam talebi.
        </li>
        <li>
          <strong>Kullanıcı izni:</strong> Açıkça onay vermeniz hâlinde.
        </li>
      </ul>

      <h2>4. Veri Güvenliği</h2>
      <p>Verilerinizin korunması için uygulanan teknik önlemler:</p>
      <ul>
        <li>Parolalar <strong>bcrypt</strong> (cost factor 10) ile hashlenir; düz metin saklanmaz.</li>
        <li>Kimlik doğrulama <strong>JWT</strong> ile yapılır, tokenlar 7 gün sonra geçersiz olur.</li>
        <li>Tüm bağlantılar <strong>HTTPS</strong> üzerinden şifrelenir.</li>
        <li>HTTP güvenlik başlıkları (<strong>Helmet</strong>) uygulanır.</li>
        <li>Yükleme boyutu 50 MB ile sınırlıdır; dosya türü magic byte doğrulaması yapılır.</li>
        <li>Brute-force saldırılarına karşı IP bazlı <strong>rate limiting</strong> aktiftir.</li>
        <li>Yeni hesaplar için kademeli yükleme limiti (spam önleme).</li>
      </ul>

      <h2>5. Veri Saklama</h2>
      <ul>
        <li>
          <strong>Hesap verileri:</strong> Hesabınızı silene kadar aktif tutulur. Silme işleminden
          sonra 30 gün yedekten de kaldırılır.
        </li>
        <li>
          <strong>Slayt dosyaları:</strong> Slayt silindiğinde disk üzerinden anında kaldırılır
          (dosya, PDF dönüştürmesi ve küçük resim dahil).
        </li>
        <li>
          <strong>Sunucu logları:</strong> 90 gün.
        </li>
        <li>
          <strong>Çerez verileri:</strong> Çerez politikasındaki süreye göre (zorunlu çerez 1 yıl,
          analitik/reklam çerezleri en fazla 2 yıl).
        </li>
      </ul>

      <h2>6. Çocukların Gizliliği</h2>
      <p>
        Slaytim, 13 yaşın altındaki bireylere yönelik değildir. 13 yaşın altındaki birinden
        bilerek veri toplamıyoruz. Bu durumun farkındaysanız lütfen bize bildirin.
      </p>

      <h2>7. Haklarınız</h2>
      <p>
        KVKK madde 11 kapsamındaki haklarınız için <Link href="/kvkk">KVKK Aydınlatma Metnini</Link>{' '}
        inceleyin. Talepler en geç 30 gün içinde yanıtlanır.
      </p>

      <h2>8. Değişiklikler</h2>
      <p>
        Bu politika zaman zaman güncellenebilir. Önemli değişiklikler hesap e-postanıza bildirilir.
        Güncelleme tarihini düzenli olarak kontrol etmenizi öneririz.
      </p>

      <h2>9. İletişim</h2>
      <p>
        Gizlilik politikamıza ilişkin soru ve talepleriniz için:{' '}
        <a href="mailto:kvkk@slaytim.com">kvkk@slaytim.com</a>
      </p>
    </article>
  );
}
