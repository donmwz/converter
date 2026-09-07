import "server-only";

type VerificationEmail = { email: string; name: string; code: string; purpose?: "registration" | "login" | "password-reset" };

export async function sendVerificationEmail({ email, name, code, purpose = "registration" }: VerificationEmail) {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
  const senderName = process.env.BREVO_SENDER_NAME?.trim() || "Convertly";
  if (!apiKey || !senderEmail) throw new Error("E-posta doğrulama servisi yapılandırılmamış.");

  const digits = code.split("").map((digit) => `<span style="display:inline-block;width:34px;padding:10px 0;margin:0 2px;border:1px solid #e5e7eb;border-radius:10px;background:#f8fafc;color:#111827;font-size:22px;font-weight:700;text-align:center">${digit}</span>`).join("");
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email, name }],
      subject: `${code} - Convertly ${purpose === "login" ? "giriş" : purpose === "password-reset" ? "şifre yenileme" : "doğrulama"} kodunuz`,
      htmlContent: `<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:36px 16px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;overflow:hidden;border:1px solid #e5e7eb;border-radius:22px;background:#ffffff"><tr><td style="height:7px;background:linear-gradient(90deg,#7c3aed,#c026d3,#8b5cf6)"></td></tr><tr><td style="padding:36px"><div style="font-size:20px;font-weight:800">Convertly</div><p style="margin:32px 0 8px;color:#7c3aed;font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">${purpose === "login" ? "Güvenli giriş" : purpose === "password-reset" ? "Şifre yenileme" : "E-posta doğrulama"}</p><h1 style="margin:0;font-size:28px;line-height:1.25">Merhaba ${escapeHtml(name)},</h1><p style="margin:14px 0 26px;color:#6b7280;font-size:15px;line-height:1.7">${purpose === "login" ? "Convertly hesabınıza giriş yapmayı tamamlamak" : purpose === "password-reset" ? "Convertly şifrenizi güvenli biçimde yenilemek" : "Hesabınızı oluşturmak"} için aşağıdaki 6 haneli kodu kullanın.</p><div style="white-space:nowrap;text-align:center">${digits}</div><p style="margin:25px 0 0;color:#9ca3af;font-size:13px;line-height:1.6">Kod 10 dakika geçerlidir. Bu kodu kimseyle paylaşmayın; isteği siz yapmadıysanız e-postayı yok sayabilirsiniz.</p></td></tr></table></td></tr></table></body></html>`,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    console.error("Brevo doğrulama e-postası hatası:", response.status, body);
    throw new Error("Doğrulama e-postası gönderilemedi. Lütfen daha sonra tekrar deneyin.");
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}
