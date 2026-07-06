import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Callora: İşletmeniz İçin 7/24 Yapay Zekâ Telefon Asistanı",
  description:
    "Kaçırılan her çağrı, kaçırılan bir müşteridir. Callora, telefonlarınızı doğal Türkçe konuşan yapay zekâ ile karşılar, randevu alır ve her görüşmeyi kayıt altına alır.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
