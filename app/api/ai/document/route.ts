import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionUserId, sessionCookieName } from "@/lib/auth";
import { openRouterChat, relevantPassages, splitDocument } from "@/lib/openrouter";

export const runtime = "nodejs";
export const maxDuration = 300;
const maximumTextLength = 600_000;

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, worker: (item: T, index: number) => Promise<R>) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  async function run() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
  return results;
}

async function mergeSummaries(partials: string[]) {
  let level = partials;
  while (level.length > 1) {
    const groups: string[][] = [];
    let group: string[] = [];
    let size = 0;
    for (const partial of level) {
      if (group.length && size + partial.length > 28_000) {
        groups.push(group);
        group = [];
        size = 0;
      }
      group.push(partial);
      size += partial.length;
    }
    if (group.length) groups.push(group);
    level = [];
    for (const items of groups) {
      level.push(await openRouterChat([
        { role: "system", content: "Bölüm özetlerini sırasını ve tüm önemli bilgileri koruyarak tek bir profesyonel Türkçe özette birleştir. Tekrarları kaldır; tarihleri, kararları, sayısal verileri ve belgenin son bölümlerini atlama. Markdown başlıkları ve kısa madde işaretleri kullan. Kaynakta olmayan bilgi ekleme." },
        { role: "user", content: items.map((item, index) => `BÖLÜM ${index + 1}\n${item}`).join("\n\n---\n\n") },
      ], 3200));
    }
  }
  return level[0] ?? "";
}

async function authenticated() {
  const cookieStore = await cookies();
  return Boolean(await getSessionUserId(cookieStore.get(sessionCookieName)?.value));
}

export async function POST(request: Request) {
  if (!(await authenticated())) return NextResponse.json({ error: "Bu özellik için giriş yapmalısınız." }, { status: 401 });

  try {
    const { action, text, question, sourceLanguage, targetLanguage, history } = await request.json();
    if (typeof text !== "string" || !text.trim()) return NextResponse.json({ error: "Belge metni bulunamadı." }, { status: 400 });
    if (text.length > maximumTextLength) return NextResponse.json({ error: "Belge çok uzun. En fazla yaklaşık 600.000 karakter işlenebilir." }, { status: 413 });

    if (action === "suggestions") {
      const context = splitDocument(text, 6500)[0];
      const raw = await openRouterChat([
        { role: "system", content: "Belge içeriğine özel, kullanıcının belgeyi anlamasına yardımcı olacak 4 kısa başlangıç sorusu üret. Sorular belgede gerçekten yanıtlanabilir olsun. Her satırda yalnızca bir soru yaz; numara, açıklama veya madde işareti ekleme." },
        { role: "user", content: context },
      ], 350);
      const suggestions = raw.split("\n").map((item) => item.replace(/^[-•*\d.)\s]+/, "").trim()).filter((item) => item.endsWith("?")).slice(0, 5);
      return NextResponse.json({ suggestions });
    }

    if (action === "ask") {
      if (typeof question !== "string" || !question.trim()) return NextResponse.json({ error: "Soru gerekli." }, { status: 400 });
      const context = relevantPassages(text, question);
      const safeHistory = Array.isArray(history) ? history.slice(-6).filter((item) => item && ["user", "assistant"].includes(item.role) && typeof item.content === "string").map((item) => ({ role: item.role as "user" | "assistant", content: item.content.slice(0, 1500) })) : [];
      const result = await openRouterChat([
        { role: "system", content: "Yalnızca verilen belge bölümlerine dayanarak yanıt ver. Belge dışındaki konulara cevap verme. Yanıt belgede yoksa aynen 'Bu bilgi yüklenen belgede bulunmuyor.' de. Tahmin etme ve harici bilgi kullanma. Yanıtı Türkçe ve kısa ver." },
        ...safeHistory,
        { role: "user", content: `BELGE BÖLÜMLERİ:\n${context}\n\nSORU:\n${question}` },
      ], 900);
      return NextResponse.json({ result });
    }

    const chunks = splitDocument(text, action === "translate" ? 6_000 : 10_000);
    if (action === "analyze") {
      const partials = await mapWithConcurrency(chunks, 3, (chunk, index) => openRouterChat([
          { role: "system", content: "Tablo/veri bölümünü analiz et. Çalışma sayfalarını, sütunları, satırları, sayısal değerleri, kategorileri, eksik değerleri, toplam/ortalama/minimum/maksimumları, eğilimleri ve dikkat çeken ilişkileri yalnızca verilen veriye dayanarak belirt. Uydurma hesap yapma; veri yetersizse açıkça yaz." },
          { role: "user", content: `Veri bölümü ${index + 1}/${chunks.length}:\n${chunk}` },
        ], 1400));
      const result = partials.length === 1 ? partials[0] : await openRouterChat([
        { role: "system", content: "Parça analizlerini tek bir profesyonel veri analizi raporunda birleştir. Tekrarları kaldır. Genel Bakış, Veri Kalitesi, Sayısal Bulgular, Eğilimler ve Sonuç başlıklarını kullan. Yalnızca sağlanan bulgulara dayan." },
        { role: "user", content: partials.join("\n\n---\n\n") },
      ], 2000);
      return NextResponse.json({ result });
    }

    if (action === "summarize") {
      const partials = await mapWithConcurrency(chunks, 3, (chunk, index) => openRouterChat([
          { role: "system", content: "Verilen belge bölümünü yalnızca içeriğine dayanarak yapılandırılmış biçimde özetle. Belge Başlığı, Genel Bakış, Temel Noktalar, Önemli Bulgular, Önemli Sayısal Veriler ve Sonuç başlıklarından uygun olanları Markdown başlıklarıyla kullan. Ana fikirleri, tarihleri, kararları ve sayısal verileri koru; yeni bilgi ekleme. Türkçe yaz." },
          { role: "user", content: `Bölüm ${index + 1}/${chunks.length}:\n\n${chunk}` },
        ], 1600));
      const result = partials.length === 1 ? partials[0] : await mergeSummaries(partials);
      return NextResponse.json({ result });
    }

    if (action === "translate") {
      if (typeof targetLanguage !== "string" || !targetLanguage.trim()) return NextResponse.json({ error: "Hedef dil gerekli." }, { status: 400 });
      const translated = await mapWithConcurrency(chunks, 3, (chunk) => openRouterChat([
          { role: "system", content: `Kaynak dil: ${sourceLanguage || "otomatik algıla"}. Metni ${targetLanguage} diline eksiksiz çevir. Özetleme yapma. Başlıkları, paragrafları, madde işaretlerini, sayıları ve tablo benzeri satır düzenini mümkün olduğunca koru. Açıklama veya yorum ekleme.` },
          { role: "user", content: chunk },
        ], 4200));
      return NextResponse.json({ result: translated.join("\n\n") });
    }

    return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 });
  } catch (error) {
    console.error("Belge AI işlemi başarısız:", error);
    return NextResponse.json(
      { error: "Şu anda AI sunucularımızda geçici bir sorun yaşıyoruz. Lütfen kısa bir süre sonra tekrar deneyin." },
      { status: 503 },
    );
  }
}
