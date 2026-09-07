const languageMap: Record<string, string> = {
  "İngilizce": "English (ISO 639-1: en)",
  "Türkçe": "Turkish (ISO 639-1: tr)",
  "Almanca": "German (ISO 639-1: de)",
  "Fransızca": "French (ISO 639-1: fr)",
  "İspanyolca": "Spanish (ISO 639-1: es)",
  "İtalyanca": "Italian (ISO 639-1: it)",
  "Arapça": "Arabic (ISO 639-1: ar)",
  "Rusça": "Russian (ISO 639-1: ru)",
};

export function aiLanguageName(value: string, autoDetect = false) {
  if (autoDetect && (!value || value === "Otomatik algıla")) return "auto-detect";
  return languageMap[value] ?? value;
}
