export default function KvkkAydinlatmaPage() {
  return (
    <main className="min-h-screen bg-mint px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="font-display text-2xl font-bold text-slate">
          KVKK Aydınlatma Metni
        </h1>
        <p className="font-body text-xs text-slate-light italic">
          Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) md. 10
          uyarınca hazırlanmış bir TASLAK metindir. Yayına alınmadan önce bir avukat
          tarafından incelenmesi ve onaylanması gerekmektedir.
        </p>

        <section className="space-y-3 font-body text-sm text-slate leading-relaxed">
          <h2 className="font-display text-lg font-bold text-slate">1. Veri Sorumlusu</h2>
          <p>
            YouHaveMi (&quot;Platform&quot;), işbu aydınlatma metni kapsamında 6698 sayılı
            Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca &quot;veri sorumlusu&quot;
            sıfatıyla hareket etmektedir. Veri sorumlusunun güncel iletişim ve tescil
            bilgileri Platform&apos;un resmi internet sitesinde yayınlanacaktır.
          </p>

          <h2 className="font-display text-lg font-bold text-slate">2. İşlenen Kişisel Veriler</h2>
          <p>Platform&apos;u kullanırken aşağıdaki kişisel verileriniz işlenmektedir:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Telefon numarası:</strong> Kimlik doğrulama (SMS ile tek kullanımlık
              kod gönderimi) amacıyla toplanır. Numaranız geri döndürülemez şekilde
              (hash&apos;lenerek) saklanır; ayrıca hukuki yükümlülüklerin yerine getirilmesi
              amacıyla, ayrı ve şifreli bir kayıtta geri döndürülebilir şekilde de
              saklanır (bkz. Madde 5).
            </li>
            <li>
              <strong>Gönderdiğiniz/aldığınız mesaj içerikleri:</strong> Platform&apos;un temel
              işlevi olan mesajlaşma hizmetinin sunulması amacıyla işlenir.
            </li>
            <li>
              <strong>Avatar tercihi:</strong> Gerçek kimlik bilgisi taşımayan, tamamen
              görsel bir tercih olarak saklanır.
            </li>
            <li>
              <strong>Kullanım ve işlem kayıtları:</strong> IP adresi, cihaz/tarayıcı
              bilgisi (User-Agent), erişim zamanı, yapılan işlemler (giriş, mesaj
              gönderme, engelleme, şikayet vb.) — güvenlik, kötüye kullanımın önlenmesi
              ve hukuki ispat amacıyla kaydedilir.
            </li>
            <li>
              <strong>E-posta adresi (opsiyonel):</strong> Yalnızca kullanıcı bir mesaj
              gönderirken alıcı için ek bildirim kanalı olarak eklemeyi tercih ederse
              işlenir.
            </li>
          </ul>

          <h2 className="font-display text-lg font-bold text-slate">3. İşleme Amaçları</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Kimlik doğrulama ve hesap güvenliğinin sağlanması</li>
            <li>Mesajlaşma hizmetinin sunulması</li>
            <li>Kötüye kullanımın (taciz, spam, dolandırıcılık) tespiti ve önlenmesi</li>
            <li>Yasal yükümlülüklerin yerine getirilmesi ve hukuki taleplere cevap verilebilmesi</li>
            <li>Hizmet kalitesinin iyileştirilmesi</li>
          </ul>

          <h2 className="font-display text-lg font-bold text-slate">4. Hukuki Sebep</h2>
          <p>
            Kişisel verileriniz, KVKK md. 5/2 kapsamında; bir sözleşmenin kurulması veya
            ifasıyla doğrudan ilgili olması, hukuki yükümlülüğün yerine getirilmesi ve
            veri sorumlusunun meşru menfaati hukuki sebeplerine dayanılarak işlenmektedir.
            Bunların yeterli olmadığı işleme faaliyetleri için (bkz. Madde 5) ayrıca açık
            rızanız alınmaktadır.
          </p>

          <h2 className="font-display text-lg font-bold text-slate">5. Saklama Süresi</h2>
          <p>
            Mesaj içerikleri, &quot;okunduktan sonra sil&quot; özelliği seçildiğinde
            kullanıcı arayüzünden ve normal veritabanı kaydından kaldırılır; ancak
            hukuki ispat/belgeleme yükümlülüğü kapsamında şifreli bir kopyası ayrı bir
            arşivde <strong>en fazla 2 yıl</strong> süreyle saklanır ve bu sürenin sonunda
            silinir. İşlem kayıtları (audit log) da aynı süre boyunca saklanır. Telefon
            numarasının geri döndürülebilir şifreli kaydı, hesabınız aktif olduğu sürece
            ve hesap silme talebinizden sonra yasal saklama süreleri kadar tutulur.
          </p>

          <h2 className="font-display text-lg font-bold text-slate">6. Kişisel Verilerin Aktarımı</h2>
          <p>
            Kişisel verileriniz; SMS gönderim hizmeti aldığımız yetkili SMS operatörü,
            barındırma (hosting) hizmeti aldığımız altyapı sağlayıcıları ve hata izleme
            hizmeti aldığımız teknik hizmet sağlayıcı ile, yalnızca hizmetin sunulması
            için gerekli ölçüde paylaşılabilir. Yasal bir talep (mahkeme kararı,
            savcılık talebi vb.) halinde, ilgili resmi makamlarla mevzuatın öngördüğü
            ölçüde paylaşılabilir.
          </p>

          <h2 className="font-display text-lg font-bold text-slate">7. Haklarınız (KVKK md. 11)</h2>
          <p>KVKK md. 11 uyarınca, veri sorumlusuna başvurarak aşağıdaki haklara sahipsiniz:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
            <li>İşlenmişse buna ilişkin bilgi talep etme</li>
            <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
            <li>Eksik/yanlış işlenmişse düzeltilmesini isteme</li>
            <li>Silinmesini veya yok edilmesini isteme (Ayarlar &gt; Hesabı Sil ile de talep edilebilir)</li>
            <li>İşlemenin kanuna aykırı olması durumunda zararın giderilmesini talep etme</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
