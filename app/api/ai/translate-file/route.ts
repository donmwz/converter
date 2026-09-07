import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import JSZip from "jszip";
import { attachmentDisposition } from "@/lib/content-disposition";
import * as XLSX from "xlsx";
import { getSessionUserId, sessionCookieName } from "@/lib/auth";
import { openRouterChat, splitDocument } from "@/lib/openrouter";

export const runtime = "nodejs";
const maximumFileSize = 25 * 1024 * 1024;

async function authenticated() {
  const cookieStore = await cookies();
  return Boolean(await getSessionUserId(cookieStore.get(sessionCookieName)?.value));
}

function decodeXml(value: string) {
  return value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}

function encodeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

async function translateBatch(values: string[], sourceLanguage: string, targetLanguage: string) {
  if (!values.length) return [];
  const translated: string[] = [];
  const batches: string[][] = [];
  let batch: string[] = [];
  let batchCharacters = 0;
  for (const value of values) {
    if (batch.length && (batch.length >= 25 || batchCharacters + value.length > 6_000)) {
      batches.push(batch);
      batch = [];
      batchCharacters = 0;
    }
    batch.push(value);
    batchCharacters += value.length;
  }
  if (batch.length) batches.push(batch);

  async function translateItems(items: string[]): Promise<string[]> {
    if (items.length === 1 && items[0].length > 6_000) {
      const pieces = splitDocument(items[0], 5_500);
      const outputs: string[] = [];
      for (const piece of pieces) outputs.push((await translateItems([piece]))[0]);
      return [outputs.join("\n\n")];
    }
    const response = await openRouterChat([
      { role: "system", content: `Kaynak dil: ${sourceLanguage || "otomatik algıla"}. Her öğeyi ${targetLanguage} diline eksiksiz çevir. Sayıları, biçim işaretlerini ve boşlukları koru. Yalnızca girişle aynı uzunlukta geçerli bir JSON string dizisi döndür; açıklama veya markdown ekleme.` },
      { role: "user", content: JSON.stringify(items) },
    ], 4200);
    try {
      const json = response.match(/\[[\s\S]*\]/)?.[0] ?? response.replace(/^```(?:json)?\s*|\s*```$/g, "");
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed) || parsed.length !== items.length || parsed.some((item) => typeof item !== "string")) throw new Error();
      return parsed;
    } catch {
      if (items.length > 1) {
        const middle = Math.ceil(items.length / 2);
        const [left, right] = await Promise.all([
          translateItems(items.slice(0, middle)),
          translateItems(items.slice(middle)),
        ]);
        return [...left, ...right];
      }
      throw new Error("Çeviri yanıtı belge yapısına güvenli biçimde uygulanamadı. Lütfen tekrar deneyin.");
    }
  }

  for (const items of batches) translated.push(...await translateItems(items));
  return translated;
}

async function translateDocx(buffer: Buffer, sourceLanguage: string, targetLanguage: string) {
  const zip = await JSZip.loadAsync(buffer);
  const names = Object.keys(zip.files).filter((name) => /^word\/(document|header\d*|footer\d*)\.xml$/.test(name));
  for (const name of names) {
    const xml = await zip.file(name)?.async("string");
    if (!xml) continue;
    const matches = [...xml.matchAll(/<w:t([^>]*)>([\s\S]*?)<\/w:t>/g)];
    const source = matches.map((match) => decodeXml(match[2])).filter((value) => value.trim());
    const translated = await translateBatch(source, sourceLanguage, targetLanguage);
    let index = 0;
    const updated = xml.replace(/<w:t([^>]*)>([\s\S]*?)<\/w:t>/g, (whole, attributes, value) => {
      if (!decodeXml(value).trim()) return whole;
      return `<w:t${attributes}>${encodeXml(translated[index++] ?? decodeXml(value))}</w:t>`;
    });
    zip.file(name, updated);
  }
  return Buffer.from(await zip.generateAsync({ type: "uint8array" }));
}

async function translateWorkbook(buffer: Buffer, sourceLanguage: string, targetLanguage: string, extension: string) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true, cellStyles: true, cellFormula: true });
  const cells: XLSX.CellObject[] = [];
  const values: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    for (const address of Object.keys(sheet)) {
      if (address.startsWith("!")) continue;
      const cell = sheet[address];
      if (cell?.t === "s" && typeof cell.v === "string" && cell.v.trim()) {
        cells.push(cell);
        values.push(cell.v);
      }
    }
  }
  const translated = await translateBatch(values, sourceLanguage, targetLanguage);
  cells.forEach((cell, index) => { cell.v = translated[index]; cell.w = translated[index]; });
  return XLSX.write(workbook, { type: "buffer", bookType: extension === "xls" ? "xls" : extension === "csv" ? "csv" : "xlsx", cellStyles: true });
}

export async function POST(request: Request) {
  if (!(await authenticated())) return NextResponse.json({ error: "Bu özellik için giriş yapmalısınız." }, { status: 401 });
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const sourceLanguage = String(formData.get("sourceLanguage") ?? "Otomatik algıla");
    const targetLanguage = String(formData.get("targetLanguage") ?? "");
    if (!(file instanceof File) || !targetLanguage) return NextResponse.json({ error: "Dosya ve hedef dil gerekli." }, { status: 400 });
    if (file.size > maximumFileSize) return NextResponse.json({ error: "Dosya boyutu 25 MB sınırını aşıyor." }, { status: 413 });
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["docx", "txt", "xlsx", "xls", "csv"].includes(extension)) return NextResponse.json({ error: "Bu format için yapıyı koruyan çeviri desteklenmiyor." }, { status: 415 });
    const input = Buffer.from(await file.arrayBuffer());
    const isZip = input[0] === 0x50 && input[1] === 0x4b;
    const isLegacyExcel = input.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
    if ((["docx", "xlsx"].includes(extension) && !isZip) || (extension === "xls" && !isLegacyExcel) || (["txt", "csv"].includes(extension) && input.subarray(0, Math.min(input.length, 4096)).includes(0))) {
      return NextResponse.json({ error: "Dosyanın içeriği bildirilen dosya türüyle eşleşmiyor." }, { status: 415 });
    }
    let output: Buffer;
    let contentType: string;
    if (extension === "docx") {
      output = await translateDocx(input, sourceLanguage, targetLanguage);
      contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    } else if (extension === "txt") {
      const translated = await translateBatch([input.toString("utf8")], sourceLanguage, targetLanguage);
      output = Buffer.from(translated[0], "utf8");
      contentType = "text/plain; charset=utf-8";
    } else {
      output = await translateWorkbook(input, sourceLanguage, targetLanguage, extension);
      contentType = extension === "csv" ? "text/csv; charset=utf-8" : extension === "xls" ? "application/vnd.ms-excel" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }
    const base = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]/g, "_");
    return new Response(output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength) as ArrayBuffer, {
      headers: { "Content-Type": contentType, "Content-Disposition": attachmentDisposition(`${base}-${targetLanguage}.${extension}`), "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Belge çevrilemedi." }, { status: 500 });
  }
}
