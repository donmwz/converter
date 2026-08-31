import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = process.cwd();

const assets = [
  {
    source: "node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js",
    destination: "public/ffmpeg/ffmpeg-core.js",
  },
  {
    source: "node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.wasm",
    destination: "public/ffmpeg/ffmpeg-core.wasm",
  },
  {
    source: "node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    destination: "public/pdf.worker.min.mjs",
  },
];

await Promise.all(
  assets.map(async ({ source, destination }) => {
    const target = resolve(projectRoot, destination);
    await mkdir(resolve(target, ".."), { recursive: true });
    await copyFile(resolve(projectRoot, source), target);
  })
);

console.log("Dönüştürme çalışma dosyaları hazırlandı.");
