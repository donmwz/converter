"use client";

import Link from "next/link";
import { DatabaseBackup, Download, FileClock, LoaderCircle, LogOut, Save, Trash2, UserRound, UserX } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ScrollAwareHeader from "@/app/components/scroll-aware-header";

type User = {
  email: string;
  fullName: string;
  accountType: string;
  organizationName: string | null;
  useCase: string;
  createdAt: string;
};

type Conversion = {
  id: string;
  sourceName: string;
  resultName: string | null;
  status: string;
  options: { sourceFormat?: string; outputFormat?: string };
  uploadedAt: string;
  convertedAt: string | null;
  downloadable: boolean;
};

const accountLabels: Record<string, string> = { individual: "Bireysel", corporate: "Kurumsal", student: "Öğrenci" };
export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<Conversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [dataBusy, setDataBusy] = useState<"data" | "account" | null>(null);
  const router = useRouter();

  useEffect(() => {
    Promise.all([fetch("/api/me", { cache: "no-store" }), fetch("/api/conversions", { cache: "no-store" })])
      .then(async ([userResponse, historyResponse]) => {
        if (userResponse.status === 401) {
          router.replace("/login");
          return;
        }
        setUser(await userResponse.json());
        if (historyResponse.ok) setHistory(await historyResponse.json());
      })
      .finally(() => setLoading(false));
  }, [router]);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const body = await response.json();
    setMessage(response.ok ? "Bilgileriniz güncellendi." : body.error ?? "Güncelleme başarısız.");
    if (response.ok) setUser((current) => current ? { ...current, ...body } : current);
    setSaving(false);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const remove = async (scope: "data" | "account") => {
    const warning = scope === "account" ? "Hesabınız ve tüm dosyalarınız kalıcı olarak silinecek. Devam edilsin mi?" : "Tüm dönüşüm geçmişiniz ve kayıtlı dosyalarınız kalıcı olarak silinecek. Devam edilsin mi?";
    if (!window.confirm(warning)) return;
    setDataBusy(scope);
    setMessage("");
    const response = await fetch("/api/me/data", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope }) });
    const body = await response.json().catch(() => null);
    if (!response.ok) setMessage(body?.error ?? "Silme işlemi tamamlanamadı.");
    else if (scope === "account") { router.push("/"); router.refresh(); }
    else { setHistory([]); setMessage("Dönüşüm geçmişiniz ve kayıtlı dosyalarınız silindi."); }
    setDataBusy(null);
  };

  if (loading || !user) return <main className="flex min-h-screen items-center justify-center bg-[#fafafa]"><LoaderCircle className="h-7 w-7 animate-spin text-gray-400" /></main>;

  return (
    <main className="min-h-screen bg-[#fafafa] text-gray-900">
      <ScrollAwareHeader className="border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="text-xl font-bold tracking-tight text-gray-950">Convertly</Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">Dönüştür</Link>
            <button onClick={logout} className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-white"><LogOut className="h-4 w-4" /> Çıkış</button>
          </div>
        </div>
      </ScrollAwareHeader>

      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-950 text-xl font-bold text-white">{user.fullName.charAt(0).toLocaleUpperCase("tr-TR")}</div>
          <div><h1 className="text-3xl font-bold tracking-tight">Profilim</h1><p className="mt-1 text-sm text-gray-500">Hesap bilgilerinizi ve dönüştürülen dosyalarınızı yönetin.</p></div>
        </div>

        <div className="grid gap-8 lg:h-[620px] lg:grid-cols-[360px_1fr]">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:h-full">
            <div className="mb-6 flex items-center gap-2"><UserRound className="h-5 w-5" /><h2 className="font-semibold">Hesap ayarları</h2></div>
            <form onSubmit={save} className="space-y-4">
              <label className="block text-sm font-medium">Ad soyad<input name="fullName" defaultValue={user.fullName} required className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-gray-400" /></label>
              <label className="block text-sm font-medium">E-posta<input value={user.email} disabled className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-400" /></label>
              <label className="block text-sm font-medium">Hesap türü<input value={accountLabels[user.accountType] ?? user.accountType} disabled className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-400" /></label>
              <label className="block text-sm font-medium">Kurum / okul<input name="organizationName" defaultValue={user.organizationName ?? ""} className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-gray-400" /></label>
              <label className="block text-sm font-medium">Kullanım amacı<select name="useCase" defaultValue={user.useCase} className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-gray-400"><option value="personal">Kişisel</option><option value="work">İş</option><option value="education">Eğitim</option><option value="other">Diğer</option></select></label>
              {message && <p className="text-sm text-gray-500">{message}</p>}
              <button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Kaydet</button>
            </form>
          </section>

          <section className="flex min-h-0 flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:h-full">
            <div className="mb-6 flex items-center justify-between"><div className="flex items-center gap-2"><FileClock className="h-5 w-5" /><h2 className="font-semibold">Dönüşüm geçmişi</h2></div><span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">{history.length} işlem</span></div>
            {history.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 py-14 text-center"><p className="text-sm text-gray-500">Henüz kayıtlı dönüşümünüz yok.</p><Link href="/" className="mt-3 inline-block text-sm font-semibold text-gray-950">İlk dosyanızı dönüştürün</Link></div>
            ) : (
              <div className="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto pr-2 [scrollbar-color:#d1d5db_transparent] [scrollbar-width:thin]">
                {history.map((item) => (
                  <div key={item.id} className="flex flex-col gap-4 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0"><p className="truncate text-sm font-semibold text-gray-900">{item.resultName ?? item.sourceName}</p><p className="mt-1 truncate text-xs text-gray-400">{item.sourceName} · {(item.options?.sourceFormat ?? "?").toUpperCase()} → {(item.options?.outputFormat ?? "?").toUpperCase()}</p><p className="mt-1 text-xs text-gray-400">{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.convertedAt ?? item.uploadedAt))}</p></div>
                    {item.downloadable ? <a href={`/api/conversions/${item.id}/result`} className="flex shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50"><Download className="h-4 w-4" /> Tekrar indir</a> : <span className="shrink-0 text-xs text-gray-400">{item.status === "completed" ? "Dosya saklanmamış" : "Tamamlanmadı"}</span>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2"><DatabaseBackup className="h-5 w-5" /><h2 className="font-semibold">Veriler ve hesap</h2></div>
          <p className="mt-2 text-sm leading-6 text-gray-500">Hesap bilgilerinizi, geçmişinizi ve kayıtlı çıktı dosyalarınızı ZIP olarak alın veya kalıcı olarak silin.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <a href="/api/me/data" className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"><Download className="h-4 w-4" /> Tüm verilerimi indir</a>
            <button disabled={Boolean(dataBusy)} onClick={() => void remove("data")} className="flex items-center justify-center gap-2 rounded-xl border border-amber-200 px-4 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-50">{dataBusy === "data" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Verilerimi sil</button>
            <button disabled={Boolean(dataBusy)} onClick={() => void remove("account")} className="flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50">{dataBusy === "account" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />} Hesabımı sil</button>
          </div>
        </section>
      </div>
    </main>
  );
}
