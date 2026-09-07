import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { forwardToConversionService, hasConversionService, isAuthorizedConversionServiceRequest } from "@/lib/conversion-service";
import { attachmentDisposition } from "@/lib/content-disposition";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);
const maximumFileSize = 100 * 1024 * 1024;
const baseCorsHeaders = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const corsHeadersFor = (request: Request) => {
  const origin = request.headers.get("origin");

  if (origin && /^http:\/\/(localhost|127\.0\.0\.1):(3000|3001)$/.test(origin)) {
    return { ...baseCorsHeaders, "Access-Control-Allow-Origin": origin };
  }

  return baseCorsHeaders;
};

const presentableHtml = (html: string) => {
  const styles = `<style id="convertly-document-style">html{min-width:100%;background:#eef1f5;overflow-x:auto}body{box-sizing:border-box;display:flex!important;min-height:100vh;width:100%!important;margin:0!important;padding:32px 16px!important;flex-direction:column!important;align-items:center!important;background:#eef1f5!important;color:#111827;font-family:Arial,Helvetica,sans-serif}body>div,body>.page,body>[id^="page"]{position:relative!important;float:none!important;left:auto!important;right:auto!important;flex:0 0 auto!important;margin:0 auto 24px!important;max-width:none!important;background:#fff;box-shadow:0 18px 50px rgba(15,23,42,.12);overflow:hidden}body>div img,body>.page img,body>[id^="page"] img{max-width:none!important;height:auto} @media(max-width:720px){body{padding:12px 6px!important}}</style>`;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${styles}</head>`);
  if (/<html/i.test(html)) return html.replace(/<html[^>]*>/i, (tag) => `${tag}<head>${styles}</head>`);
  return `<!doctype html><html><head><meta charset="utf-8">${styles}</head><body><main style="width:min(100%,960px);margin:auto">${html}</main></body></html>`;
};

export function OPTIONS(request: Request) {
  return new Response(null, { headers: corsHeadersFor(request) });
}

export async function POST(request: Request) {
  if (hasConversionService()) {
    return forwardToConversionService(request, "/api/convert/office");
  }

  const corsHeaders = corsHeadersFor(request);
  if (!isAuthorizedConversionServiceRequest(request)) {
    return Response.json({ error: "Yetkisiz istek." }, { status: 401, headers: corsHeaders });
  }
  const formData = await request.formData();
  const file = formData.get("file");

  const extension = file instanceof File ? file.name.split(".").pop()?.toLowerCase() : "";
  const outputFormat = formData.get("outputFormat");
  const isPresentation = extension === "ppt" || extension === "pptx";
  const isSpreadsheet = extension === "xlsx" || extension === "csv";
  const targetFormat = isPresentation
    ? outputFormat
    : isSpreadsheet ? outputFormat
    : extension === "html" || extension === "htm" ? "pdf"
    : extension === "pdf" && outputFormat === "html" ? "html"
    : extension === "docx" ? "pdf" : "docx";

  const isHtml = extension === "html" || extension === "htm";
  if (!(file instanceof File) || !["docx", "pdf", "ppt", "pptx", "xlsx", "csv", "html", "htm"].includes(extension ?? "") || !["pdf", "docx", "html"].includes(String(targetFormat)) || ((isSpreadsheet || isHtml) && targetFormat !== "pdf") || (targetFormat === "html" && extension !== "pdf")) {
    return Response.json({ error: "Bu belge türü için seçilen hedef biçim desteklenmiyor." }, { status: 400, headers: corsHeaders });
  }

  if (file.size > maximumFileSize) {
    return Response.json({ error: "Dosya boyutu 100 MB sınırını aşıyor." }, { status: 413, headers: corsHeaders });
  }

  if (isHtml) {
    const source = Buffer.from(await file.arrayBuffer());
    const sample = source.subarray(0, Math.min(source.length, 8192)).toString("utf8").replace(/^\uFEFF/, "");
    if (source.subarray(0, Math.min(source.length, 4096)).includes(0) || !/<(?:!doctype\s+html|html|head|body|meta|title|main|article|section|div|p|h[1-6]|table|ul|ol|li|a|span|form)\b/i.test(sample)) {
      return Response.json({ error: "HTML dosyasının içeriği doğrulanamadı." }, { status: 415, headers: corsHeaders });
    }
  }

  const directory = await mkdtemp(join(tmpdir(), "convertly-office-"));
  const inputPath = join(directory, `source.${extension}`);
  const outputPath = join(directory, `source.${targetFormat}`);
  const presentationPdfPath = join(directory, "source.pdf");

  try {
    await writeFile(inputPath, Buffer.from(await file.arrayBuffer()));
    if (extension === "pdf" && targetFormat === "html") {
      try {
        const { stdout } = await execFileAsync("pdftohtml", ["-q", "-s", "-dataurls", "-enc", "UTF-8", "-stdout", inputPath], { maxBuffer: maximumFileSize });
        await writeFile(outputPath, presentableHtml(stdout));
      } catch {
        const { stdout } = await execFileAsync("pdftohtml", ["-q", "-s", "-i", "-enc", "UTF-8", "-stdout", inputPath], { maxBuffer: maximumFileSize });
        await writeFile(outputPath, presentableHtml(stdout));
      }
    } else if (isPresentation && targetFormat === "docx") {
      await execFileAsync("soffice", [
        "--headless",
        "--convert-to",
        "pdf:impress_pdf_Export",
        "--outdir",
        directory,
        inputPath,
      ]);
      await execFileAsync("pdf2docx", ["convert", presentationPdfPath, "--docx_file", outputPath]);
    } else if (extension === "docx" || isHtml || isPresentation || isSpreadsheet) {
      await execFileAsync("soffice", [
        "--headless",
        "--convert-to",
        targetFormat === "pdf"
          ? isPresentation ? "pdf:impress_pdf_Export" : isSpreadsheet ? "pdf:calc_pdf_Export" : "pdf:writer_pdf_Export"
          : "docx:Office Open XML Text",
        "--outdir",
        directory,
        inputPath,
      ]);
    } else {
      await execFileAsync("pdf2docx", ["convert", inputPath, "--docx_file", outputPath]);
    }

    const output = await readFile(outputPath);
    const isPdf = targetFormat === "pdf";
    const isHtmlOutput = targetFormat === "html";
    const fileName = `${file.name.replace(/\.(docx|pdf|ppt|pptx|xlsx|csv|html|htm)$/i, "")}.${targetFormat}`;

    return new Response(output, {
      headers: {
        "Content-Type": isPdf
          ? "application/pdf"
          : isHtmlOutput ? "text/html; charset=utf-8" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": attachmentDisposition(fileName),
        "Cache-Control": "no-store",
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("Ofis dönüştürme hatası:", error);
    return Response.json(
      { error: "Dosya dönüştürme hizmeti bu belgeyi işleyemedi. Dosyanın bozuk veya şifreli olmadığını kontrol edip tekrar deneyin." },
      { status: 500, headers: corsHeaders }
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
