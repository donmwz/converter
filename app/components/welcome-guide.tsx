"use client";

import { ArrowRight, Bot, LockKeyhole, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";

const guides = [
  { eyebrow: "Nasıl kullanılır?", title: "Dosyanızı seçin, biçimi belirleyin ve indirin.", text: "Dosyayı yükleme alanına sürükleyebilir veya cihazınızdan seçebilirsiniz. Uygun hedef biçimler otomatik gösterilir.", icon: Upload },
  { eyebrow: "Belge AI", title: "Uzun belgeleri anlayın, özetleyin ve sorgulayın.", text: "PDF, Word, HTML ve tablo dosyalarınızı özetleyebilir; yalnızca yüklediğiniz içerik hakkında sorular sorabilirsiniz.", icon: Bot },
  { eyebrow: "Güvenli dosyalar", title: "Kayıtlı çıktılar yalnızca hesabınıza aittir.", text: "Sonuç dosyaları AES-256-GCM ile şifrelenir. İndirme sırasında oturumunuz ve dosya sahipliğiniz yeniden doğrulanır.", icon: LockKeyhole },
] as const;

export default function WelcomeGuide() {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(localStorage.getItem("convertly_welcome_guide") !== "dismissed"), 0);
    return () => window.clearTimeout(timer);
  }, []);
  if (!visible) return null;
  const guide = guides[index];
  const Icon = guide.icon;
  const close = () => { localStorage.setItem("convertly_welcome_guide", "dismissed"); setVisible(false); };
  return (
    <aside className="fixed inset-x-4 bottom-4 z-[70] mx-auto max-w-5xl overflow-hidden rounded-2xl border border-white/70 bg-white/90 shadow-[0_24px_80px_-24px_rgba(15,23,42,.35)] backdrop-blur-xl">
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_20%,rgba(224,242,254,.8),transparent_28%),radial-gradient(circle_at_92%_80%,rgba(237,233,254,.7),transparent_28%)]" />
      <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white bg-white/80 text-gray-800 shadow-sm"><Icon className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-gray-400">{guide.eyebrow}</p>
          <h2 className="mt-1 text-base font-semibold tracking-tight text-gray-950 sm:text-lg">{guide.title}</h2>
          <p className="mt-1 text-sm leading-6 text-gray-500">{guide.text}</p>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
          <div className="flex gap-1.5">{guides.map((item, itemIndex) => <button key={item.eyebrow} type="button" onClick={() => setIndex(itemIndex)} aria-label={`${itemIndex + 1}. bilgiyi göster`} className={`h-1.5 rounded-full transition-all ${itemIndex === index ? "w-6 bg-gray-900" : "w-1.5 bg-gray-300 hover:bg-gray-400"}`} />)}</div>
          <button type="button" onClick={() => index === guides.length - 1 ? close() : setIndex(index + 1)} className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800">{index === guides.length - 1 ? "Anladım" : "İleri"}<ArrowRight className="h-4 w-4" /></button>
          <button type="button" onClick={close} aria-label="Bilgilendirme panelini kapat" className="rounded-lg p-2 text-gray-400 transition hover:bg-white hover:text-gray-900"><X className="h-4 w-4" /></button>
        </div>
      </div>
    </aside>
  );
}
