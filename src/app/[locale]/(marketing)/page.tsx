import { setRequestLocale } from "next-intl/server";
import { AfterHours } from "@/components/landing/after-hours";
import { Dialects } from "@/components/landing/dialects";
import { Faq } from "@/components/landing/faq";
import { Features } from "@/components/landing/features";
import { FinalCta } from "@/components/landing/final-cta";
import { Grounded } from "@/components/landing/grounded";
import { Hero } from "@/components/landing/hero";
import { Pricing } from "@/components/landing/pricing";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Hero />
      <Dialects />
      <Grounded />
      <AfterHours />
      <Features />
      <Pricing />
      <Faq />
      <FinalCta />
    </>
  );
}
