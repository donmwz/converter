import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { forwardToConversionService, hasConversionService, isAuthorizedConversionServiceRequest } from "@/lib/conversion-service";

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
    : extension === "html" ? "pdf"
    : extension === "docx" ? "pdf" : "docx";

  if (!(file instanceof File) || !["docx", "pdf", "ppt", "pptx", "xlsx", "csv", "html"].includes(extension ?? "") || !["pdf", "docx"].includes(String(targetFormat)) || ((isSpreadsheet || extension === "html") && targetFormat !== "pdf")) {
    return Response.json({ error: "Bu belge türü için seçilen hedef biçim desteklenmiyor." }, { status: 400, headers: corsHeaders });
  }

  if (file.size > maximumFileSize) {
    return Response.json({ error: "Dosya boyutu 100 MB sınırını aşıyor." }, { status: 413, headers: corsHeaders });
  }

  if (extension === "html") {
    const source = Buffer.from(await file.arrayBuffer());
    const sample = source.subarray(0, Math.min(source.length, 8192)).toString("utf8").replace(/^\uFEFF/, "");
    if (source.subarray(0, Math.min(source.length, 4096)).includes(0) || !/<(?:!doctype\s+html|html|head|body|main|article|section|div|p|h[1-6])\b/i.test(sample)) {
      return Response.json({ error: "HTML dosyasının içeriği doğrulanamadı." }, { status: 415, headers: corsHeaders });
    }
  }

  const directory = await mkdtemp(join(tmpdir(), "convertly-office-"));
  const inputPath = join(directory, `source.${extension}`);
  const outputPath = join(directory, `source.${targetFormat}`);
  const presentationPdfPath = join(directory, "source.pdf");

  try {
    await writeFile(inputPath, Buffer.from(await file.arrayBuffer()));
    if (isPresentation && targetFormat === "docx") {
      await execFileAsync("soffice", [
        "--headless",
        "--convert-to",
        "pdf:impress_pdf_Export",
        "--outdir",
        directory,
        inputPath,
      ]);
      await execFileAsync("pdf2docx", ["convert", presentationPdfPath, "--docx_file", outputPath]);
    } else if (extension === "docx" || extension === "html" || isPresentation || isSpreadsheet) {
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
    const fileName = `${file.name.replace(/\.(docx|pdf|ppt|pptx|xlsx|csv|html)$/i, "")}.${targetFormat}`;

    return new Response(output, {
      headers: {
        "Content-Type": isPdf
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
        ...corsHeaders,
      },
    });
  } catch {
    return Response.json(
      { error: "Dosya dönüştürülemedi. Yerel LibreOffice ve PDF düzen analizi hizmetinin çalıştığından emin olun." },
      { status: 500, headers: corsHeaders }
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
