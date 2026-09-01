import Link from "next/link";
import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import UserNav from "@/app/components/user-nav";
import ScrollAwareHeader from "@/app/components/scroll-aware-header";

type SiteShellProps = {
  children: ReactNode;
  active?: "convert" | "privacy" | "contact";
};

export default function SiteShell({ children, active }: SiteShellProps) {
  return (
    <main className="min-h-screen bg-[#fafafa] text-gray-900">
      <ScrollAwareHeader className="border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-12">
            <Link href="/" className="text-xl font-bold tracking-tight text-gray-950">
              Convertly
            </Link>
            <nav className="hidden items-center gap-8 md:flex">
              <Link
                href="/#convert"
                className={active === "convert" ? "text-sm font-medium text-gray-950" : "text-sm font-medium text-gray-600 transition hover:text-gray-950"}
              >
                Dönüştür
              </Link>
              <Link
                href="/gizlilik"
                className={active === "privacy" ? "text-sm font-medium text-gray-950" : "text-sm font-medium text-gray-600 transition hover:text-gray-950"}
              >
                Gizlilik
              </Link>
              <Link
                href="/iletisim"
                className={active === "contact" ? "text-sm font-medium text-gray-950" : "text-sm font-medium text-gray-600 transition hover:text-gray-950"}
              >
                İletişim
              </Link>
              <Link
                href="/belge-ai"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gray-950 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-200/50"
              >
                <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-violet-400/20 to-fuchsia-400/0 opacity-0 transition group-hover:opacity-100" />
                <Sparkles className="relative h-3.5 w-3.5 text-violet-200 transition group-hover:rotate-12 group-hover:text-white" />
                <span className="relative">Belge AI</span>
                <span className="relative rounded-full bg-white/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/80">Yeni</span>
              </Link>
            </nav>
          </div>
          <UserNav />
        </div>
      </ScrollAwareHeader>

      {children}

      <footer className="border-t border-gray-200 bg-white px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 md:flex-row">
          <div>
            <p className="font-bold text-gray-950">Convertly</p>
            <p className="mt-1 text-sm text-gray-400">Basit dosya dönüştürme.</p>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link href="/gizlilik" className="transition hover:text-gray-900">
              Gizlilik
            </Link>
            <Link href="/iletisim" className="transition hover:text-gray-900">
              İletişim
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
