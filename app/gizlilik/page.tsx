import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Bot, CircleDollarSign, FileText, Lock, ShieldCheck, Trash2, Eye, Server, KeyRound } from "lucide-react";
import SiteShell from "@/app/components/site-shell";

const sections = [
  {
    icon: Bot,
    title: "AI nasıl çalışır?",
    content: [
      "AI Belge Asistanı PDF, DOCX, HTML, TXT, XLSX, XLS ve CSV dosyalarını önce Convertly sunucusunda geçici olarak doğrular ve ayrıştırır. Kaynak dosya, metni çıkarabilmek için sunucuya yüklenir; dosyanın kendisi AI model sağlayıcısına gönderilmez. OpenRouter üzerinden yalnızca özetleme, çeviri, analiz veya soru-cevap için gerekli çıkarılmış metin ya da yapılandırılmış tablo bölümleri iletilir.",
      "AI istekleri OpenRouter API üzerinden .env yapılandırmasında seçilen modele yönlendirilir. Kullanılan model OPENROUTER_MODEL ayarına göre değişebilir. İçeriğin gönderilme amacı yalnızca kullanıcının başlattığı AI işlemini gerçekleştirmektir.",
      "Uzun belgeler token sınırını yönetmek için parçalara ayrılır. Soru-cevap sırasında tüm belge yerine soruyla en alakalı bölümler seçilir. AI yanıtları hata içerebilir; kritik bilgiler kaynak belgeyle doğrulanmalıdır.",
      "AI sohbetleri şu anda veritabanına kaydedilmez; açık sayfanın tarayıcı belleğinde tutulur ve sayfa yenilendiğinde kaybolur. İlk AI kullanımında gösterilen şeffaflık onayı yalnızca tarayıcınızın yerel depolamasında saklanır.",
      "AI sağlayıcısının verileri saklama veya model geliştirme amacıyla kullanma koşulları seçilen OpenRouter modeli ve sağlayıcısına bağlıdır. Convertly, sağlayıcı adına eğitim dışı kullanım garantisi vermez. Hassas veya paylaşılmaması gereken bilgileri AI özelliklerine göndermeyin.",
    ],
  },
  {
    icon: Eye,
    title: "Gizli mod ile yerel işleme",
    content: [
      "Gizli mod yalnızca tarayıcıda çalışabilen destekli dönüşümleri kapsar. Görsel, ses ve video işlemlerinde dosya cihazınızda işlenir ve sunucularımıza yüklenmez.",
      "Word, PowerPoint ve benzeri sunucu gerektiren dönüşümler gizli modda kullanılamaz; bunları kullanmak için standart moda geçmeniz gerekir. Belge AI da dosyayı ayrıştırmak için Convertly sunucusunu ve çıkarılmış içerik için harici AI sağlayıcısını kullandığından yerel işleme kapsamında değildir.",
      "Gizli modda dönüşüm geçmişi kaydı tutulmaz. Oturum açmış olsanız bile dosya adı, format veya sonuç bilgisi veritabanına yazılmaz.",
    ],
  },
  {
    icon: Trash2,
    title: "Dosyalar nasıl silinir?",
    content: [
      "Tarayıcıda yapılan dönüşümlerde kaynak ve hedef dosyalar yalnızca bellekte (RAM) tutulur. İndirme bağlantıları geçici blob URL'leridir; sayfayı kapattığınızda veya yeni bir dönüşüm başlattığınızda bu veriler otomatik olarak serbest bırakılır.",
      "Sunucu tarafı dönüşümlerde (Word, PowerPoint, Excel → PDF gibi) dosyanız geçici bir klasöre yazılır, dönüştürme tamamlandıktan sonra yanıt gönderilir ve geçici klasör işlem bitiminde kalıcı olarak silinir — başarılı veya başarısız olsun.",
      "Gizli modda çıktı dosyası sunucuya kaydedilmez. Normal modda, tekrar indirme özelliğini kullanabilmeniz için yalnızca tamamlanan çıktı kullanıcı hesabınıza bağlı özel depolama alanında saklanır; kaynak dosyanın geçici kopyası işlem sonunda silinir.",
      "Profilinizdeki Veriler ve hesap bölümünden tüm dönüşüm geçmişinizi ve kayıtlı dosyalarınızı kalıcı olarak silebilirsiniz. Hesabınızı silmeniz de bağlı oturumları, geçmişi ve dosyaları kaldırır.",
    ],
  },
  {
    icon: Lock,
    title: "Şifreleme ve veri koruması",
    content: [
      "Üretim ortamında tüm bağlantılar HTTPS üzerinden şifrelenir. Tarayıcı ile sunucu arasındaki veri aktarımı TLS ile korunur.",
      "Hesap şifreleriniz bcrypt algoritması ile hashlenerek saklanır; düz metin şifre hiçbir zaman veritabanına yazılmaz.",
      "Kayıtlı çıktı dosyaları depolamaya yazılmadan önce AES-256-GCM ile şifrelenir. Her kullanıcı için ana sunucu sırrından ayrı bir dosya anahtarı türetilir; depolamadaki ham nesneler okunabilir belge içermez.",
      "Oturum belirteçleri (session token) SHA-256 ile hashlenerek veritabanında tutulur. Çerezler httpOnly bayrağı ile korunur ve JavaScript tarafından okunamaz.",
      "Normal modda dönüşüm bilgileri ile tamamlanan çıktı dosyası, profilinizden yeniden indirebilmeniz için hesabınıza bağlı olarak saklanır. İndirme isteğinde oturum ve dosya sahipliği yeniden doğrulanır.",
    ],
  },
  {
    icon: Server,
    title: "Sunucu güvenliği",
    content: [
      "Sunucu tarafı dönüşümler izole geçici dizinlerde çalışır. Her istek için benzersiz bir klasör oluşturulur ve işlem sonunda temizlenir.",
      "Genel dönüşümlerde dosya boyutu 100 MB, AI belge işlemlerinde 25 MB ile sınırlandırılmıştır. AI yüklemelerinde uzantının yanında MIME türü de doğrulanır.",
      "RAR, 7Z ve ZIP çıkarma işlemlerinde arşiv yolları açılmadan önce denetlenir; güvenli olmayan üst dizin veya mutlak yol kayıtları reddedilir. Açılmış içerik 2.000 dosya ve toplam 500 MB ile sınırlandırılır.",
      "Veritabanı bağlantıları kimlik bilgileriyle yapılandırılır. AI özellikleri kullanılmadığında dönüşüm içeriği bir AI sağlayıcısına gönderilmez; AI kullanıldığında gerekli ayrıştırılmış içerikler yukarıda açıklanan şekilde OpenRouter'a iletilir.",
    ],
  },
  {
    icon: KeyRound,
    title: "Hesap ve oturum güvenliği",
    content: [
      "Oturum çerezleri 30 gün sonra otomatik olarak sona erer. Çıkış yaptığınızda oturum belirteci sunucudan kalıcı olarak silinir.",
      "Şifreler minimum 8 karakter uzunluğunda olmalıdır ve kayıt sırasında güçlü hash ile saklanır.",
      "İsteyen kullanıcılar profil ayarlarından e-posta ile iki faktörlü doğrulamayı etkinleştirebilir. Etkin hesaplarda doğru şifreden sonra Brevo üzerinden gönderilen 6 haneli ve 10 dakika geçerli kod doğrulanmadan oturum oluşturulmaz.",
      "Profil ekranından verilerinizin tamamını ZIP olarak indirebilir, yalnızca kayıtlı dönüşüm verilerini silebilir veya hesabınızı ve bağlı tüm verileri kalıcı olarak kaldırabilirsiniz.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Tasarım gereği gizlilik",
    content: [
      "Convertly, dosyalarınızı pazarlama veya analiz amacıyla toplamaz. Dönüştürme işlemi sizin kontrolünüzdedir.",
      "Gizli mod ile desteklenen görsel, ses ve video işlemlerini kendi cihazınızda gerçekleştirebilirsiniz. Sunucu gerektiren Office dönüşümleri gizli modda sunulmaz; kullanıcıdan Docker veya başka bir teknik kurulum beklenmez.",
      "Sorularınız veya veri silme talepleriniz için iletişim sayfamızdan bize ulaşabilirsiniz.",
    ],
  },
  {
    icon: CircleDollarSign,
    title: "Ücretsiz ve reklamsız",
    content: [
      "Convertly şu anda beta sürecinde ücretsizdir ve reklam göstermez. Genel dönüşümlerde dosya başına 100 MB, Belge AI işlemlerinde 25 MB sınırı vardır. Sabit bir günlük kota uygulanmaz; kötüye kullanımı önleme, altyapı kapasitesi ve OpenRouter sağlayıcı limitleri nedeniyle geçici sınırlar oluşabilir. Ücretli veya kurumsal bir plan henüz satışta değildir.",
    ],
  },
];

export const metadata: Metadata = {
  title: "Gizlilik ve Güvenlik | Convertly",
  description: "Convertly dosya güvenliği, gizli mod, şifreleme ve veri silme politikaları.",
};

export default function PrivacyPage() {
  return (
    <SiteShell active="privacy">
      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Gizlilik
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-gray-950 md:text-5xl">
            Gizlilik ve güvenlik
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-500">
            Gizlilik, güvenlik ve şeffaflık yaklaşımımızın temelidir. Dosyaların, hesap
            bilgilerinin ve AI işlemlerinin gerçekte nasıl işlendiğini aşağıda açıkça açıklıyoruz.
          </p>

          <a
            href="/belgeler/convertly-sistem-mimarisi-ve-guvenlik-rehberi.pdf"
            target="_blank"
            rel="noreferrer"
            className="group mt-10 flex flex-col gap-6 overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50/60 p-7 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-200">
                <FileText className="h-6 w-6" />
              </span>
              <span>
                <span className="block text-xs font-semibold uppercase tracking-wider text-violet-600">Herkese açık şeffaflık belgesi</span>
                <span className="mt-1 block text-lg font-semibold text-gray-950">Sistem Mimarisi ve Güvenlik Rehberi</span>
                <span className="mt-1 block text-sm leading-6 text-gray-500">Kullanılan servisleri, veri akışlarını, AI sınırlarını, 2FA&apos;yı ve dosya şifrelemeyi akış şemalarıyla inceleyin.</span>
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-violet-700">
              PDF&apos;yi görüntüle <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </span>
          </a>

          <div className="mt-14 space-y-10">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <article id={section.title === "AI nasıl çalışır?" ? "ai-seffafligi" : undefined} key={section.title} className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-8">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
                    <Icon className="h-6 w-6 text-gray-700" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-950">{section.title}</h2>
                  <div className="mt-4 space-y-3">
                    {section.content.map((paragraph) => (
                      <p key={paragraph.slice(0, 40)} className="leading-7 text-gray-600">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-12 rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-600">
              Gizlilik politikamız hakkında sorularınız mı var?
            </p>
            <Link
              href="/iletisim"
              className="mt-4 inline-flex rounded-xl bg-gray-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Bize ulaşın
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
