import "server-only";

type Message = { role: "system" | "user" | "assistant"; content: string };

export async function openRouterChat(messages: Message[], maxTokens = 1800) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY yapılandırılmamış.");

  const conversation = [...messages];
  const parts: string[] = [];
  const primaryModel = process.env.OPENROUTER_MODEL ?? "openrouter/free";
  const configuredFallbacks = (process.env.OPENROUTER_FALLBACK_MODELS ?? "openrouter/free")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
  const models = [...new Set([primaryModel, ...configuredFallbacks])];
  let modelIndex = 0;
  let lastError = "AI sağlayıcısı yanıt oluşturamadı.";

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const model = models[Math.min(modelIndex, models.length - 1)];
    let response: Response;
    try {
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001", "X-Title": "Convertly" },
        body: JSON.stringify({ model, messages: conversation, temperature: 0.2, max_tokens: maxTokens, reasoning: { effort: "none", exclude: true } }),
        cache: "no-store",
        signal: AbortSignal.timeout(75_000),
      });
    } catch (error) {
      lastError = error instanceof Error ? error.message : "AI sağlayıcısına bağlanılamadı.";
      if (modelIndex < models.length - 1) modelIndex += 1;
      continue;
    }
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      lastError = body?.error?.message ?? `OpenRouter isteği ${response.status} durumuyla başarısız oldu.`;
      if (modelIndex < models.length - 1) modelIndex += 1;
      if (attempt < 3) continue;
      throw new Error(lastError);
    }
    const content = body?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      lastError = `AI_PROVIDER_EMPTY_RESPONSE:${model}`;
      if (modelIndex < models.length - 1) { modelIndex += 1; continue; }
      conversation.push({ role: "user", content: "Önceki yanıt boş kaldı. Belge içeriğine dayanarak istenen yanıtı şimdi eksiksiz üret." });
      continue;
    }
    parts.push(content.trim());
    if (body?.choices?.[0]?.finish_reason !== "length") return parts.join("\n\n").trim();
    conversation.push({ role: "assistant", content });
    conversation.push({ role: "user", content: "Yanıt token sınırında kesildi. Kaldığın yerden, tekrar etmeden devam et ve bütün eksik bölümleri tamamla." });
  }
  if (parts.length) return parts.join("\n\n").trim();
  throw new Error(lastError);
}

export function splitDocument(text: string, maxCharacters = 10000) {
  const paragraphs = text.replace(/\r/g, "").split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length + 2 > maxCharacters) {
      chunks.push(current);
      current = "";
    }
    if (paragraph.length > maxCharacters) {
      if (current) chunks.push(current);
      for (let index = 0; index < paragraph.length; index += maxCharacters) chunks.push(paragraph.slice(index, index + maxCharacters));
    } else {
      current += `${current ? "\n\n" : ""}${paragraph}`;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function relevantPassages(text: string, question: string, limit = 10) {
  const terms = question.toLocaleLowerCase("tr-TR").match(/[\p{L}\p{N}]{3,}/gu) ?? [];
  const chunks = splitDocument(text, 3500);
  const ranked = chunks.map((chunk, index) => ({
      chunk,
      index,
      score: terms.reduce((score, term) => score + (chunk.toLocaleLowerCase("tr-TR").split(term).length - 1), 0),
    }));
  const selected = ranked.some(({ score }) => score > 0)
    ? ranked.sort((a, b) => b.score - a.score || a.index - b.index).slice(0, limit)
    : Array.from({ length: Math.min(limit, chunks.length) }, (_, position) => {
        const index = Math.round(position * Math.max(0, chunks.length - 1) / Math.max(1, Math.min(limit, chunks.length) - 1));
        return ranked[index];
      });
  return selected
    .sort((a, b) => a.index - b.index)
    .map(({ chunk }) => chunk)
    .join("\n\n---\n\n");
}
