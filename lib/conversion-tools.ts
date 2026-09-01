export type ConversionTool = {
  from: string;
  to: string;
  title: string;
  description: string;
  category: "Belgeler" | "Görseller" | "Video" | "Ses" | "Arşiv";
  theme: "rose" | "orange" | "amber" | "emerald" | "teal" | "cyan" | "sky" | "blue" | "indigo" | "violet" | "purple" | "fuchsia" | "pink" | "lime" | "slate";
};

export const cardThemes: Record<ConversionTool["theme"], { header: string; badge: string; label: string; border: string }> = {
  rose: { header: "bg-gradient-to-br from-slate-50 to-sky-50/80", badge: "bg-white/90 text-slate-700 ring-1 ring-slate-200", label: "text-slate-600", border: "hover:border-slate-300" },
  orange: { header: "bg-gradient-to-br from-sky-50 to-slate-50", badge: "bg-white/90 text-sky-800 ring-1 ring-sky-100", label: "text-sky-700", border: "hover:border-sky-200" },
  amber: { header: "bg-gradient-to-br from-slate-50 to-violet-50/70", badge: "bg-white/90 text-slate-700 ring-1 ring-violet-100", label: "text-slate-600", border: "hover:border-violet-200" },
  emerald: { header: "bg-gradient-to-br from-emerald-50/80 to-slate-50", badge: "bg-white/90 text-emerald-800 ring-1 ring-emerald-100", label: "text-emerald-700", border: "hover:border-emerald-200" },
  teal: { header: "bg-gradient-to-br from-slate-50 to-emerald-50/70", badge: "bg-white/90 text-teal-800 ring-1 ring-teal-100", label: "text-teal-700", border: "hover:border-teal-200" },
  cyan: { header: "bg-gradient-to-br from-sky-50/90 to-slate-50", badge: "bg-white/90 text-sky-800 ring-1 ring-sky-100", label: "text-sky-700", border: "hover:border-sky-200" },
  sky: { header: "bg-gradient-to-br from-sky-50 to-blue-50/60", badge: "bg-white/90 text-sky-800 ring-1 ring-sky-100", label: "text-sky-700", border: "hover:border-sky-200" },
  blue: { header: "bg-gradient-to-br from-slate-50 to-sky-50", badge: "bg-white/90 text-blue-800 ring-1 ring-blue-100", label: "text-blue-700", border: "hover:border-blue-200" },
  indigo: { header: "bg-gradient-to-br from-violet-50/80 to-slate-50", badge: "bg-white/90 text-indigo-800 ring-1 ring-indigo-100", label: "text-indigo-700", border: "hover:border-indigo-200" },
  violet: { header: "bg-gradient-to-br from-violet-50 to-slate-50", badge: "bg-white/90 text-violet-800 ring-1 ring-violet-100", label: "text-violet-700", border: "hover:border-violet-200" },
  purple: { header: "bg-gradient-to-br from-slate-50 to-violet-50", badge: "bg-white/90 text-violet-800 ring-1 ring-violet-100", label: "text-violet-700", border: "hover:border-violet-200" },
  fuchsia: { header: "bg-gradient-to-br from-violet-50/80 to-sky-50/60", badge: "bg-white/90 text-violet-800 ring-1 ring-violet-100", label: "text-violet-700", border: "hover:border-violet-200" },
  pink: { header: "bg-gradient-to-br from-sky-50/70 to-violet-50/70", badge: "bg-white/90 text-slate-700 ring-1 ring-slate-200", label: "text-slate-600", border: "hover:border-slate-300" },
  lime: { header: "bg-gradient-to-br from-emerald-50/80 to-sky-50/60", badge: "bg-white/90 text-emerald-800 ring-1 ring-emerald-100", label: "text-emerald-700", border: "hover:border-emerald-200" },
  slate: { header: "bg-gradient-to-br from-slate-100/80 to-slate-50", badge: "bg-white/90 text-slate-700 ring-1 ring-slate-200", label: "text-slate-600", border: "hover:border-slate-300" },
};

export const formatGroups = [
  { label: "Belgeler", formats: ["PDF", "DOCX", "HTML", "TXT", "XLSX", "CSV", "PPTX"], chip: "bg-sky-50 text-sky-800 ring-1 ring-sky-100" },
  { label: "Görseller", formats: ["JPG", "PNG", "WEBP", "HEIC", "GIF", "SVG"], chip: "bg-emerald-50/80 text-emerald-800 ring-1 ring-emerald-100" },
  { label: "Video", formats: ["MP4", "MOV", "WebM"], chip: "bg-violet-50 text-violet-800 ring-1 ring-violet-100" },
  { label: "Ses", formats: ["MP3", "WAV", "OGG", "M4A", "AAC"], chip: "bg-slate-100 text-slate-700 ring-1 ring-slate-200" },
  { label: "Arşiv", formats: ["ZIP"], chip: "bg-slate-50 text-slate-700 ring-1 ring-slate-200" },
] as const;

export const conversionTools: ConversionTool[] = [
  { from: "PDF", to: "DOCX", title: "PDF Word Çevirme", description: "Tabloları, renkleri ve sayfa görünümünü koruyan DOCX oluşturun.", category: "Belgeler", theme: "rose" },
  { from: "DOCX", to: "PDF", title: "Word PDF Çevirme", description: "Word belgelerini paylaşımı kolay PDF dosyalarına çevirin.", category: "Belgeler", theme: "blue" },
  { from: "HTML", to: "PDF", title: "HTML PDF Çevirme", description: "HTML sayfalarını PDF belgesi olarak dışa aktarın.", category: "Belgeler", theme: "slate" },
  { from: "PPTX", to: "PDF", title: "PowerPoint'ten PDF'e", description: "Sunumları tek tıkla PDF formatına dönüştürün.", category: "Belgeler", theme: "orange" },
  { from: "XLSX", to: "CSV", title: "Excel'den CSV'ye", description: "Excel tablolarını CSV formatına aktarın.", category: "Belgeler", theme: "emerald" },
  { from: "CSV", to: "XLSX", title: "CSV'den Excel'e", description: "CSV dosyalarını düzenlenebilir XLSX tablolarına çevirin.", category: "Belgeler", theme: "teal" },
  { from: "PDF", to: "TXT", title: "PDF'den metin", description: "PDF içindeki metni düz metin dosyası olarak çıkarın.", category: "Belgeler", theme: "violet" },
  { from: "DOCX", to: "TXT", title: "Word'den metin", description: "Word belgesinden düz metin içeriği alın.", category: "Belgeler", theme: "indigo" },
  { from: "PDF", to: "PNG", title: "PDF'den görsel", description: "Her PDF sayfasını ayrı PNG görseli olarak ZIP içinde indirin.", category: "Belgeler", theme: "pink" },
  { from: "PPTX", to: "DOCX", title: "PowerPoint'ten Word'e", description: "Sunumları düzenlenebilir Word belgesine dönüştürün.", category: "Belgeler", theme: "amber" },
  { from: "XLSX", to: "PDF", title: "Excel'den PDF'e", description: "Excel tablolarını PDF belgesine çevirin.", category: "Belgeler", theme: "cyan" },

  { from: "JPG", to: "PNG", title: "JPG PNG Çevirme", description: "JPEG görselleri kayıpsız PNG formatına dönüştürün.", category: "Görseller", theme: "sky" },
  { from: "PNG", to: "WEBP", title: "PNG WEBP Çevirme", description: "Görselleri web için optimize WEBP formatına sıkıştırın.", category: "Görseller", theme: "emerald" },
  { from: "PNG", to: "JPG", title: "PNG JPG Çevirme", description: "PNG görselleri küçük boyutlu JPG formatına çevirin.", category: "Görseller", theme: "orange" },
  { from: "JPG", to: "WEBP", title: "JPG WEBP Çevirme", description: "JPEG dosyalarını modern WEBP formatına dönüştürün.", category: "Görseller", theme: "lime" },
  { from: "HEIC", to: "PNG", title: "HEIC PNG Çevirme", description: "iPhone fotoğraflarını yaygın PNG formatına dönüştürün.", category: "Görseller", theme: "fuchsia" },
  { from: "Görsel", to: "Çıkartma", title: "Arka plan kaldır", description: "Görsellerden arka planı kaldırarak şeffaf PNG oluşturun.", category: "Görseller", theme: "purple" },
  { from: "Görsel", to: "ICO", title: "Favicon oluştur", description: "Web siteniz için ICO favicon dosyası üretin.", category: "Görseller", theme: "indigo" },
  { from: "GIF", to: "PNG", title: "GIF PNG Çevirme", description: "Animasyonlu GIF'leri statik PNG görsele dönüştürün.", category: "Görseller", theme: "rose" },

  { from: "MP4", to: "MP3", title: "Videodan ses ayıkla", description: "Video dosyalarından yüksek kaliteli MP3 ses çıkarın.", category: "Video", theme: "violet" },
  { from: "MOV", to: "MP4", title: "MOV MP4 Çevirme", description: "Apple MOV videolarını evrensel MP4 formatına dönüştürün.", category: "Video", theme: "blue" },
  { from: "Video", to: "WebM", title: "Video WebM Çevirme", description: "Videoları web uyumlu WebM formatına dönüştürün.", category: "Video", theme: "teal" },
  { from: "MP4", to: "MOV", title: "MP4 MOV Çevirme", description: "MP4 videolarını MOV formatına dönüştürün.", category: "Video", theme: "cyan" },
  { from: "MOV", to: "MP3", title: "MOV'dan ses ayıkla", description: "MOV videolarından MP3 ses dosyası çıkarın.", category: "Video", theme: "pink" },

  { from: "MP3", to: "WAV", title: "MP3 WAV Çevirme", description: "Sıkıştırılmış MP3 dosyalarını WAV formatına çevirin.", category: "Ses", theme: "amber" },
  { from: "WAV", to: "MP3", title: "WAV MP3 Çevirme", description: "WAV ses dosyalarını küçük boyutlu MP3'e dönüştürün.", category: "Ses", theme: "orange" },
  { from: "MP3", to: "OGG", title: "MP3 OGG Çevirme", description: "MP3 dosyalarını açık kaynak OGG formatına çevirin.", category: "Ses", theme: "emerald" },
  { from: "WAV", to: "OGG", title: "WAV OGG Çevirme", description: "WAV dosyalarını OGG formatına dönüştürün.", category: "Ses", theme: "lime" },
  { from: "MP3", to: "M4A", title: "MP3 M4A Çevirme", description: "MP3 dosyalarını Apple uyumlu M4A formatına çevirin.", category: "Ses", theme: "sky" },
  { from: "WAV", to: "AAC", title: "WAV AAC Çevirme", description: "WAV dosyalarını AAC formatına dönüştürün.", category: "Ses", theme: "fuchsia" },

  { from: "ZIP", to: "Dosya", title: "Arşiv aç", description: "ZIP arşivlerinden dosya çıkarıp dönüştürmeye başlayın.", category: "Arşiv", theme: "slate" },
];

export const categoryDescriptions: Record<ConversionTool["category"], string> = {
  Belgeler: "PDF, Word, Excel ve PowerPoint dosyalarınızı dönüştürün.",
  Görseller: "JPG, PNG, WEBP, HEIC ve daha fazlasını dönüştürün veya düzenleyin.",
  Video: "MP4, MOV ve WebM formatları arasında dönüşüm yapın veya ses ayıklayın.",
  Ses: "MP3, WAV, OGG ve diğer ses formatları arasında dönüştürün.",
  Arşiv: "ZIP arşivlerini açın ve içindeki dosyaları dönüştürün.",
};
