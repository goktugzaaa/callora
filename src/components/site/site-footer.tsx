import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { Link } from "@/i18n/navigation";

export async function SiteFooter() {
  const t = await getTranslations();
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">{t("footer.builtWith")}</p>
        </div>
        <div className="flex flex-col gap-3 text-sm text-muted-foreground md:items-end">
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <a href="#product" className="hover:text-foreground">{t("nav.product")}</a>
            <a href="#pricing" className="hover:text-foreground">{t("nav.pricing")}</a>
            <a href="#faq" className="hover:text-foreground">{t("nav.faq")}</a>
            <Link href="/login" className="hover:text-foreground">{t("common.login")}</Link>
          </nav>
          <p>{t("footer.rights", { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
  );
}
