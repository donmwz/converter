import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import mammoth from "mammoth";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import { getSessionUserId, sessionCookieName } from "@/lib/auth";
import { forwardToConversionService, hasConversionService, isAuthorizedConversionServiceRequest } from "@/lib/conversion-service";

export const runtime = "nodejs";
const maximumFileSize = 25 * 1024 * 1024;
const execFileAsync = promisify(execFile);
const allowed = {
  pdf: ["application/pdf"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/octet-stream"],
  txt: ["text/plain", "application/octet-stream"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/octet-stream"],
  xls: ["application/vnd.ms-excel", "application/octet-stream"],
  csv: ["text/csv", "application/vnd.ms-excel", "text/plain", "application/octet-stream"],
  html: ["text/html", "application/xhtml+xml", "text/plain", "application/octet-stream"],
  htm: ["text/html", "application/xhtml+xml", "text/plain", "application/octet-stream"],
} as const;

async function userId() {
  const cookieStore = await cookies();
  return getSessionUserId(cookieStore.get(sessionCookieName)?.value);
}

function safeFileName(name: string) {
  return name.replace(/[\\/:*?"<>\x00-\x1F]/g, "_").slice(0, 180);
}

function validSignature(buffer: Buffer, extension: keyof typeof allowed) {
  if (extension === "pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (extension === "docx" || extension === "xlsx") return buffer[0] === 0x50 && buffer[1] === 0x4b;
  if (extension === "xls") return buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  if (extension === "html" || extension === "htm") {
    const sample = buffer.subarray(0, Math.min(buffer.length, 8192)).toString("utf8").replace(/^\uFEFF/, "");
    return !buffer.subarray(0, Math.min(buffer.length, 4096)).includes(0) && /<(?:!doctype\s+html|html|head|body|meta|title|main|article|section|div|p|h[1-6]|table|ul|ol|li|a|span|form)\b/i.test(sample);
  }
  return !buffer.subarray(0, Math.min(buffer.length, 4096)).includes(0);
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code: string) => {
      const value = code.startsWith("x") ? parseInt(code.slice(1), 16) : parseInt(code, 10);
      return Number.isSafeInteger(value) && value >= 0 && value <= 0x10ffff ? String.fromCodePoint(value) : " ";
    });
}

function extractHtml(buffer: Buffer) {
  const source = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const title = source.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const text = decodeHtmlEntities(source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|noscript|template|svg|canvas)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<(br|hr)\b[^>]*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|section|article|main|header|footer|blockquote)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n"));
  return { text, metadata: { title: title ? decodeHtmlEntities(title.replace(/<[^>]+>/g, " ").trim()) : undefined, lines: text.split("\n").filter(Boolean).length } };
}

async function extractPdfWithPdfJs(bytes: Uint8Array) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await getDocument({ data: bytes, useSystemFonts: true }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    let previousY: number | null = null;
    let line = "";
    const lines: string[] = [];
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const y: number | null = "transform" in item ? Number(item.transform[5]) : previousY;
      if (previousY !== null && y !== null && Math.abs(y - previousY) > 4) {
        if (line.trim()) lines.push(line.trim());
        line = "";
      }
      line += `${line ? " " : ""}${item.str}`;
      previousY = y;
    }
    if (line.trim()) lines.push(line.trim());
    pages.push(lines.join("\n"));
  }
  return { text: pages.join("\n\n--- Sayfa ---\n\n"), metadata: { pages: pdf.numPages } };
}

async function extractPdf(buffer: Buffer) {
  const directory = await mkdtemp(join(tmpdir(), "convertly-ai-pdf-"));
  const pdfPath = join(directory, "source.pdf");
  const textPath = join(directory, "source.txt");
  try {
    await writeFile(pdfPath, buffer);
    let pageCount: number | undefined;
    let text = "";

    try {
      await execFileAsync("pdftotext", ["-layout", "-enc", "UTF-8", pdfPath, textPath], { timeout: 60_000 });
      text = await readFile(textPath, "utf8");
    } catch {
      const fallback = await extractPdfWithPdfJs(new Uint8Array(buffer));
      text = fallback.text;
      pageCount = fallback.metadata.pages;
    }

    if (text.replace(/\s/g, "").length >= 10) {
      return { text, metadata: { pages: pageCount, ocr: false } };
    }

    try {
      const imagePrefix = join(directory, "page");
      await execFileAsync("pdftoppm", ["-f", "1", "-l", "30", "-r", "170", "-jpeg", "-jpegopt", "quality=88", pdfPath, imagePrefix], { timeout: 120_000 });
      const images = (await readdir(directory)).filter((name) => /^page-\d+\.jpg$/i.test(name)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      if (!images.length) throw new Error("PDF sayfaları OCR için görüntülenemedi.");
      const pages: string[] = [];
      for (const image of images) {
        const outputBase = join(directory, image.replace(/\.jpg$/i, "-ocr"));
        await execFileAsync("tesseract", [join(directory, image), outputBase, "-l", "tur+eng", "--psm", "3"], { timeout: 120_000 });
        pages.push(await readFile(`${outputBase}.txt`, "utf8"));
      }
      return { text: pages.join("\n\n--- Sayfa ---\n\n"), metadata: { pages: images.length, ocr: true, ocrLimited: images.length >= 30 } };
    } catch (ocrError) {
      const reason = ocrError instanceof Error && /ENOENT|not recognized|not found/i.test(ocrError.message)
        ? "OCR hizmeti bulunamadı. Uygulamayı güncel Docker imajıyla çalıştırın."
        : "Taranmış PDF üzerinde OCR tamamlanamadı.";
      throw new Error(reason);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function extractWorkbook(buffer: Buffer, extension: string) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetSummaries: string[] = [];
  let totalRows = 0;
  let totalColumns = 0;
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, { header: 1, defval: null, raw: false });
    const cleaned = rows
      .map((row) => row.map((cell) => typeof cell === "string" ? cell.trim() : cell))
      .filter((row) => row.some((cell) => cell !== null && cell !== ""));
    const width = cleaned.reduce((max, row) => Math.max(max, row.length), 0);
    totalRows += cleaned.length;
    totalColumns = Math.max(totalColumns, width);
    const limited = cleaned.slice(0, 5000);
    const csv = limited.map((row) => row.map((cell) => cell ?? "").join("\t")).join("\n");
    sheetSummaries.push(`### Çalışma Sayfası: ${sheetName}\nSatır: ${cleaned.length}, Sütun: ${width}\n${csv}`);
  }
  return {
    text: sheetSummaries.join("\n\n"),
    metadata: { sheets: workbook.SheetNames.length, rows: totalRows, columns: totalColumns, truncated: totalRows > 5000, extension },
  };
}

async function extractDocx(buffer: Buffer) {
  try {
    return (await mammoth.extractRawText({ buffer })).value;
  } catch {
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");
    if (!documentXml) throw new Error("DOCX ana belge içeriği bulunamadı.");
    return documentXml
      .replace(/<w:tab\s*\/>/g, "\t")
      .replace(/<w:br\s*\/>/g, "\n")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
  }
}

export async function POST(request: Request) {
  const serviceRequest = isAuthorizedConversionServiceRequest(request);
  if (!serviceRequest && !(await userId())) return NextResponse.json({ error: "Bu özellik için giriş yapmalısınız." }, { status: 401 });
  if (!serviceRequest && hasConversionService()) {
    return forwardToConversionService(request, "/api/ai/extract");
  }
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 400 });
    if (file.size > maximumFileSize) return NextResponse.json({ error: "Dosya boyutu 25 MB sınırını aşıyor." }, { status: 413 });
    const extension = file.name.split(".").pop()?.toLowerCase() as keyof typeof allowed | undefined;
    if (!extension || !(extension in allowed) || !(allowed[extension] as readonly string[]).includes(file.type || "application/octet-stream")) {
      return NextResponse.json({ error: "Dosya türü doğrulanamadı. PDF, DOCX, TXT, HTML, XLSX, XLS veya CSV yükleyin." }, { status: 415 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validSignature(buffer, extension)) {
      return NextResponse.json({ error: "Dosyanın içeriği bildirilen dosya türüyle eşleşmiyor." }, { status: 415 });
    }
    let extracted: { text: string; metadata: Record<string, unknown> };
    if (extension === "pdf") extracted = await extractPdf(buffer);
    else if (extension === "docx") extracted = { text: await extractDocx(buffer), metadata: {} };
    else if (extension === "txt") extracted = { text: buffer.toString("utf8"), metadata: { lines: buffer.toString("utf8").split(/\r?\n/).length } };
    else if (extension === "html" || extension === "htm") extracted = extractHtml(buffer);
    else extracted = extractWorkbook(buffer, extension);

    const text = extracted.text.replace(/\u0000/g, "").trim();
    if (text.length < 10) return NextResponse.json({ error: "Dosyadan okunabilir içerik çıkarılamadı." }, { status: 422 });
    return NextResponse.json({
      fileName: safeFileName(file.name),
      extension,
      kind: ["xlsx", "xls", "csv"].includes(extension) ? "table" : "document",
      text: text.slice(0, 300_000),
      metadata: { ...extracted.metadata, characters: Math.min(text.length, 300_000), clipped: text.length > 300_000 },
    });
  } catch (error) {
    console.error("AI belge ayrıştırma hatası:", error);
    const message = error instanceof Error ? error.message : "";
    if (/password|encrypted/i.test(message)) {
      return NextResponse.json({ error: "Şifreli PDF dosyaları işlenemiyor. Şifreyi kaldırıp tekrar deneyin." }, { status: 422 });
    }
    if (/invalid pdf|missing pdf|bad xref|formaterror/i.test(message)) {
      return NextResponse.json({ error: "PDF dosyası bozuk veya desteklenmeyen bir yapıda." }, { status: 422 });
    }
    if (/zip|central directory|end of data/i.test(message)) {
      return NextResponse.json({ error: "Word veya Excel dosyası bozuk ya da geçerli bir Office belgesi değil." }, { status: 422 });
    }
    if (/OCR hizmeti|OCR tamamlanamadı/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 422 });
    }
    return NextResponse.json({
      error: process.env.NODE_ENV === "development" && message
        ? `Dosya işlenemedi: ${message}`
        : "Dosya içeriği ayrıştırılamadı. Dosyanın bozuk veya şifreli olmadığını kontrol edin.",
    }, { status: 500 });
  }
}
