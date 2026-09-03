"use client";

import JSZip from "jszip";
import { Archive, CheckCircle2, Files, LoaderCircle, PackageOpen, Upload, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useSlowOperation } from "@/app/components/slow-turtle-game";

const extension = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";
const safeBase = (name: string) => name.replace(/\.[^.]+$/, "").replace(/[^\p{L}\p{N}._-]+/gu, "-");
const imageExtensions = new Set(["jpg", "jpeg", "png", "webp"]);
const targets: Record<string, { value: string; label: string }[]> = {
  pdf: [{ value: "docx", label: "DOCX" }, { value: "html", label: "HTML" }],
  docx: [{ value: "pdf", label: "PDF" }],
  ppt: [{ value: "pdf", label: "PDF" }, { value: "docx", label: "DOCX" }],
  pptx: [{ value: "pdf", label: "PDF" }, { value: "docx", label: "DOCX" }],
  xlsx: [{ value: "pdf", label: "PDF" }], csv: [{ value: "pdf", label: "PDF" }],
  html: [{ value: "pdf", label: "PDF" }], htm: [{ value: "pdf", label: "PDF" }],
  jpg: [{ value: "png", label: "PNG" }, { value: "webp", label: "WEBP" }],
  jpeg: [{ value: "png", label: "PNG" }, { value: "webp", label: "WEBP" }],
  png: [{ value: "jpg", label: "JPG" }, { value: "webp", label: "WEBP" }],
  webp: [{ value: "png", label: "PNG" }, { value: "jpg", label: "JPG" }],
};

async function convertImage(file: File, target: string) {
  const url = URL.createObjectURL(file);
  try {
    const image = new window.Image(); image.src = url;
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error(`${file.name} okunamadı.`)); });
    const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d"); if (!context) throw new Error("Görsel motoru başlatılamadı.");
    if (target === "jpg") { context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height); }
    context.drawImage(image, 0, 0);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error(`${target.toUpperCase()} oluşturulamadı.`)), target === "jpg" ? "image/jpeg" : `image/${target}`, .92));
  } finally { URL.revokeObjectURL(url); }
}

async function rememberBatch(files: File[], result: Blob, resultName: string, target: string) {
  const response = await fetch("/api/conversions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceName: `${files.length} dosya`, sourceFormat: extension(files[0].name), outputFormat: `${target}-zip`, privacyMode: false }) });
  if (!response.ok) return;
  const { id } = await response.json();
  const data = new FormData(); data.append("file", new File([result], resultName, { type: "application/zip" }));
  await fetch(`/api/conversions/${id}/result`, { method: "POST", body: data });
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export default function BatchArchiveTools({ dark = false }: { dark?: boolean }) {
  const [files, setFiles] = useState<File[]>([]); const [target, setTarget] = useState(""); const [busy, setBusy] = useState<"batch" | "archive" | null>(null);
  const [progress, setProgress] = useState(0); const [message, setMessage] = useState(""); const [archiveFile, setArchiveFile] = useState<File | null>(null);
  const batchInput = useRef<HTMLInputElement>(null); const archiveInput = useRef<HTMLInputElement>(null); const compressInput = useRef<HTMLInputElement>(null);
  useSlowOperation(Boolean(busy), "batch-archive-operation");
  const source = files[0] ? extension(files[0].name) : ""; const options = useMemo(() => targets[source] ?? [], [source]);
  const surface = dark ? "border-white/10 bg-[#15191f] text-white" : "border-gray-200 bg-white text-gray-950";
  const muted = dark ? "text-gray-400" : "text-gray-500";

  const chooseBatch = (items: FileList | null) => {
    const next = Array.from(items ?? []).slice(0, 20); setMessage("");
    if (!next.length) return;
    const first = extension(next[0].name);
    if (!targets[first] || next.some((file) => extension(file.name) !== first)) { setFiles([]); setTarget(""); setMessage("Toplu işlem için aynı dosya türünde, desteklenen dosyalar seçin."); return; }
    if (next.some((file) => file.size > 100 * 1024 * 1024)) { setMessage("Her dosya en fazla 100 MB olabilir."); return; }
    setFiles(next); setTarget(targets[first][0].value);
  };

  const runBatch = async () => {
    if (!files.length || !target) return; setBusy("batch"); setMessage(""); setProgress(0);
    try {
      const zip = new JSZip();
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]; let result: Blob;
        if (imageExtensions.has(source)) result = await convertImage(file, target);
        else { const data = new FormData(); data.append("file", file); data.append("outputFormat", target); const response = await fetch("/api/convert/office", { method: "POST", body: data }); if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.error ?? `${file.name} dönüştürülemedi.`); } result = await response.blob(); }
        zip.file(`${safeBase(file.name)}.${target}`, result); setProgress(Math.round((index + 1) / files.length * 90));
      }
      const result = await zip.generateAsync({ type: "blob", compression: "DEFLATE" }, ({ percent }) => setProgress(90 + Math.round(percent / 10)));
      const name = `convertly-toplu-${target}-${Date.now()}.zip`; save(result, name); void rememberBatch(files, result, name, target); setMessage(`${files.length} dosya dönüştürüldü ve tek ZIP olarak indirildi.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Toplu dönüşüm tamamlanamadı."); } finally { setBusy(null); }
  };

  const compress = async (items: FileList | null) => {
    const selected = Array.from(items ?? []).slice(0, 100); if (!selected.length) return; setBusy("archive"); setMessage("");
    try { const zip = new JSZip(); selected.forEach((file) => zip.file(file.webkitRelativePath || file.name, file)); const result = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } }, ({ percent }) => setProgress(Math.round(percent))); save(result, `convertly-arsiv-${Date.now()}.zip`); setMessage(`${selected.length} dosya ZIP arşivine sıkıştırıldı.`); } catch { setMessage("ZIP arşivi oluşturulamadı."); } finally { setBusy(null); }
  };

  const extractArchive = async () => {
    if (!archiveFile) return; setBusy("archive"); setProgress(20); setMessage("");
    try { const data = new FormData(); data.append("file", archiveFile); const response = await fetch("/api/archive/extract", { method: "POST", body: data }); if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.error ?? "Arşiv açılamadı."); } setProgress(100); save(await response.blob(), `${safeBase(archiveFile.name)}-acilmis.zip`); setMessage("Arşiv güvenli biçimde açıldı ve evrensel ZIP olarak indirildi."); } catch (error) { setMessage(error instanceof Error ? error.message : "Arşiv açılamadı."); } finally { setBusy(null); }
  };

  return <section id="batch-tools" className={`scroll-mt-24 border-b px-6 py-16 ${dark ? "border-white/10 bg-[#0f1217]" : "border-gray-200 bg-gray-50/60"}`}>
    <div className="mx-auto max-w-6xl"><p className="text-xs font-semibold uppercase tracking-wider text-violet-600">Çoklu işlemler</p><h2 className={`mt-2 text-3xl font-bold tracking-tight ${dark ? "text-white" : "text-gray-950"}`}>Toplu dönüştürme ve arşiv araçları</h2><p className={`mt-3 max-w-2xl text-sm leading-6 ${muted}`}>Aynı türde en fazla 20 dosyayı tek seferde dönüştürün; dosyaları ZIP&apos;e sıkıştırın veya RAR, 7Z ve ZIP arşivlerini açın.</p>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className={`rounded-3xl border p-6 shadow-sm ${surface}`}><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Files className="h-5 w-5" /></span><h3 className="mt-5 text-lg font-semibold">Toplu dönüştürme</h3><p className={`mt-2 text-sm ${muted}`}>Aynı uzantıdaki dosyaları seçin; sonuçları tek ZIP içinde alın.</p>
          <input ref={batchInput} type="file" multiple className="hidden" accept=".pdf,.docx,.ppt,.pptx,.xlsx,.csv,.html,.htm,.jpg,.jpeg,.png,.webp" onChange={(event) => chooseBatch(event.target.files)} />
          <button onClick={() => batchInput.current?.click()} className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-sm font-semibold ${dark ? "border-white/15 hover:bg-white/5" : "border-gray-300 hover:bg-gray-50"}`}><Upload className="h-4 w-4" /> {files.length ? `${files.length} dosya seçildi` : "Dosyaları seç"}</button>
          {files.length > 0 && <div className="mt-4 flex gap-3"><select value={target} onChange={(e) => setTarget(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900">{options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><button disabled={busy !== null} onClick={() => void runBatch()} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy === "batch" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Files className="h-4 w-4" />} Dönüştür</button><button aria-label="Listeyi temizle" onClick={() => setFiles([])} className="rounded-xl border border-gray-300 px-3"><X className="h-4 w-4" /></button></div>}
        </article>
        <article className={`rounded-3xl border p-6 shadow-sm ${surface}`}><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-fuchsia-100 text-fuchsia-700"><Archive className="h-5 w-5" /></span><h3 className="mt-5 text-lg font-semibold">Arşiv yöneticisi</h3><p className={`mt-2 text-sm ${muted}`}>Dosyaları ZIP&apos;e sıkıştırın veya RAR / 7Z / ZIP arşivlerini çıkarın.</p>
          <input ref={compressInput} type="file" multiple className="hidden" onChange={(event) => void compress(event.target.files)} /><input ref={archiveInput} type="file" className="hidden" accept=".rar,.7z,.zip" onChange={(event) => { setArchiveFile(event.target.files?.[0] ?? null); setMessage(""); }} />
          <div className="mt-5 grid gap-3 sm:grid-cols-2"><button disabled={busy !== null} onClick={() => compressInput.current?.click()} className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-4 text-sm font-semibold ${dark ? "border-white/15 hover:bg-white/5" : "border-gray-200 hover:bg-gray-50"}`}><Archive className="h-4 w-4" /> ZIP oluştur</button><button disabled={busy !== null} onClick={() => archiveInput.current?.click()} className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-4 text-sm font-semibold ${dark ? "border-white/15 hover:bg-white/5" : "border-gray-200 hover:bg-gray-50"}`}><PackageOpen className="h-4 w-4" /> Arşiv seç</button></div>
          {archiveFile && <button disabled={busy !== null} onClick={() => void extractArchive()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy === "archive" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <PackageOpen className="h-4 w-4" />} {archiveFile.name} arşivini aç</button>}
          <p className={`mt-3 text-xs leading-5 ${muted}`}>RAR oluşturma kapalı formattır; yeni arşivler uyumlu ve açık ZIP biçiminde hazırlanır.</p>
        </article>
      </div>
      {(busy || message) && <div className={`mt-5 rounded-2xl border p-4 text-sm ${surface}`}>{busy ? <span className="flex items-center gap-2"><LoaderCircle className="h-4 w-4 animate-spin" /> İşleniyor… %{progress}</span> : <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> {message}</span>}</div>}
    </div>
  </section>;
}
