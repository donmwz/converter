import Link from "next/link";
import type { ReactNode } from "react";
import UserNav from "@/app/components/user-nav";

type SiteShellProps = {
  children: ReactNode;
  active?: "convert" | "privacy" | "contact";
};

export default function SiteShell({ children, active }: SiteShellProps) {
  return (
    <main className="min-h-screen bg-[#fafafa] text-gray-900">
      <header className="border-b border-gray-200 bg-white">
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
              <Link href="/belge-ai" className="text-sm font-medium text-gray-600 transition hover:text-gray-950">
                Belge AI
              </Link>
            </nav>
          </div>
          <UserNav />
        </div>
      </header>

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
