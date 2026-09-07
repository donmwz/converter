"use client";

import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, MailCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [accountType, setAccountType] = useState("individual");
  const [showPassword, setShowPassword] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [loginVerificationEmail, setLoginVerificationEmail] = useState("");
  const [loginVerificationCode, setLoginVerificationCode] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [resetRequested, setResetRequested] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordAgain, setResetPasswordAgain] = useState("");
  const [notice, setNotice] = useState("");
  const router = useRouter();
  const isRegister = mode === "register";
  const input =
    "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-gray-950 focus:bg-white";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!isRegister && resetMode) {
      if (resetRequested && resetPassword !== resetPasswordAgain) {
        setError("Yeni şifreler eşleşmiyor.");
        return;
      }
      setLoading(true);
      try {
        const response = await fetch(resetRequested ? "/api/auth/password-reset/verify" : "/api/auth/password-reset/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resetRequested ? { email: resetEmail, code: resetCode, password: resetPassword } : { email: resetEmail }),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) { setError(body?.error ?? "Şifre sıfırlama işlemi tamamlanamadı."); return; }
        if (!resetRequested) { setResetRequested(true); setResetEmail(body.email); return; }
        setResetMode(false); setResetRequested(false); setResetCode(""); setResetPassword(""); setResetPasswordAgain("");
        setNotice("Şifreniz değiştirildi. Yeni şifrenizle giriş yapabilirsiniz.");
      } catch { setError("Şifre sıfırlama servisine bağlanılamadı."); } finally { setLoading(false); }
      return;
    }

    if (!isRegister && loginVerificationEmail) {
      setLoading(true);
      try {
        const response = await fetch("/api/auth/login/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: loginVerificationEmail, code: loginVerificationCode }) });
        const body = await response.json().catch(() => null);
        if (!response.ok) { setError(body?.error ?? "Kod doğrulanamadı."); return; }
        router.push("/");
        router.refresh();
      } catch { setError("Doğrulama servisine bağlanılamadı."); } finally { setLoading(false); }
      return;
    }

    if (isRegister && verificationEmail) {
      setLoading(true);
      try {
        const response = await fetch("/api/auth/register/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: verificationEmail, code: verificationCode }) });
        const body = await response.json().catch(() => null);
        if (!response.ok) { setError(body?.error ?? "Kod doğrulanamadı."); return; }
        router.push("/");
        router.refresh();
      } catch { setError("Doğrulama servisine bağlanılamadı."); } finally { setLoading(false); }
      return;
    }

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

      if (isRegister && body?.verificationRequired) {
        setVerificationEmail(body.email);
        setVerificationCode("");
        return;
      }

      if (!isRegister && body?.twoFactorRequired) {
        setLoginVerificationEmail(body.email);
        setLoginVerificationCode("");
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
        {!isRegister && resetMode ? (
          <>
            <button type="button" onClick={() => { setResetMode(false); setResetRequested(false); setError(""); }} className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-950"><ArrowLeft className="h-4 w-4" /> Girişe dön</button>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 ring-1 ring-violet-100"><MailCheck className="h-6 w-6" /></span>
            <p className="text-sm font-semibold uppercase tracking-wider text-gray-400">Hesap kurtarma</p>
            <h2 className="text-3xl font-bold">{resetRequested ? "Yeni şifrenizi belirleyin" : "Şifrenizi yenileyin"}</h2>
            {resetRequested ? (
              <>
                <p className="text-sm leading-6 text-gray-500"><strong className="font-semibold text-gray-700">{resetEmail}</strong> adresine gönderdiğimiz 6 haneli kodu girin. E-posta görünmüyorsa Spam veya Gereksiz klasörünü kontrol edin.</p>
                <input required autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={resetCode} onChange={(event) => setResetCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" className={`${input} text-center text-2xl font-semibold tracking-[.35em]`} />
                <input required type="password" minLength={8} value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} placeholder="Yeni şifre (en az 8 karakter)" className={input} />
                <input required type="password" minLength={8} value={resetPasswordAgain} onChange={(event) => setResetPasswordAgain(event.target.value)} placeholder="Yeni şifreyi tekrar yazın" className={input} />
              </>
            ) : (
              <>
                <p className="text-sm leading-6 text-gray-500">Hesabınıza bağlı e-posta adresini yazın. Şifrenizi yenilemeniz için doğrulama kodu göndereceğiz.</p>
                <input required autoFocus type="email" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} placeholder="E-posta adresi" className={input} />
              </>
            )}
            {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button disabled={loading || (resetRequested && (resetCode.length !== 6 || resetPassword.length < 8))} className="w-full rounded-xl bg-gray-950 p-3.5 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400">{loading ? "İşleniyor..." : resetRequested ? "Şifremi değiştir" : "Doğrulama kodu gönder"}</button>
          </>
        ) : (isRegister && verificationEmail) || (!isRegister && loginVerificationEmail) ? (
          <>
            <button type="button" onClick={() => { setVerificationEmail(""); setVerificationCode(""); setLoginVerificationEmail(""); setLoginVerificationCode(""); setError(""); }} className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-950"><ArrowLeft className="h-4 w-4" /> Geri dön</button>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 ring-1 ring-violet-100"><MailCheck className="h-6 w-6" /></span>
            <p className="text-sm font-semibold uppercase tracking-wider text-gray-400">{isRegister ? "Son adım" : "İki faktörlü doğrulama"}</p>
            <h2 className="text-3xl font-bold">{isRegister ? "E-postanızı doğrulayın" : "Girişinizi doğrulayın"}</h2>
            <p className="text-sm leading-6 text-gray-500"><strong className="font-semibold text-gray-700">{isRegister ? verificationEmail : loginVerificationEmail}</strong> adresine gönderdiğimiz 6 haneli kodu girin. Kod 10 dakika geçerlidir. E-posta görünmüyorsa Spam veya Gereksiz klasörünü kontrol edin.</p>
            <input required autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={isRegister ? verificationCode : loginVerificationCode} onChange={(event) => { const value = event.target.value.replace(/\D/g, "").slice(0, 6); if (isRegister) setVerificationCode(value); else setLoginVerificationCode(value); }} placeholder="000000" className={`${input} text-center text-2xl font-semibold tracking-[.35em]`} />
            {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button disabled={loading || (isRegister ? verificationCode.length : loginVerificationCode.length) !== 6} className="w-full rounded-xl bg-gray-950 p-3.5 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400">{loading ? "Doğrulanıyor..." : isRegister ? "Kodu doğrula ve hesabı oluştur" : "Kodu doğrula ve giriş yap"}</button>
          </>
        ) : (
        <>
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
        {!isRegister && <button type="button" onClick={() => { setResetMode(true); setError(""); setNotice(""); }} className="block text-sm font-medium text-violet-700 transition hover:text-violet-900">Şifremi unuttum</button>}
        {isRegister && passwordField("confirmPassword", "Şifreyi tekrar yazın")}

        {notice && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
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
        </>
        )}
      </form>
    </div>
  );
}
