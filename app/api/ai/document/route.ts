import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionUserId, sessionCookieName } from "@/lib/auth";
import { openRouterChat, relevantPassages, splitDocument } from "@/lib/openrouter";

export const runtime = "nodejs";
const maximumTextLength = 300_000;

async function authenticated() {
  const cookieStore = await cookies();
  return Boolean(await getSessionUserId(cookieStore.get(sessionCookieName)?.value));
}

export async function POST(request: Request) {
  if (!(await authenticated())) return NextResponse.json({ error: "Bu özellik için giriş yapmalısınız." }, { status: 401 });

  try {
    const { action, text, question, sourceLanguage, targetLanguage, history } = await request.json();
    if (typeof text !== "string" || !text.trim()) return NextResponse.json({ error: "Belge metni bulunamadı." }, { status: 400 });
    if (text.length > maximumTextLength) return NextResponse.json({ error: "Belge çok uzun. En fazla yaklaşık 300.000 karakter işlenebilir." }, { status: 413 });

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

    const chunks = splitDocument(text);
    if (action === "analyze") {
      const partials: string[] = [];
      for (let index = 0; index < chunks.length; index += 1) {
        partials.push(await openRouterChat([
          { role: "system", content: "Tablo/veri bölümünü analiz et. Çalışma sayfalarını, sütunları, satırları, sayısal değerleri, kategorileri, eksik değerleri, toplam/ortalama/minimum/maksimumları, eğilimleri ve dikkat çeken ilişkileri yalnızca verilen veriye dayanarak belirt. Uydurma hesap yapma; veri yetersizse açıkça yaz." },
          { role: "user", content: `Veri bölümü ${index + 1}/${chunks.length}:\n${chunks[index]}` },
        ], 1400));
      }
      const result = partials.length === 1 ? partials[0] : await openRouterChat([
        { role: "system", content: "Parça analizlerini tek bir profesyonel veri analizi raporunda birleştir. Tekrarları kaldır. Genel Bakış, Veri Kalitesi, Sayısal Bulgular, Eğilimler ve Sonuç başlıklarını kullan. Yalnızca sağlanan bulgulara dayan." },
        { role: "user", content: partials.join("\n\n---\n\n") },
      ], 2000);
      return NextResponse.json({ result });
    }

    if (action === "summarize") {
      const partials: string[] = [];
      for (let index = 0; index < chunks.length; index += 1) {
        partials.push(await openRouterChat([
          { role: "system", content: "Verilen belge bölümünü yalnızca içeriğine dayanarak yapılandırılmış biçimde özetle. Belge Başlığı, Genel Bakış, Temel Noktalar, Önemli Bulgular, Önemli Sayısal Veriler ve Sonuç başlıklarından uygun olanları Markdown başlıklarıyla kullan. Ana fikirleri, tarihleri, kararları ve sayısal verileri koru; yeni bilgi ekleme. Türkçe yaz." },
          { role: "user", content: `Bölüm ${index + 1}/${chunks.length}:\n\n${chunks[index]}` },
        ], 1000));
      }
      const result = partials.length === 1 ? partials[0] : await openRouterChat([
        { role: "system", content: "Bölüm özetlerini tekrarları kaldırarak profesyonel ve yapılandırılmış bir Türkçe özete dönüştür. Belge Başlığı, Genel Bakış, Temel Noktalar, Önemli Bulgular, Önemli Sayısal Veriler ve Sonuç başlıklarından belgeye uygun olanları kullan. Markdown başlıkları ve madde işaretleri kullan. Kaynakta olmayan bilgi ekleme." },
        { role: "user", content: partials.map((item, index) => `BÖLÜM ${index + 1}\n${item}`).join("\n\n") },
      ], 1800);
      return NextResponse.json({ result });
    }

    if (action === "translate") {
      if (typeof targetLanguage !== "string" || !targetLanguage.trim()) return NextResponse.json({ error: "Hedef dil gerekli." }, { status: 400 });
      const translated: string[] = [];
      for (let index = 0; index < chunks.length; index += 1) {
        translated.push(await openRouterChat([
          { role: "system", content: `Kaynak dil: ${sourceLanguage || "otomatik algıla"}. Metni ${targetLanguage} diline eksiksiz çevir. Özetleme yapma. Başlıkları, paragrafları, madde işaretlerini, sayıları ve tablo benzeri satır düzenini mümkün olduğunca koru. Açıklama veya yorum ekleme.` },
          { role: "user", content: chunks[index] },
        ], 3000));
      }
      return NextResponse.json({ result: translated.join("\n\n") });
    }

    return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI işlemi tamamlanamadı." }, { status: 500 });
  }
}
