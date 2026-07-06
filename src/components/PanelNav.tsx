"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/panel", label: "Genel Bakış", icon: "📊" },
  { href: "/panel/cagrilar", label: "Çağrılar", icon: "📞" },
  { href: "/panel/randevular", label: "Randevular", icon: "📅" },
  { href: "/panel/asistan", label: "Asistan Ayarları", icon: "🎙️" },
  { href: "/panel/baglanti", label: "Telefon Bağlantısı", icon: "🔌" },
];

export default function PanelNav() {
  const pathname = usePathname();
  return (
    <nav className="flex md:flex-col gap-1 md:mt-6 overflow-x-auto">
      {LINKS.map((l) => {
        const active =
          l.href === "/panel" ? pathname === "/panel" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors ${
              active
                ? "bg-accent/15 text-foreground border border-accent/30"
                : "text-muted hover:text-foreground hover:bg-surface-2"
            }`}
          >
            <span>{l.icon}</span> {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
