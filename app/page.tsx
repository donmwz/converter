"use client";

import { useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import { Document, ImageRun, Packer, PageBreak, Paragraph } from "docx";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  ArrowRight,
  ShieldCheck,
  Zap,
  Lock,
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  LoaderCircle,
  X,
} from "lucide-react";

const categories = [
  { name: "Belgeler", icon: FileText },
  { name: "Görseller", icon: ImageIcon },
  { name: "Video", icon: Video },
  { name: "Ses", icon: Music },
  { name: "Arşiv", icon: Archive },
];

const popularConversions = [
  { from: "PDF", to: "DOCX" },
  { from: "JPG", to: "PNG" },
  { from: "PNG", to: "WEBP" },
  { from: "MP4", to: "MP3" },
  { from: "DOCX", to: "PDF" },
  { from: "MOV", to: "MP4" },
];

const supportedFormats = [
  "PDF", "DOCX", "TXT", "XLSX", "CSV", "JPG", "PNG", "WEBP", "ÇIKARTMA", "FAVICON", "MP4", "MOV", "MP3", "WAV", "OGG",
];

const getFileExtension = (fileName: string) =>
  fileName.split(".").pop()?.toLowerCase() ?? "";

const isDocumentFile = (file: File) =>
  ["docx", "pdf", "ppt", "pptx", "txt", "xlsx", "csv"].includes(getFileExtension(file.name));

const isImageFile = (file: File) =>
  file.type.startsWith("image/") || ["heic", "heif", "svg", "ico"].includes(getFileExtension(file.name));

const imageMimeType = (format: "png" | "jpg") => format === "jpg" ? "image/jpeg" : "image/png";

const renderPdfPagesToZip = async (source: Blob, format: "png" | "jpg", baseName: string, onProgress: (value: number) => void) => {
  const pdf = await getDocument({ data: new Uint8Array(await source.arrayBuffer()) }).promise;
  const zip = new JSZip();
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(1.6, 1800 / baseViewport.width) });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("PDF sayfası oluşturulamadı.");
    if (format === "jpg") { context.fillStyle = "#ffffff"; context.fillRect(0, 0, canvas.width, canvas.height); }
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    const pageBlob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PDF sayfası kaydedilemedi.")), imageMimeType(format), 0.92));
    zip.file(`${baseName}-${pageNumber}.${format}`, pageBlob);
    onProgress(Math.round(pageNumber / pdf.numPages * 100));
  }
  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
};

const createFaviconBlob = async (file: File) => {
  const imageUrl = URL.createObjectURL(file);
  const image = new window.Image();
  image.src = imageUrl;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Görsel okunamadı."));
  });

  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Favicon oluşturucu başlatılamadı.");
  context.drawImage(image, 0, 0, size, size);
  URL.revokeObjectURL(imageUrl);

  const pixels = context.getImageData(0, 0, size, size).data;
  const xorSize = size * size * 4;
  const andSize = size * 8;
  const data = new Uint8Array(6 + 16 + 40 + xorSize + andSize);
  const view = new DataView(data.buffer);
  view.setUint16(0, 0, true); view.setUint16(2, 1, true); view.setUint16(4, 1, true);
  data[6] = size; data[7] = size; data[8] = 0; data[9] = 0;
  view.setUint16(10, 1, true); view.setUint16(12, 32, true);
  view.setUint32(14, 40 + xorSize + andSize, true); view.setUint32(18, 22, true);
  view.setUint32(22, 40, true); view.setInt32(26, size, true); view.setInt32(30, size * 2, true);
  view.setUint16(34, 1, true); view.setUint16(36, 32, true); view.setUint32(38, 0, true);
  view.setUint32(42, xorSize + andSize, true);

  const pixelOffset = 62;
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const source = ((size - 1 - y) * size + x) * 4;
    const target = pixelOffset + (y * size + x) * 4;
    data[target] = pixels[source + 2]; data[target + 1] = pixels[source + 1]; data[target + 2] = pixels[source]; data[target + 3] = pixels[source + 3];
    if (pixels[source + 3] < 128) data[pixelOffset + xorSize + y * 8 + Math.floor(x / 8)] |= 0x80 >> (x % 8);
  }
  return new Blob([data], { type: "image/x-icon" });
};

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("Belgeler");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [outputFormat, setOutputFormat] = useState("png");
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [documentPreviewHtml, setDocumentPreviewHtml] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [download, setDownloadState] = useState<{ name: string; url: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const conversionRecordRef = useRef<Promise<string | null> | null>(null);

  const setDownload = (value: { name: string; url: string } | null) => {
    setDownloadState(value);
    if (!value || !conversionRecordRef.current) return;
    void conversionRecordRef.current.then((id) => {
      if (!id) return;
      return fetch("/api/conversions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, resultName: value.name }),
      });
    }).catch(() => undefined);
  };

  GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;

    if (files && files.length > 0) {
      const file = files[0];

      const isSupported =
        isImageFile(file) ||
        file.type.startsWith("audio/") ||
        file.type.startsWith("video/") ||
        isDocumentFile(file) ||
        getFileExtension(file.name) === "zip";

      if (!isSupported) {
        setError("Bu dosya türü henüz desteklenmiyor.");
        setSelectedFile(null);
        return;
      }

      if (file.size > 100 * 1024 * 1024) {
        setError("Dosya boyutu 100 MB sınırını aşıyor.");
        setSelectedFile(null);
        return;
      }

      const extension = getFileExtension(file.name);
      const targetFormat = isImageFile(file) ? "png" : isDocumentFile(file) ? extension === "docx" || extension === "ppt" || extension === "pptx" ? "pdf" : extension === "pdf" ? "docx" : extension === "xlsx" ? "csv" : "xlsx" : file.type.startsWith("video/") ? "mp4" : "mp3";
      setSelectedCategory(isImageFile(file) ? "Görseller" : file.type.startsWith("video/") ? "Video" : isDocumentFile(file) ? "Belgeler" : "Ses");
      setOutputFormat(targetFormat);
      setSelectedFile(file);
      setError("");
      setDownload(null);
      conversionRecordRef.current = privacyMode ? null : fetch("/api/conversions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceName: file.name, sourceFormat: extension, outputFormat: targetFormat, privacyMode }),
      }).then(async (response) => response.ok ? (await response.json()).id as string : null).catch(() => null);
    }
  };

  const loadFfmpeg = async () => {
    if (ffmpegRef.current?.loaded) {
      return ffmpegRef.current;
    }

    const ffmpeg = new FFmpeg();
    ffmpeg.on("progress", ({ progress }) => {
      setConversionProgress(Math.min(100, Math.round(progress * 100)));
    });

    await ffmpeg.load({
      coreURL: await toBlobURL("/ffmpeg/ffmpeg-core.js", "text/javascript"),
      wasmURL: await toBlobURL("/ffmpeg/ffmpeg-core.wasm", "application/wasm"),
    });

    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  };

  const clearFile = () => {
    setSelectedFile(null);
    setError("");
    setDownload(null);
    conversionRecordRef.current = null;

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePreview = async () => {
    if (!download) {
      return;
    }

    if (getFileExtension(download.name) !== "docx") {
      window.open(download.url, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      const documentData = await fetch(download.url).then((response) => response.arrayBuffer());
      const result = await mammoth.convertToHtml({ arrayBuffer: documentData });
      setDocumentPreviewHtml(result.value);
    } catch {
      setError("Belge önizlemesi oluşturulamadı.");
    }
  };

  const handlePopularConversion = (from: string, to: string) => {
    const isImageConversion = ["JPG", "PNG"].includes(from) && ["PNG", "WEBP"].includes(to);
    const isMp3Conversion = ["MP4", "MOV"].includes(from) && to === "MP3";

    if (!isImageConversion && !isMp3Conversion) {
      setError("Bu dönüşüm henüz kullanıma açık değil.");
      document.getElementById("convert")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    setSelectedCategory(isImageConversion ? "Görseller" : "Video");
    setOutputFormat(to.toLowerCase());
    setError("");
    document.getElementById("convert")?.scrollIntoView({ behavior: "smooth" });
    fileInputRef.current?.click();
  };

  const handleConvert = async () => {
    if (!selectedFile) {
      setError("Dönüştürmek için önce bir dosya seçin.");
      return;
    }

    const mimeType = `image/${outputFormat === "jpg" ? "jpeg" : outputFormat}`;
    setIsConverting(true);
    setConversionProgress(0);
    setError("");
    setDownload(null);

    try {
      const selectedExtension = getFileExtension(selectedFile.name);
      if (selectedExtension === "zip") {
        const archive = await JSZip.loadAsync(selectedFile);
        const entry = Object.values(archive.files).find((file) => !file.dir && ["docx", "pdf", "ppt", "pptx", "xlsx", "csv", "png", "jpg", "jpeg", "webp", "gif", "svg", "heic", "mp3", "wav", "ogg", "opus", "m4a", "mp4", "mov", "webm"].includes(getFileExtension(file.name)));
        if (!entry) throw new Error("Arşivde dönüştürülebilir bir dosya bulunamadı.");
        const extracted = new File([await entry.async("blob")], entry.name);
        setSelectedFile(extracted);
        setSelectedCategory(isImageFile(extracted) ? "Görseller" : extracted.type.startsWith("video/") ? "Video" : isDocumentFile(extracted) ? "Belgeler" : "Ses");
        setOutputFormat(isImageFile(extracted) ? "png" : getFileExtension(extracted.name) === "pdf" ? "docx" : getFileExtension(extracted.name) === "xlsx" ? "csv" : "mp3");
        setError(`Arşiv açıldı: ${entry.name}. Dönüştürmek için tekrar tıklayın.`);
        return;
      }

      if (isDocumentFile(selectedFile)) {
        const extension = getFileExtension(selectedFile.name);
        const baseName = selectedFile.name.replace(/\.[^/.]+$/, "");

        if (extension === "docx") {
          if (outputFormat === "pdf") {
            const isLocalApp = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

            if (privacyMode && !isLocalApp) {
              throw new Error("Gizli modda Word → PDF dönüşümü yalnızca kendi bilgisayarınızda çalışan uygulamada kullanılabilir. Docker ile yerel uygulamayı başlatın.");
            }

            const formData = new FormData();
            formData.append("file", selectedFile);
            const officeApiUrl = "/api/convert/office";
            const response = await fetch(officeApiUrl, {
              method: "POST",
              body: formData,
            });

            if (!response.ok) {
              const body = await response.json().catch(() => null);
              throw new Error(body?.error ?? "Word belgesi PDF'e dönüştürülemedi.");
            }

            setDownload({
              name: `${baseName}.pdf`,
              url: URL.createObjectURL(await response.blob()),
            });
            return;
          }

          const result = await mammoth.extractRawText({
            arrayBuffer: await selectedFile.arrayBuffer(),
          });

          setDownload({
            name: `${baseName}.txt`,
            url: URL.createObjectURL(new Blob([result.value], { type: "text/plain;charset=utf-8" })),
          });
          return;
        }

        if (extension === "pdf") {
          if (outputFormat === "docx") {
            const isLocalApp = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

            if (privacyMode && !isLocalApp) {
              throw new Error("Gizli modda PDF → DOCX dönüşümü yalnızca kendi bilgisayarınızda çalışan uygulamada kullanılabilir.");
            }

            const formData = new FormData();
            formData.append("file", selectedFile);
            const officeApiUrl = "/api/convert/office";
            const response = await fetch(officeApiUrl, {
              method: "POST",
              body: formData,
            });

            if (!response.ok) {
              const body = await response.json().catch(() => null);
              throw new Error(body?.error ?? "PDF dosyası DOCX'e dönüştürülemedi.");
            }

            setDownload({
              name: `${baseName}.docx`,
              url: URL.createObjectURL(await response.blob()),
            });
            return;
          }

          if (outputFormat === "png-zip" || outputFormat === "jpg-zip") {
            const imageFormat = outputFormat === "png-zip" ? "png" : "jpg";
            const archive = await renderPdfPagesToZip(selectedFile, imageFormat, baseName, setConversionProgress);
            setDownload({ name: `${baseName}-${imageFormat}.zip`, url: URL.createObjectURL(archive) });
            return;
          }

          const pdf = await getDocument({
            data: new Uint8Array(await selectedFile.arrayBuffer()),
          }).promise;

          if (outputFormat === "docx-visual") {
            const wordChildren: Paragraph[] = [];

            for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
              const page = await pdf.getPage(pageNumber);
              const baseViewport = page.getViewport({ scale: 1 });
              const scale = Math.min(1.5, 900 / baseViewport.width);
              const viewport = page.getViewport({ scale });
              const canvas = document.createElement("canvas");
              canvas.width = Math.round(viewport.width);
              canvas.height = Math.round(viewport.height);
              const context = canvas.getContext("2d");

              if (!context) {
                throw new Error("PDF sayfası oluşturulamadı.");
              }

              await page.render({ canvas, canvasContext: context, viewport }).promise;
              const imageBlob = await new Promise<Blob>((resolve, reject) =>
                canvas.toBlob(
                  (blob) => blob ? resolve(blob) : reject(new Error("PDF sayfası kaydedilemedi.")),
                  "image/png"
                )
              );
              const imageData = new Uint8Array(await imageBlob.arrayBuffer());

              if (pageNumber > 1) {
                wordChildren.push(new Paragraph({ children: [new PageBreak()] }));
              }

              wordChildren.push(
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: imageData,
                      type: "png",
                      transformation: {
                        width: Math.round(viewport.width * 0.64),
                        height: Math.round(viewport.height * 0.64),
                      },
                    }),
                  ],
                })
              );
            }

            const visualDocument = new Document({
              sections: [{ children: wordChildren }],
            });
            setDownload({
              name: `${baseName}-gorunum-korunmus.docx`,
              url: URL.createObjectURL(await Packer.toBlob(visualDocument)),
            });
            return;
          }

          const pages: string[] = [];

          for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
            const page = await pdf.getPage(pageNumber);
            const content = await page.getTextContent();
            pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
          }

          const text = pages.join("\n\n");

          if (outputFormat === "docx") {
            const wordDocument = new Document({
              sections: [{
                children: text.split(/\n{2,}/).map((paragraph) => new Paragraph(paragraph)),
              }],
            });
            setDownload({
              name: `${baseName}.docx`,
              url: URL.createObjectURL(await Packer.toBlob(wordDocument)),
            });
            return;
          }

          setDownload({
            name: `${baseName}.txt`,
            url: URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" })),
          });
          return;
        }

        if (extension === "ppt" || extension === "pptx") {
          const isLocalApp = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
          if (privacyMode && !isLocalApp) {
            throw new Error("Gizli modda PowerPoint dönüşümü yalnızca kendi bilgisayarınızda çalışan uygulamada kullanılabilir.");
          }

          const formData = new FormData();
          formData.append("file", selectedFile);
          const isSlideImageArchive = outputFormat === "png-zip" || outputFormat === "jpg-zip";
          formData.append("outputFormat", isSlideImageArchive ? "pdf" : outputFormat);
          const officeApiUrl = "/api/convert/office";
          const response = await fetch(officeApiUrl, { method: "POST", body: formData });
          if (!response.ok) {
            const body = await response.json().catch(() => null);
            throw new Error(body?.error ?? "PowerPoint dosyası dönüştürülemedi.");
          }

          const converted = await response.blob();
          if (isSlideImageArchive) {
            const imageFormat = outputFormat === "png-zip" ? "png" : "jpg";
            const archive = await renderPdfPagesToZip(converted, imageFormat, baseName, setConversionProgress);
            setDownload({ name: `${baseName}-slaytlar-${imageFormat}.zip`, url: URL.createObjectURL(archive) });
          } else setDownload({ name: `${baseName}.${outputFormat}`, url: URL.createObjectURL(converted) });
          return;
        }

        if (extension === "xlsx") {
          if (outputFormat === "pdf") {
            const formData = new FormData(); formData.append("file", selectedFile); formData.append("outputFormat", "pdf");
            const response = await fetch("/api/convert/office", { method: "POST", body: formData });
            if (!response.ok) throw new Error("Excel dosyası PDF'e dönüştürülemedi.");
            setDownload({ name: `${baseName}.pdf`, url: URL.createObjectURL(await response.blob()) });
            return;
          }
          const workbook = XLSX.read(await selectedFile.arrayBuffer(), { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const csv = XLSX.utils.sheet_to_csv(firstSheet);
          setDownload({
            name: `${baseName}.csv`,
            url: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })),
          });
          return;
        }

        if (outputFormat === "pdf") {
          const formData = new FormData(); formData.append("file", selectedFile); formData.append("outputFormat", "pdf");
          const response = await fetch("/api/convert/office", { method: "POST", body: formData });
          if (!response.ok) throw new Error("CSV dosyası PDF'e dönüştürülemedi.");
          setDownload({ name: `${baseName}.pdf`, url: URL.createObjectURL(await response.blob()) });
          return;
        }
        const workbook = XLSX.read(await selectedFile.text(), { type: "string" });
        const xlsxData = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        setDownload({
          name: `${baseName}.xlsx`,
          url: URL.createObjectURL(new Blob([xlsxData], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })),
        });
        return;
      }

      if (selectedFile.type.startsWith("audio/") || selectedFile.type.startsWith("video/")) {
        const ffmpeg = await loadFfmpeg();
        const extension = selectedFile.name.split(".").pop() || "media";
        const identifier = Date.now().toString();
        const inputName = `input-${identifier}.${extension}`;
        const outputName = `output-${identifier}.${outputFormat}`;
        const isVideoOutput = ["mp4", "mov", "webm"].includes(outputFormat);
        const audioMimeTypes: Record<string, string> = { mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", opus: "audio/ogg", m4a: "audio/mp4", aac: "audio/aac" };
        const audioCodec: Record<string, string> = { mp3: "libmp3lame", wav: "pcm_s16le", ogg: "libvorbis", opus: "libopus", m4a: "aac", aac: "aac" };
        const mediaArgs = isVideoOutput
          ? outputFormat === "webm"
            ? ["-i", inputName, "-c:v", "libvpx-vp9", "-c:a", "libopus", outputName]
            : ["-i", inputName, "-c:v", "mpeg4", "-c:a", "aac", outputName]
          : ["-i", inputName, "-vn", "-map", "0:a:0", "-codec:a", audioCodec[outputFormat] ?? "libmp3lame", ...(outputFormat === "mp3" ? ["-q:a", "2"] : []), outputName];

        await ffmpeg.writeFile(inputName, await fetchFile(selectedFile));
        await ffmpeg.exec(mediaArgs);

        const data = await ffmpeg.readFile(outputName);
        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile(outputName);

        if (!(data instanceof Uint8Array)) {
          throw new Error("Dönüştürülen ses dosyası okunamadı.");
        }

        const baseName = selectedFile.name.replace(/\.[^/.]+$/, "");
        const outputBytes = new Uint8Array(data.byteLength);
        outputBytes.set(data);
        setDownload({
          name: `${baseName}.${outputFormat}`,
          url: URL.createObjectURL(new Blob([outputBytes.buffer], { type: isVideoOutput ? `video/${outputFormat === "mov" ? "quicktime" : outputFormat}` : audioMimeTypes[outputFormat] ?? "application/octet-stream" })),
        });
        return;
      }

      const baseName = selectedFile.name.replace(/\.[^/.]+$/, "");
      const sourceExtension = getFileExtension(selectedFile.name);
      let imageSource: Blob = selectedFile;
      if (sourceExtension === "heic" || sourceExtension === "heif") {
        const { default: heic2any } = await import("heic2any");
        const converted = await heic2any({ blob: selectedFile, toType: "image/png", quality: 0.92 });
        imageSource = Array.isArray(converted) ? converted[0] : converted;
      }
      if (outputFormat === "sticker") {
        const { removeBackground } = await import("@imgly/background-removal");
        const blob = await removeBackground(selectedFile, { output: { format: "image/png" } });
        setDownload({ name: `${baseName}-cikartma.png`, url: URL.createObjectURL(blob) });
        return;
      }

      if (outputFormat === "ico") {
        const blob = await createFaviconBlob(selectedFile);
        setDownload({ name: `${baseName}-favicon.ico`, url: URL.createObjectURL(blob) });
        return;
      }

      if (outputFormat === "gif" && selectedFile.type === "image/gif") {
        setDownload({ name: `${baseName}.gif`, url: URL.createObjectURL(selectedFile) });
        return;
      }

      const imageUrl = URL.createObjectURL(imageSource);
      const image = new window.Image();
      image.src = imageUrl;

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Görsel okunamadı."));
      });

      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Görsel dönüştürücü başlatılamadı.");
      }

      if (mimeType === "image/jpeg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }

      context.drawImage(image, 0, 0);
      URL.revokeObjectURL(imageUrl);

      if (outputFormat === "gif") {
        const { GIFEncoder, applyPalette, quantize } = await import("gifenc");
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const palette = quantize(imageData, 256);
        const gif = GIFEncoder();
        gif.writeFrame(applyPalette(imageData, palette), canvas.width, canvas.height, { palette });
        gif.finish();
        const gifBytes = gif.bytes();
        const safeGifBytes = new Uint8Array(gifBytes.byteLength);
        safeGifBytes.set(gifBytes);
        setDownload({ name: `${baseName}.gif`, url: URL.createObjectURL(new Blob([safeGifBytes.buffer], { type: "image/gif" })) });
        return;
      }

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, mimeType, 0.92)
      );

      if (!blob) {
        throw new Error("Seçilen biçim bu tarayıcıda desteklenmiyor.");
      }

      setDownload({
        name: `${baseName}.${outputFormat}`,
        url: URL.createObjectURL(blob),
      });
    } catch (conversionError) {
      setError(
        conversionError instanceof Error
          ? conversionError.message
          : "Dönüştürme sırasında bir hata oluştu."
      );
    } finally {
      setIsConverting(false);
    }
  };

  const isMediaFile = Boolean(
    selectedFile &&
      (selectedFile.type.startsWith("audio/") || selectedFile.type.startsWith("video/"))
  );
  const isVideoFile = Boolean(selectedFile && selectedFile.type.startsWith("video/"));
  const selectedFileExtension = selectedFile ? getFileExtension(selectedFile.name) : "";
  const isSelectedDocument = Boolean(selectedFile && isDocumentFile(selectedFile));

  return (
    <main className={privacyMode ? "privacy-theme min-h-screen bg-[#0b0d10] text-gray-100" : "min-h-screen bg-[#fafafa] text-gray-900"}>
      <style>{`
        @keyframes format-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes format-scroll-reverse {
          from { transform: translateX(-50%); }
          to { transform: translateX(0); }
        }
        .format-marquee:hover .format-track { animation-play-state: paused; }
      `}</style>
      {privacyMode && (
        <style>{`
          .privacy-theme .bg-white { background-color: #171a20 !important; }
          .privacy-theme .bg-gray-50 { background-color: #1d2129 !important; }
          .privacy-theme .bg-gray-100 { background-color: #252a34 !important; }
          .privacy-theme .border-gray-200,
          .privacy-theme .border-gray-300 { border-color: #353b47 !important; }
          .privacy-theme .text-gray-950,
          .privacy-theme .text-gray-900 { color: #f8fafc !important; }
          .privacy-theme .text-gray-700,
          .privacy-theme .text-gray-600 { color: #cbd5e1 !important; }
          .privacy-theme .text-gray-500,
          .privacy-theme .text-gray-400 { color: #94a3b8 !important; }
        `}</style>
      )}

      {/* NAVBAR */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">

          <div className="flex items-center gap-12">

            <a
              href="#"
              className="text-xl font-bold tracking-tight text-gray-950"
            >
              Convertly
            </a>

            <nav className="hidden items-center gap-8 md:flex">

              <a
                href="#convert"
                className="text-sm font-medium text-gray-600 transition hover:text-gray-950"
              >
                Dönüştür
              </a>

              <a
                href="#tools"
                className="text-sm font-medium text-gray-600 transition hover:text-gray-950"
              >
                Araçlar
              </a>

              <a
                href="#how-it-works"
                className="text-sm font-medium text-gray-600 transition hover:text-gray-950"
              >
                Nasıl çalışır
              </a>

            </nav>

          </div>

          <div className="flex items-center gap-3">

            <a
              href="/login"
              className="hidden rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-950 sm:block"
            >
              Giriş yap
            </a>

            <a
              href="/onboarding"
              className="rounded-lg bg-gray-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Başlayın
            </a>

          </div>

        </div>
      </header>


      {/* HERO */}
      <section
        id="convert"
        className="px-6 pb-24 pt-20"
      >

        <div className="mx-auto max-w-5xl text-center">

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 shadow-sm">

            <span className="h-2 w-2 rounded-full bg-green-500" />

            Hızlı ve gizli dosya dönüştürme

          </div>


          <h1 className="text-5xl font-bold tracking-tight text-gray-950 md:text-7xl">

            Dosyalarınızı dönüştürün.

            <br />

            <span className="typewriter text-gray-400">
              Basitçe.
            </span>

          </h1>


          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-500">

            Belgeleri, görselleri, videoları ve daha fazlasını dönüştürün.
            Hızlı, güvenli ve tamamen basit.

          </p>


          {/* UPLOAD */}

          <div className="mx-auto mt-12 max-w-3xl">

            <label
              htmlFor="file-upload"
              className="group block cursor-pointer"
            >

              <div className="rounded-3xl border-2 border-dashed border-gray-300 bg-white p-4 transition hover:border-gray-500">

                <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl bg-gray-50 px-6 py-12 transition group-hover:bg-gray-100">

                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">

                    <Upload className="h-7 w-7 text-gray-700" />

                  </div>


                  {selectedFile ? (

                    <>
                      <p className="text-xl font-semibold text-gray-900">
                        {selectedFile.name}
                      </p>

                      <p className="mt-2 text-sm text-gray-500">
                        Dosya seçildi. Değiştirmek için tıklayın.
                      </p>
                    </>

                  ) : (

                    <>
                      <p className="text-xl font-semibold text-gray-900">
                        Dosyalarınızı buraya sürükleyin
                      </p>

                      <p className="mt-2 text-sm text-gray-500">
                        veya bilgisayarınızdan göz atmak için tıklayın
                      </p>
                    </>

                  )}


                  <div className="mt-7 rounded-xl bg-gray-950 px-7 py-3 text-sm font-semibold text-white transition group-hover:bg-gray-800">

                    Dosya seç

                  </div>


                  <p className="mt-5 text-xs text-gray-400">
                    Maksimum dosya boyutu: 100 MB
                  </p>

                </div>

              </div>

            </label>


            <input
              id="file-upload"
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/heic,image/heif,image/x-icon,.ico,.heic,.heif,.svg,video/mp4,video/quicktime,video/webm,audio/mpeg,audio/wav,audio/ogg,audio/aac,audio/mp4,audio/opus,.opus,.m4a,.zip,.docx,.pdf,.ppt,.pptx,.txt,.xlsx,.csv"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm">
              <label
                className={
                  privacyMode
                    ? "mb-5 flex cursor-pointer items-start gap-3 rounded-xl border border-gray-950 bg-gray-950 p-4 text-white transition"
                    : "mb-5 flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-900 transition"
                }
              >
                <input
                  type="checkbox"
                  checked={privacyMode}
                  onChange={(event) => setPrivacyMode(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-white"
                />
                <span>
                  <span className="block text-sm font-semibold">Gizli / güvenli mod</span>
                  <span className={privacyMode ? "mt-1 block text-xs leading-5 text-gray-300" : "mt-1 block text-xs leading-5 text-gray-500"}>
                    Dosyalar bu cihazda işlenir. Word → PDF için uygulamayı Docker ile yerel olarak çalıştırmanız gerekir.
                  </span>
                </span>
              </label>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <label className="flex-1">
                  <span className="mb-2 block text-sm font-medium text-gray-700">
                    Hedef biçim
                  </span>
                  <select
                    value={outputFormat}
                    onChange={(event) => setOutputFormat(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-gray-950"
                  >
                    {isSelectedDocument ? selectedFileExtension === "docx" ? (
                      <>
                        <option value="pdf">PDF</option>
                        <option value="txt">TXT</option>
                      </>
                    ) : selectedFileExtension === "pdf" ? (
                      <>
                        <option value="docx">DOCX (düzenlenebilir)</option>
                        <option value="docx-visual">DOCX (görünümü koru)</option>
                        <option value="txt">TXT</option>
                        <option value="png-zip">PNG (tüm sayfalar ZIP)</option>
                        <option value="jpg-zip">JPG (tüm sayfalar ZIP)</option>
                      </>
                    ) : ["ppt", "pptx"].includes(selectedFileExtension) ? (
                      <>
                        <option value="pdf">PDF</option>
                        <option value="docx">DOCX</option>
                        <option value="png-zip">PNG (slaytlar ZIP)</option>
                        <option value="jpg-zip">JPG (slaytlar ZIP)</option>
                      </>
                    ) : (
                      <>
                        <option value={selectedFileExtension === "xlsx" ? "csv" : "xlsx"}>
                          {selectedFileExtension === "xlsx" ? "CSV" : "XLSX"}
                        </option>
                        <option value="pdf">PDF</option>
                      </>
                    ) : isMediaFile ? (
                      isVideoFile ? <>
                        <option value="mp4">MP4</option><option value="mov">MOV</option><option value="webm">WebM</option>
                        <option value="mp3">MP3 (sesi ayıkla)</option><option value="wav">WAV</option><option value="ogg">OGG</option><option value="opus">OPUS</option><option value="m4a">M4A</option><option value="aac">AAC</option>
                      </> : <>
                        <option value="mp3">MP3</option><option value="wav">WAV</option><option value="ogg">OGG</option><option value="opus">OPUS</option><option value="m4a">M4A</option><option value="aac">AAC</option>
                      </>
                    ) : (
                      <>
                        <option value="png">PNG</option>
                        <option value="jpg">JPG</option>
                        <option value="webp">WEBP</option>
                        <option value="gif">GIF</option>
                        <option value="sticker">Çıkartma (arka planı kaldır)</option>
                        <option value="ico">ICO / Favicon (web sitesi ikonu)</option>
                      </>
                    )}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={handleConvert}
                  disabled={!selectedFile || isConverting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {isConverting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  {isConverting
                    ? isMediaFile
                      ? `MP3 hazırlanıyor: %${conversionProgress}`
                      : "Dönüştürülüyor"
                    : isSelectedDocument
                      ? "Dönüştür"
                      : isMediaFile
                      ? "MP3'e dönüştür"
                      : "Dönüştür"}
                </button>
              </div>

              {selectedFile && (
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-4 text-sm text-gray-500">
                  <span>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="inline-flex items-center gap-1 font-medium text-gray-600 transition hover:text-gray-950"
                  >
                    <X className="h-4 w-4" />
                    Dosyayı kaldır
                  </button>
                </div>
              )}

              {error && (
                <p className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </p>
              )}

              {download && (
                <div className="mt-4 flex flex-col gap-3 rounded-xl bg-green-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="flex items-center gap-2 text-sm font-medium text-green-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Dönüştürme tamamlandı.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handlePreview}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-green-700 px-4 py-2 text-sm font-semibold text-green-800 transition hover:bg-green-100"
                    >
                      <Eye className="h-4 w-4" />
                      Görüntüle
                    </button>
                    <a
                      href={download.url}
                      download={download.name}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-800"
                    >
                      <Download className="h-4 w-4" />
                      İndir
                    </a>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

      </section>


      {/* CATEGORY BAR */}

      <section
        id="tools"
        className="border-y border-gray-200 bg-white px-6 py-10"
      >

        <div className="mx-auto max-w-6xl">

          <div className="flex flex-wrap justify-center gap-3">

            {categories.map((category) => {

              const Icon = category.icon;

              const isActive =
                selectedCategory === category.name;

              return (

                <button
                  key={category.name}
                  type="button"
                  onClick={() =>
                    setSelectedCategory(category.name)
                  }
                  className={
                    isActive
                      ? "flex items-center gap-2 rounded-xl border border-gray-950 bg-gray-950 px-5 py-3 text-sm font-medium text-white transition"
                      : "flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-600 transition hover:border-gray-400 hover:text-gray-950"
                  }
                >

                  <Icon className="h-4 w-4" />

                  {category.name}

                </button>

              );

            })}

          </div>

        </div>

      </section>


      {/* SUPPORTED FORMATS */}

      <section className="border-b border-gray-200 bg-white py-6">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">
            Desteklenen dosya türleri
          </p>
        </div>
        <div className="format-marquee overflow-hidden">
          <div className="format-track flex w-max animate-[format-scroll_26s_linear_infinite] gap-3 px-3">
            {[...supportedFormats, ...supportedFormats].map((format, index) => (
              <span
                key={`${format}-${index}`}
                className="flex h-10 min-w-20 items-center justify-center rounded-full border border-gray-200 bg-gray-50 px-5 text-sm font-semibold text-gray-700"
              >
                {format}
              </span>
            ))}
          </div>
        </div>
        <div className="format-marquee mt-3 overflow-hidden">
          <div className="format-track flex w-max animate-[format-scroll-reverse_30s_linear_infinite] gap-3 px-3">
            {[...supportedFormats, ...supportedFormats].map((format, index) => (
              <span
                key={`reverse-${format}-${index}`}
                className="flex h-10 min-w-20 items-center justify-center rounded-full border border-gray-200 bg-gray-50 px-5 text-sm font-semibold text-gray-700"
              >
                {format}
              </span>
            ))}
          </div>
        </div>
      </section>


      {/* POPULAR CONVERSIONS */}

      <section className="px-6 py-24">

        <div className="mx-auto max-w-6xl">

          <div className="mb-10">

            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-400">
              Popüler
            </p>

            <h2 className="text-3xl font-bold tracking-tight text-gray-950 md:text-4xl">
              Popüler dönüştürmeler
            </h2>

            <p className="mt-3 text-gray-500">
              En yaygın dosya türlerinizi hızlıca dönüştürün.
            </p>

          </div>


          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

            {popularConversions.map((conversion) => (

              <button
                key={conversion.from + "-" + conversion.to}
                type="button"
                onClick={() =>
                  handlePopularConversion(conversion.from, conversion.to)
                }
                className="group flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 text-left transition hover:-translate-y-1 hover:border-gray-400 hover:shadow-lg"
              >

                <div className="flex items-center gap-4">

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-sm font-bold text-gray-700">
                    {conversion.from}
                  </div>


                  <ArrowRight className="h-4 w-4 text-gray-400" />


                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-sm font-bold text-gray-700">
                    {conversion.to}
                  </div>

                </div>


                <ArrowRight className="h-4 w-4 text-gray-300 transition group-hover:translate-x-1 group-hover:text-gray-700" />

              </button>

            ))}

          </div>

        </div>

      </section>


      {/* FEATURES */}

      <section className="bg-gray-950 px-6 py-24 text-white">

        <div className="mx-auto max-w-6xl">

          <div className="max-w-2xl">

            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Neden Convertly
            </p>

            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">

              Basit ve güvenilir
              <br />
              dönüştürmeler için tasarlandı.

            </h2>

          </div>


          <div className="mt-14 grid gap-6 md:grid-cols-3">


            {/* FEATURE 1 */}

            <div className="rounded-2xl border border-white/10 bg-white/5 p-7">

              <Zap className="mb-6 h-7 w-7" />

              <h3 className="text-lg font-semibold">
                Hızlı işlem
              </h3>

              <p className="mt-3 text-sm leading-7 text-gray-400">

                Dosyalarınızı gereksiz bekleme süreleri veya karmaşık adımlar olmadan hızlıca dönüştürün.

              </p>

            </div>


            {/* FEATURE 2 */}

            <div className="rounded-2xl border border-white/10 bg-white/5 p-7">

              <ShieldCheck className="mb-6 h-7 w-7" />

              <h3 className="text-lg font-semibold">
                Tasarım gereği gizli
              </h3>

              <p className="mt-3 text-sm leading-7 text-gray-400">

                Dosyalarınız güvenle işlenir ve dönüştürme sonrasında otomatik olarak silinebilir.

              </p>

            </div>


            {/* FEATURE 3 */}

            <div className="rounded-2xl border border-white/10 bg-white/5 p-7">

              <Lock className="mb-6 h-7 w-7" />

              <h3 className="text-lg font-semibold">
                Basit iş akışı
              </h3>

              <p className="mt-3 text-sm leading-7 text-gray-400">

                Dosyanızı yükleyin, biçimi seçin ve sonucu indirin.

              </p>

            </div>

          </div>

        </div>

      </section>


      {/* HOW IT WORKS */}

      <section
        id="how-it-works"
        className="px-6 py-24"
      >

        <div className="mx-auto max-w-6xl">

          <div className="text-center">

            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
              Nasıl çalışır
            </p>

            <h2 className="text-3xl font-bold tracking-tight text-gray-950 md:text-4xl">
              Üç basit adım
            </h2>

          </div>


          <div className="mt-14 grid gap-8 md:grid-cols-3">


            {/* STEP 1 */}

            <div className="rounded-2xl border border-gray-200 bg-white p-8">

              <span className="text-sm font-bold text-gray-300">
                01
              </span>

              <h3 className="mt-8 text-xl font-semibold text-gray-950">
                Yükle
              </h3>

              <p className="mt-3 leading-7 text-gray-500">
                Bilgisayarınızdan dönüştürmek istediğiniz dosyayı seçin.
              </p>

            </div>


            {/* STEP 2 */}

            <div className="rounded-2xl border border-gray-200 bg-white p-8">

              <span className="text-sm font-bold text-gray-300">
                02
              </span>

              <h3 className="mt-8 text-xl font-semibold text-gray-950">
                Dönüştür
              </h3>

              <p className="mt-3 leading-7 text-gray-500">
                Çıktı biçimini seçin ve dönüştürmeyi başlatın.
              </p>

            </div>


            {/* STEP 3 */}

            <div className="rounded-2xl border border-gray-200 bg-white p-8">

              <span className="text-sm font-bold text-gray-300">
                03
              </span>

              <h3 className="mt-8 text-xl font-semibold text-gray-950">
                İndir
              </h3>

              <p className="mt-3 leading-7 text-gray-500">
                İşlem tamamlandığında dönüştürülen dosyanızı indirin.
              </p>

            </div>

          </div>

        </div>

      </section>


      {/* CTA */}

      <section
        id="pricing"
        className="px-6 pb-24"
      >

        <div className="mx-auto max-w-6xl rounded-3xl bg-gray-100 px-8 py-16 text-center md:px-16">

          <div className="mx-auto max-w-2xl">

            <h2 className="text-3xl font-bold tracking-tight text-gray-950 md:text-5xl">
              Dönüştürmeye hazır mısınız?
            </h2>

            <p className="mt-5 text-gray-500">
              İlk dosyanızı yükleyin ve dönüştürmenin daha basit yolunu deneyimleyin.
            </p>


            <a
              href="#convert"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gray-950 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800"
            >

              Dönüştürmeye başla

              <ArrowRight className="h-4 w-4" />

            </a>

          </div>

        </div>

      </section>


      {/* FOOTER */}

      <footer className="border-t border-gray-200 bg-white px-6 py-10">

        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 md:flex-row">

          <div>

            <p className="font-bold text-gray-950">
              Convertly
            </p>

            <p className="mt-1 text-sm text-gray-400">
              Basit dosya dönüştürme.
            </p>

          </div>


          <div className="flex items-center gap-6 text-sm text-gray-400">

            <a
              href="#"
              className="transition hover:text-gray-900"
            >
              Gizlilik
            </a>

            <a
              href="#"
              className="transition hover:text-gray-900"
            >
              Koşullar
            </a>

            <a
              href="#"
              className="transition hover:text-gray-900"
            >
              İletişim
            </a>

          </div>

        </div>

      </footer>

      {documentPreviewHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <p className="font-semibold text-gray-900">Belge önizleme</p>
              <button
                type="button"
                onClick={() => setDocumentPreviewHtml(null)}
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-950"
                aria-label="Önizlemeyi kapat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <iframe
              title="Belge önizleme"
              sandbox=""
              srcDoc={`<!doctype html><html><head><style>body{margin:0;padding:36px;font-family:Arial,sans-serif;color:#111;line-height:1.5}table{border-collapse:collapse;max-width:100%}td,th{border:1px solid #94a3b8;padding:6px;vertical-align:top}img{max-width:100%;height:auto}</style></head><body>${documentPreviewHtml}</body></html>`}
              className="min-h-0 flex-1 bg-white"
            />
          </div>
        </div>
      )}

    </main>
  );
}
