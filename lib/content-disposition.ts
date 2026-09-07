export function attachmentDisposition(fileName: string) {
  const clean = fileName.replace(/[\r\n"\\/]/g, "_").slice(0, 220) || "convertly-file";
  const fallback = clean
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/[;%]/g, "_");
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(clean)}`;
}
