import "server-only";

type Message = { role: "system" | "user" | "assistant"; content: string };

export async function openRouterChat(messages: Message[], maxTokens = 1800) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY yapılandırılmamış.");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001",
      "X-Title": "Convertly",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL ?? "inclusionai/ling-3.0-flash-fin:free",
      messages,
      temperature: 0.2,
      max_tokens: maxTokens,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(50_000),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message ?? "OpenRouter isteği başarısız oldu.");
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("AI boş yanıt döndürdü.");
  return content.trim();
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

export function relevantPassages(text: string, question: string, limit = 4) {
  const terms = question.toLocaleLowerCase("tr-TR").match(/[\p{L}\p{N}]{3,}/gu) ?? [];
  return splitDocument(text, 3500)
    .map((chunk, index) => ({
      chunk,
      index,
      score: terms.reduce((score, term) => score + (chunk.toLocaleLowerCase("tr-TR").split(term).length - 1), 0),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ chunk }) => chunk)
    .join("\n\n---\n\n");
}
