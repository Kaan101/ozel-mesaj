export default function AcikRizaPage() {
  return (
    <main className="min-h-screen bg-mint px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="font-display text-2xl font-bold text-slate">Açık Rıza Metni</h1>
        <p className="font-body text-xs text-slate-light italic">
          Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) kapsamında
          hazırlanmış bir TASLAK metindir. Yayına alınmadan önce bir avukat tarafından
          incelenmesi ve onaylanması gerekmektedir.
        </p>

        <section className="space-y-3 font-body text-sm text-slate leading-relaxed">
          <p>
            İşbu Açık Rıza Metni&apos;ni, ekinde/bağlantısında yer alan{" "}
            <strong>KVKK Aydınlatma Metni</strong>&apos;ni okuduğumu ve içeriğini anladığımı
            beyan ederek onaylıyorum. Buna göre:
          </p>

          <ol className="list-decimal pl-5 space-y-2">
            <li>
              Telefon numaramın; kimlik doğrulama amacıyla SMS gönderimi için
              kullanılmasına, hash&apos;lenerek saklanmasına ve <strong>hukuki ispat/belgeleme
              yükümlülüğünün yerine getirilmesi amacıyla ayrıca şifreli ve geri
              döndürülebilir şekilde saklanmasına</strong> açıkça rıza gösteriyorum.
            </li>
            <li>
              Platform üzerinden gönderdiğim/aldığım mesajların, &quot;okunduktan sonra
              sil&quot; seçeneğini kullansam bile, <strong>hukuki ispat/belgeleme amacıyla
              şifreli bir kopyasının en fazla 2 yıl süreyle ayrı bir arşivde
              saklanabileceğini</strong> anladığımı ve buna rıza gösterdiğimi beyan ederim.
            </li>
            <li>
              IP adresim, cihaz/tarayıcı bilgim ve platform üzerindeki işlemlerimin
              (giriş, mesaj gönderme, engelleme, şikayet vb.) güvenlik ve hukuki ispat
              amacıyla kayıt altına alınmasına rıza gösteriyorum.
            </li>
            <li>
              18 yaşından büyük olduğumu ve bu platformu kullanmaya hukuken ehil
              olduğumu beyan ederim.
            </li>
          </ol>

          <p>
            Bu rızamı, KVKK md. 11 kapsamındaki haklarım çerçevesinde, Ayarlar
            ekranından hesabımı silerek veya veri sorumlusuna başvurarak istediğim
            zaman geri çekebileceğimi biliyorum. Rızamın geri çekilmesi, geri
            çekilmeden önce yapılan işlemlerin hukuka uygunluğunu etkilemez.
          </p>
        </section>
      </div>
    </main>
  );
}
