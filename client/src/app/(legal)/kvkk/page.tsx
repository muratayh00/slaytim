import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KVKK Aydınlatma Metni | Slaytim',
  description:
    '6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında Slaytim kullanıcılarına yönelik aydınlatma metni.',
  alternates: { canonical: 'https://slaytim.com/kvkk' },
};

const LAST_UPDATED = '28 Mart 2026';

export default function KVKKPage() {
  return (
    <article className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
      <h1>KVKK Aydınlatma Metni</h1>
      <p className="text-muted-foreground text-sm">Son güncelleme: {LAST_UPDATED}</p>

      <p>
        Bu aydınlatma metni, 6698 sayılı <strong>Kişisel Verilerin Korunması Kanunu</strong> ("KVKK")
        madde 10 uyarınca <strong>Slaytim</strong> ("Veri Sorumlusu") tarafından hazırlanmıştır.
      </p>

      <h2>1. Veri Sorumlusu</h2>
      <p>
        Slaytim platformu, slaytim.com alan adı üzerinden hizmet vermektedir. Kişisel verileriniz
        Slaytim işletmecisi tarafından işlenmektedir. İletişim: <a href="mailto:kvkk@slaytim.com">kvkk@slaytim.com</a>
      </p>

      <h2>2. İşlenen Kişisel Veriler</h2>
      <table>
        <thead>
          <tr>
            <th>Kategori</th>
            <th>Veriler</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Kimlik</td>
            <td>Ad–soyad, kullanıcı adı</td>
          </tr>
          <tr>
            <td>İletişim</td>
            <td>E-posta adresi</td>
          </tr>
          <tr>
            <td>İşlem Güvenliği</td>
            <td>Şifrelenmiş parola (bcrypt), JWT tokenları</td>
          </tr>
          <tr>
            <td>Davranışsal</td>
            <td>Görüntülenen slaytlar, beğeniler, kaydetmeler, takip ilişkileri</td>
          </tr>
          <tr>
            <td>Teknik</td>
            <td>IP adresi, tarayıcı bilgisi, çerez kimlikleri</td>
          </tr>
          <tr>
            <td>İçerik</td>
            <td>Yüklenen slayt dosyaları, yorumlar, profil fotoğrafı</td>
          </tr>
        </tbody>
      </table>

      <h2>3. İşleme Amaçları ve Hukuki Sebepler</h2>
      <ul>
        <li>
          <strong>Sözleşmenin ifası (KVKK m.5/2-c):</strong> Hesap oluşturma, giriş, içerik yükleme
          ve paylaşma, bildirimler.
        </li>
        <li>
          <strong>Meşru menfaat (KVKK m.5/2-f):</strong> Spam önleme, kötüye kullanım tespiti,
          site güvenliğinin sağlanması, istatistiksel analiz.
        </li>
        <li>
          <strong>Açık rıza (KVKK m.5/1):</strong> Analitik çerezler ve kişiselleştirilmiş reklam
          gösterimi — yalnızca çerez tercihlerinizi onaylamanız hâlinde gerçekleştirilir.
        </li>
        <li>
          <strong>Kanuni yükümlülük (KVKK m.5/2-ç):</strong> Yasal taleplere yanıt, içerik
          kaldırma bildirimleri.
        </li>
      </ul>

      <h2>4. Veri Aktarımı</h2>
      <p>
        Kişisel verileriniz; yalnızca hizmetin sunulması amacıyla ve gerekli ölçüde aşağıdaki
        taraflarla paylaşılabilir:
      </p>
      <ul>
        <li>
          <strong>Altyapı sağlayıcısı:</strong> Barındırma ve CDN hizmetleri (sunucu hizmet sağlayıcısı).
        </li>
        <li>
          <strong>Google LLC:</strong> AdSense reklam hizmetleri — yalnızca reklam çerezlerine
          onay vermeniz hâlinde (ABD aktarımı, Standart Sözleşme Maddeleri kapsamında).
        </li>
        <li>
          <strong>Yetkili kurumlar:</strong> Yargı veya idari mercilerin yasal talepleri.
        </li>
      </ul>

      <h2>5. Saklama Süreleri</h2>
      <ul>
        <li>Hesap verileri: Hesabın silinmesine kadar + 30 gün yedek saklama.</li>
        <li>Yüklenen slaytlar: Slayt silinene kadar + disk kaldırma işlemi anında gerçekleşir.</li>
        <li>Log kayıtları (sunucu erişim): 90 gün.</li>
        <li>Analitik çerezler: Çerez politikasında belirtilen süre (en fazla 2 yıl).</li>
      </ul>

      <h2>6. Haklarınız (KVKK m.11)</h2>
      <p>
        Kişisel verilerinizle ilgili olarak aşağıdaki haklarınızı kullanabilirsiniz:
      </p>
      <ul>
        <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme,</li>
        <li>İşlenmişse buna ilişkin bilgi talep etme,</li>
        <li>Yanlış verilerin düzeltilmesini isteme,</li>
        <li>Verilerin silinmesini veya yok edilmesini talep etme,</li>
        <li>İşlemenin kısıtlanmasını isteme,</li>
        <li>Otomatik işleme sonuçlarına itiraz etme,</li>
        <li>Zararın giderilmesini talep etme.</li>
      </ul>
      <p>
        Haklarınızı kullanmak için <a href="mailto:kvkk@slaytim.com">kvkk@slaytim.com</a> adresine
        e-posta gönderebilir veya hesap ayarlarınızdan "Verilerimi Sil" seçeneğini kullanabilirsiniz.
        Talepler en geç <strong>30 gün</strong> içinde yanıtlanır.
      </p>

      <h2>7. Güvenlik Önlemleri</h2>
      <p>
        Verilerinizin korunması için; bcrypt parola hashlemesi, JWT tabanlı kimlik doğrulama,
        HTTPS zorunluluğu, hız sınırlandırma (rate limiting), HTTP güvenlik başlıkları (Helmet)
        ve yük sınırı (50 MB) uygulanmaktadır.
      </p>

      <h2>8. Çerezler</h2>
      <p>
        Çerez kullanımına ilişkin ayrıntılı bilgi için{' '}
        <a href="/cerez-politikasi">Çerez Politikamızı</a> inceleyiniz.
      </p>

      <h2>9. Bu Metnin Güncellenmesi</h2>
      <p>
        Bu metin, yasal düzenlemeler veya platform özellikleri değiştiğinde güncellenebilir.
        Önemli değişiklikler hesabınıza kayıtlı e-posta adresinize bildirilir.
      </p>
    </article>
  );
}
