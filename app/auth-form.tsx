"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [accountType, setAccountType] = useState("individual");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const isRegister = mode === "register";
  const input =
    "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-gray-950 focus:bg-white";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (isRegister && password !== confirmPassword) {
      setError("Şifreler eşleşmiyor. Lütfen tekrar kontrol edin.");
      return;
    }

    const payload: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (key === "confirmPassword") continue;
      payload[key] = String(value);
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error ?? "İşlem tamamlanamadı. Lütfen tekrar deneyin.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Sunucuya bağlanılamadı. Veritabanı servisinin çalıştığından emin olun.");
    } finally {
      setLoading(false);
    }
  };

  const passwordField = (name: string, placeholder: string) => (
    <div className="relative">
      <input
        required
        name={name}
        type={showPassword ? "text" : "password"}
        minLength={8}
        placeholder={placeholder}
        className={`${input} pr-12`}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-gray-500 hover:text-gray-950"
      >
        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );

  return (
    <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl md:grid md:grid-cols-[.9fr_1.1fr]">
      <aside className="auth-showcase relative isolate overflow-hidden p-10 text-white">
        <div className="relative z-10">
          <Link href="/" className="font-bold">
            Convertly
          </Link>
          <h1 className="mt-20 text-4xl font-bold tracking-tight">
            {isRegister ? "Dosyalarınız hep elinizin altında." : "Tekrar hoş geldiniz."}
          </h1>
          <p className="mt-5 leading-7 text-white/70">
            {isRegister
              ? "Hesabınızla dönüşüm geçmişinizi saklayın ve istediğiniz cihazdan erişin."
              : "Dönüşümlerinize ve dosya geçmişinize kaldığınız yerden devam edin."}
          </p>
        </div>
      </aside>

      <form onSubmit={submit} className="space-y-4 p-8 md:p-12">
        <p className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          {isRegister ? "Ücretsiz hesap" : "Hesabınız"}
        </p>
        <h2 className="text-3xl font-bold">{isRegister ? "Hesap oluştur" : "Giriş yap"}</h2>

        {isRegister && (
          <>
            <input required name="fullName" placeholder="Ad soyad" className={input} />
            <select
              name="accountType"
              value={accountType}
              onChange={(event) => setAccountType(event.target.value)}
              className={input}
            >
              <option value="individual">Bireysel</option>
              <option value="corporate">Kurumsal</option>
              <option value="student">Öğrenci</option>
            </select>
            {accountType !== "individual" && (
              <input
                required
                name="organizationName"
                placeholder={accountType === "corporate" ? "Şirket adı" : "Okul adı"}
                className={input}
              />
            )}
            <select required name="useCase" defaultValue="" className={input}>
              <option value="" disabled>
                Kullanım amacı seçin
              </option>
              <option value="personal">Kişisel kullanım</option>
              <option value="work">İş / kurumsal</option>
              <option value="education">Eğitim</option>
              <option value="development">Geliştirme</option>
            </select>
          </>
        )}

        <input required name="email" type="email" placeholder="E-posta adresi" className={input} />
        {passwordField("password", "Şifre (en az 8 karakter)")}
        {isRegister && passwordField("confirmPassword", "Şifreyi tekrar yazın")}

        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <button
          disabled={loading}
          className="w-full rounded-xl bg-gray-950 p-3.5 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {loading ? "İşleniyor..." : isRegister ? "Hesabımı oluştur" : "Giriş yap"}
        </button>

        <p className="text-center text-sm text-gray-500">
          {isRegister ? "Zaten hesabınız var mı?" : "Henüz hesabınız yok mu?"}{" "}
          <Link className="font-semibold text-gray-950" href={isRegister ? "/login" : "/register"}>
            {isRegister ? "Giriş yap" : "Kayıt ol"}
          </Link>
        </p>
      </form>
    </div>
  );
}
