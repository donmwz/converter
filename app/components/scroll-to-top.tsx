"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 420);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return <button type="button" aria-label="Sayfanın başına dön" title="Yukarı çık" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className={`fixed bottom-5 right-5 z-[70] flex h-11 w-11 items-center justify-center rounded-full border border-gray-200/80 bg-white/90 text-gray-700 shadow-lg shadow-gray-950/10 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-gray-300 hover:bg-gray-950 hover:text-white ${visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}>
    <ArrowUp className="h-4 w-4" />
  </button>;
}
