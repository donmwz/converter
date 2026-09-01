"use client";

import Link from "next/link";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type User = { fullName: string; email: string };

export default function UserNav() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const loadUser = async () => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const response = await fetch("/api/me", { cache: "no-store", credentials: "same-origin" });
          if (cancelled) return;
          if (response.ok) {
            setUser(await response.json() as User);
            return;
          }
          if (response.status === 401) {
            setUser(null);
            return;
          }
        } catch {
          // Geçici ağ hatalarında kullanıcıyı çıkış yapmış gibi göstermeyin.
        }
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    };
    void loadUser();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setOpen(false);
    router.push("/");
    router.refresh();
  };

  if (user === undefined) return <div className="h-10 w-28 animate-pulse rounded-lg bg-gray-100" />;
  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <Link href="/login" className="hidden rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-950 sm:block">
          Giriş yap
        </Link>
        <Link href="/onboarding" className="rounded-lg bg-gray-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800">
          Başlayın
        </Link>
      </div>
    );
  }

  return (
    <div ref={root} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white py-1.5 pl-1.5 pr-3 text-left shadow-sm transition hover:border-gray-300 hover:shadow-md">
        <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-[10px] bg-gradient-to-br from-gray-800 via-gray-950 to-slate-700 text-white shadow-inner">
          <span className="absolute -right-2 -top-2 h-7 w-7 rounded-full bg-sky-300/25 blur-md" />
          <UserRound className="relative h-5 w-5" strokeWidth={1.8} />
          <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-gray-950 bg-emerald-400" />
        </span>
        <span className="hidden sm:block">
          <span className="block max-w-36 truncate text-sm font-semibold text-gray-900">{user.fullName}</span>
          <span className="block max-w-36 truncate text-xs text-gray-400">Profilim</span>
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 group-hover:text-gray-600 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
          <div className="border-b border-gray-100 px-3 py-2">
            <p className="truncate text-sm font-medium text-gray-900">{user.fullName}</p>
            <p className="truncate text-xs text-gray-400">{user.email}</p>
          </div>
          <Link href="/profil" onClick={() => setOpen(false)} className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-950">
            <UserRound className="h-4 w-4" /> Profil ve dosyalar
          </Link>
          <button type="button" onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50">
            <LogOut className="h-4 w-4" /> Çıkış yap
          </button>
        </div>
      )}
    </div>
  );
}
