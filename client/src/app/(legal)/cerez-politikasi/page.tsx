import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Çerez Politikası | Slaytim',
  description:
    "Slaytim'in kullandığı çerez türleri, amaçları ve Google AdSense reklam çerezleri hakkında bilgi.",
  alternates: { canonical: 'https://slaytim.com/cerez-politikasi' },
};

const LAST_UPDATED = '28 Mart 2026';

export default function CerezPolitikasiPage() {
  return (
    <article className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
      <h1>Çerez Politikası</h1>
      <p className="text-muted-foreground text-sm">Son güncelleme: {LAST_UPDATED}</p>

      <p>
        Bu politika, <strong>slaytim.com</strong> ("Site") ziyaretiniz sırasında hangi çerezlerin
        kullanıldığını, neden kullanıldığını ve nasıl yönetebileceğinizi açıklamaktadır.
      </p>

      <h2>1. Çerez Nedir?</h2>
      <p>
        Çerezler, web sitelerinin tarayıcınıza kaydettiği küçük metin dosyalarıdır. Oturum
        yönetimi, tercihlerin hatırlanması ve kullanım istatistikleri gibi işlevler için kullanılır.
      </p>

      <h2>2. Kullandığımız Çerez Türleri</h2>

      <h3>2.1 Zorunlu Çerezler</h3>
      <p>
        Sitenin temel işlevleri için zorunludur; onay gerekmez ve devre dışı bırakılamaz.
      </p>
      <table>
        <thead>
          <tr>
            <th>Çerez Adı</th>
            <th>Amaç</th>
            <th>Süre</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>slaytim-consent</code></td>
            <td>Çerez tercihlerinizin hatırlanması</td>
            <td>1 yıl</td>
          </tr>
          <tr>
            <td><code>auth-token</code> (localStorage)</td>
            <td>Oturum kimlik doğrulaması (JWT)</td>
            <td>7 gün</td>
          </tr>
        </tbody>
      </table>

      <h3>2.2 Analitik Çerezler</h3>
      <p>
        Sitenin nasıl kullanıldığını anlamamıza yardımcı olur. Yalnızca onayınız hâlinde etkinleşir.
      </p>
      <table>
        <thead>
          <tr>
            <th>Sağlayıcı</th>
            <th>Amaç</th>
            <th>Süre</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Google Analytics</td>
            <td>Sayfa görüntüleme, trafik kaynağı analizi</td>
            <td>2 yıl</td>
          </tr>
        </tbody>
      </table>

      <h3>2.3 Reklam ve Pazarlama Çerezleri</h3>
      <p>
        Kişiselleştirilmiş reklam gösterimi için kullanılır. Yalnızca onayınız hâlinde etkinleşir.
      </p>
      <table>
        <thead>
          <tr>
            <th>Sağlayıcı</th>
            <th>Amaç</th>
            <th>Süre</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Google AdSense</td>
            <td>Kişiselleştirilmiş reklam gösterimi</td>
            <td>13 ay</td>
          </tr>
          <tr>
            <td>Google DoubleClick</td>
            <td>Reklam frekans sınırlaması ve raporlama</td>
            <td>13 ay</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Google AdSense ve Gizlilik</h2>
      <p>
        Slaytim, içerik finansmanını desteklemek amacıyla <strong>Google AdSense</strong> reklamcılık
        hizmetini kullanmaktadır. Google AdSense çalışma şekli:
      </p>
      <ul>
        <li>
          Google, sizi ve diğer kullanıcıları yeniden tanımlayabilmek amacıyla <strong>DoubleClick
          çerezi</strong> ve benzeri teknolojiler kullanabilir.
        </li>
        <li>
          Bu çerezler, ilgi alanlarınıza dayalı reklamların gösterilmesini sağlar.
        </li>
        <li>
          Tarayıcı parmak izi ve benzeri reklamcılık tanımlayıcıları da kullanılabilir.
        </li>
        <li>
          Toplanan veriler Google'ın gizlilik politikasına tabidir:{' '}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            policies.google.com/privacy
          </a>
        </li>
      </ul>
      <p>
        <strong>Kişiselleştirilmiş reklamları devre dışı bırakmak için:</strong>{' '}
        <a
          href="https://www.google.com/settings/ads"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google Reklam Ayarları
        </a>{' '}
        sayfasını ziyaret edebilir veya{' '}
        <a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer">
          YourAdChoices
        </a>{' '}
        üzerinden çıkış yapabilirsiniz.
      </p>

      <h2>4. Çerez Tercihlerinizi Yönetme</h2>
      <p>Tercihlerinizi iki şekilde güncelleyebilirsiniz:</p>
      <ul>
        <li>
          <strong>Çerez Banner:</strong> Site ilk ziyaretinizde ekranın altında belirir. "Özelleştir"
          seçeneğiyle ayrıntılı tercih belirleyebilirsiniz.
        </li>
        <li>
          <strong>Tarayıcı ayarları:</strong> Tüm çerezleri tarayıcınızdan yönetebilir veya
          silebilirsiniz. Bu, sitenin bazı işlevlerini etkileyebilir.
        </li>
      </ul>
      <p>
        Zorunlu çerezler dışındaki tüm çerezleri reddetmek için "Yalnızca Zorunlu" seçeneğini
        kullanabilirsiniz.
      </p>

      <h2>5. Üçüncü Taraf Bağlantıları</h2>
      <p>
        Site, üçüncü taraf web sitelerine bağlantılar içerebilir. Bu sitelerin çerez uygulamaları
        Slaytim'in sorumluluğunda değildir.
      </p>

      <h2>6. Bu Politikanın Güncellenmesi</h2>
      <p>
        Bu politika gerektiğinde güncellenebilir. Önemli değişikliklerde onay bannerı yeniden
        gösterilir.
      </p>

      <h2>7. İletişim</h2>
      <p>
        Çerez uygulamalarımız hakkında sorularınız için:{' '}
        <a href="mailto:kvkk@slaytim.com">kvkk@slaytim.com</a>
      </p>
      <p>
        KVKK kapsamındaki haklarınız için <Link href="/kvkk">KVKK Aydınlatma Metnimizi</Link> inceleyiniz.
      </p>
    </article>
  );
}
