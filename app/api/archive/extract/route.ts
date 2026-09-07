import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { forwardToConversionService, hasConversionService, isAuthorizedConversionServiceRequest } from "@/lib/conversion-service";
import { attachmentDisposition } from "@/lib/content-disposition";

export const runtime = "nodejs";
export const maxDuration = 300;
const execFileAsync = promisify(execFile);
const maximumFileSize = 100 * 1024 * 1024;

export async function POST(request: Request) {
  if (hasConversionService()) return forwardToConversionService(request, "/api/archive/extract");
  if (!isAuthorizedConversionServiceRequest(request)) return Response.json({ error: "Yetkisiz istek." }, { status: 401 });
  const data = await request.formData(); const file = data.get("file");
  const ext = file instanceof File ? file.name.split(".").pop()?.toLowerCase() : "";
  if (!(file instanceof File) || !["rar", "7z", "zip"].includes(ext ?? "")) return Response.json({ error: "RAR, 7Z veya ZIP arşivi seçin." }, { status: 415 });
  if (file.size > maximumFileSize) return Response.json({ error: "Arşiv 100 MB sınırını aşıyor." }, { status: 413 });
  const directory = await mkdtemp(join(tmpdir(), "convertly-archive-")); const source = join(directory, `source.${ext}`); const extracted = join(directory, "extracted"); const output = join(directory, "extracted.zip");
  try {
    await writeFile(source, Buffer.from(await file.arrayBuffer()));
    const listing = await execFileAsync("7z", ["l", "-slt", source], { timeout: 60_000, maxBuffer: 5 * 1024 * 1024 });
    const paths = listing.stdout.split(/\r?\n/).filter((line) => line.startsWith("Path = ")).slice(1).map((line) => line.slice(7));
    const sizes = listing.stdout.split(/\r?\n/).filter((line) => line.startsWith("Size = ")).map((line) => Number(line.slice(7)) || 0);
    if (paths.length > 2000 || sizes.reduce((sum, size) => sum + size, 0) > 500 * 1024 * 1024) throw new Error("ARCHIVE_LIMIT");
    if (paths.some((path) => path.split(/[\\/]/).includes("..") || /^[a-z]:|^[\\/]/i.test(path))) throw new Error("ARCHIVE_PATH");
    await execFileAsync("7z", ["x", source, `-o${extracted}`, "-y"], { timeout: 180_000, maxBuffer: 5 * 1024 * 1024 });
    await execFileAsync("7z", ["a", "-tzip", output, join(extracted, "*")], { timeout: 180_000, maxBuffer: 5 * 1024 * 1024 });
    return new Response(await readFile(output), { headers: { "Content-Type": "application/zip", "Content-Disposition": attachmentDisposition(`${file.name.replace(/\.(rar|7z|zip)$/i, "")}-acilmis.zip`), "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Arşiv çıkarma hatası:", error);
    const message = error instanceof Error && /ARCHIVE_LIMIT/.test(error.message) ? "Arşivin açılmış boyutu veya dosya sayısı güvenlik sınırını aşıyor." : error instanceof Error && /ARCHIVE_PATH/.test(error.message) ? "Arşiv güvenli olmayan dosya yolları içeriyor." : "Arşiv açılamadı. Dosyanın bozuk veya şifreli olmadığını kontrol edin.";
    return Response.json({ error: message }, { status: 422 });
  } finally { await rm(directory, { recursive: true, force: true }); }
}
