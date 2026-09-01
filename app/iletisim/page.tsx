import type { Metadata } from "next";
import Link from "next/link";
import { Globe, Mail, Share2 } from "lucide-react";
import SiteShell from "@/app/components/site-shell";

const contactLinks = [
  {
    icon: Globe,
    label: "Web sitesi",
    value: "erendonmez.com",
    href: "https://erendonmez.com",
  },
  {
    icon: Mail,
    label: "E-posta",
    value: "eren34dnmz@gmail.com",
    href: "mailto:eren34dnmz@gmail.com",
  },
  {
    icon: Share2,
    label: "LinkedIn",
    value: "e-donmez",
    href: "https://www.linkedin.com/in/e-donmez",
  },
];

export const metadata: Metadata = {
  title: "İletişim | Convertly",
  description: "Convertly ile iletişime geçin — destek, geri bildirim ve iş birliği.",
};

export default function ContactPage() {
  return (
    <SiteShell active="contact">
      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
            İletişim
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-gray-950 md:text-5xl">
            Bize ulaşın
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-500">
            Convertly hakkında sorularınız, geri bildirimleriniz veya iş birliği teklifleriniz için
            aşağıdaki kanallardan bize ulaşabilirsiniz.
          </p>

          <div className="mt-12 space-y-4">
            {contactLinks.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  target={link.href.startsWith("http") ? "_blank" : undefined}
                  rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="group flex items-center gap-5 rounded-2xl border border-gray-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-gray-400 hover:shadow-lg"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gray-100 transition group-hover:bg-gray-950">
                    <Icon className="h-6 w-6 text-gray-700 transition group-hover:text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">{link.label}</p>
                    <p className="text-lg font-semibold text-gray-950">{link.value}</p>
                  </div>
                </a>
              );
            })}
          </div>

          <div className="mt-12 rounded-2xl border border-gray-200 bg-gray-50 p-8">
            <h2 className="text-lg font-semibold text-gray-950">Ne zaman yazmalısınız?</h2>
            <ul className="mt-4 space-y-2 text-gray-600">
              <li>• Dosya dönüştürme ile ilgili teknik sorunlar</li>
              <li>• Gizlilik ve veri silme talepleri</li>
              <li>• Hata bildirimleri ve özellik önerileri</li>
              <li>• Kurumsal veya iş birliği teklifleri</li>
            </ul>
            <p className="mt-6 text-sm text-gray-500">
              Genellikle 1–2 iş günü içinde yanıt vermeye çalışıyoruz.
            </p>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/#convert"
              className="inline-flex rounded-xl bg-gray-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Dönüştürmeye başla
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
