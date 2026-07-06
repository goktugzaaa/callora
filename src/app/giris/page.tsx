"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";

export default function GirisPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    if (res.ok) {
      router.push("/panel");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Giriş başarısız");
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Tekrar hoş geldiniz"
      subtitle={
        <>
          Hesabınız yok mu?{" "}
          <Link href="/kayit" className="text-accent-strong hover:underline">
            Ücretsiz kaydolun
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-sm text-muted block mb-1.5">E-posta</label>
          <input name="email" type="email" required className="input" placeholder="ornek@isletme.com" />
        </div>
        <div>
          <label className="text-sm text-muted block mb-1.5">Şifre</label>
          <input name="password" type="password" required className="input" placeholder="••••••••" />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>
        <p className="text-xs text-muted text-center pt-2">
          Demo hesap: demo@callora.app / demo1234
        </p>
      </form>
    </AuthShell>
  );
}
