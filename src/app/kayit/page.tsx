"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";

const SECTORS = [
  ["klinik", "Klinik / Sağlık"],
  ["kuafor", "Kuaför / Güzellik"],
  ["veteriner", "Veteriner"],
  ["spor", "Spor Salonu"],
  ["oto", "Oto Servis"],
  ["restoran", "Restoran"],
  ["hukuk", "Hukuk / Danışmanlık"],
  ["diger", "Diğer"],
];

export default function KayitPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        businessName: form.get("businessName"),
        sector: form.get("sector"),
      }),
    });
    if (res.ok) {
      router.push("/panel");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Kayıt başarısız");
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="14 gün ücretsiz deneyin"
      subtitle={
        <>
          Zaten hesabınız var mı?{" "}
          <Link href="/giris" className="text-accent-strong hover:underline">
            Giriş yapın
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-sm text-muted block mb-1.5">Adınız</label>
          <input name="name" required className="input" placeholder="Ad Soyad" />
        </div>
        <div>
          <label className="text-sm text-muted block mb-1.5">İşletme adı</label>
          <input name="businessName" required className="input" placeholder="Örn. Nova Diş Kliniği" />
        </div>
        <div>
          <label className="text-sm text-muted block mb-1.5">Sektör</label>
          <select name="sector" className="input" defaultValue="klinik">
            {SECTORS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-muted block mb-1.5">E-posta</label>
          <input name="email" type="email" required className="input" placeholder="ornek@isletme.com" />
        </div>
        <div>
          <label className="text-sm text-muted block mb-1.5">Şifre</label>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="input"
            placeholder="En az 8 karakter"
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
          {loading ? "Hesap oluşturuluyor..." : "Ücretsiz Hesap Oluştur"}
        </button>
        <p className="text-[11px] text-muted text-center pt-1">
          Kredi kartı gerekmez. Deneme süresi sonunda otomatik ücretlendirme yapılmaz.
        </p>
      </form>
    </AuthShell>
  );
}
