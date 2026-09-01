import type { Metadata } from "next";
import Link from "next/link";
import { Bot, CircleDollarSign, Lock, ShieldCheck, Trash2, Eye, Server, KeyRound } from "lucide-react";
import SiteShell from "@/app/components/site-shell";

const sections = [
  {
    icon: Bot,
    title: "AI nasıl çalışır?",
    content: [
      "AI Belge Asistanı PDF, DOCX, TXT, XLSX, XLS ve CSV dosyalarını önce Convertly backend'inde doğrular ve ayrıştırır. Dosyanın binary hali uzak sunucuya gönderilmez; özetleme, çeviri, analiz veya soru-cevap için gerekli metin ya da yapılandırılmış tablo bölümleri gönderilir.",
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
      "Gizli mod etkinleştirildiğinde dosyalarınız tarayıcınızda ve cihazınızda işlenir. Görsel, ses ve video dönüşümleri tamamen istemci tarafında gerçekleşir; dosya içeriği sunucularımıza yüklenmez.",
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
      "Kayıtlı dönüşüm çıktıları için şu anda otomatik bir saklama süresi veya kullanıcı arayüzünden silme düğmesi uygulanmamıştır. Silme talebi için iletişim kanalını kullanabilirsiniz. Bu sınırlama giderilene kadar hassas dosyalarda gizli modu tercih edin.",
    ],
  },
  {
    icon: Lock,
    title: "Şifreleme ve veri koruması",
    content: [
      "Üretim ortamında tüm bağlantılar HTTPS üzerinden şifrelenir. Tarayıcı ile sunucu arasındaki veri aktarımı TLS ile korunur.",
      "Hesap şifreleriniz bcrypt algoritması ile hashlenerek saklanır; düz metin şifre hiçbir zaman veritabanına yazılmaz.",
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
      "Veritabanı bağlantıları kimlik bilgileriyle yapılandırılır. AI özellikleri kullanılmadığında dönüşüm içeriği bir AI sağlayıcısına gönderilmez; AI kullanıldığında gerekli ayrıştırılmış içerikler yukarıda açıklanan şekilde OpenRouter'a iletilir.",
    ],
  },
  {
    icon: KeyRound,
    title: "Hesap ve oturum güvenliği",
    content: [
      "Oturum çerezleri 30 gün sonra otomatik olarak sona erer. Çıkış yaptığınızda oturum belirteci sunucudan kalıcı olarak silinir.",
      "Şifreler minimum 8 karakter uzunluğunda olmalıdır ve kayıt sırasında güçlü hash ile saklanır.",
      "Uygulamada şu anda kullanıcı tarafından başlatılan otomatik hesap silme akışı bulunmamaktadır. Hesap ve bağlı veriler için silme talebi iletişim sayfasından iletilebilir.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Tasarım gereği gizlilik",
    content: [
      "Convertly, dosyalarınızı pazarlama veya analiz amacıyla toplamaz. Dönüştürme işlemi sizin kontrolünüzdedir.",
      "Gizli mod ile hassas belgelerinizi tamamen kendi cihazınızda işleyebilirsiniz. Word ve PowerPoint dönüşümleri için yerel Docker kurulumu önerilir.",
      "Sorularınız veya veri silme talepleriniz için iletişim sayfamızdan bize ulaşabilirsiniz.",
    ],
  },
  {
    icon: CircleDollarSign,
    title: "Ücretsiz ve reklamsız",
    content: [
      "Convertly şu anda kullanıcılar için ücretsizdir ve reklam göstermez. Kullanıcı deneyimi reklam izleme sistemleri üzerine kurulmamıştır. OpenRouter kullanım limitleri veya maliyetleri uygulamanın yapılandırmasına bağlı olabilir.",
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
