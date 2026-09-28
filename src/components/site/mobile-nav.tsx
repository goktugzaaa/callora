"use client";

import { ListIcon } from "@phosphor-icons/react/dist/ssr";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { directionOf, type Locale } from "@/i18n/locales";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";

export function MobileNav({ links }: { links: { href: string; label: string }[] }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const side = directionOf(useLocale() as Locale) === "rtl" ? "left" : "right";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="md:hidden" aria-label={t("nav.openMenu")}>
            <ListIcon className="size-5" />
          </Button>
        }
      />
      <SheetContent side={side} className="w-[85vw] max-w-sm">
        <SheetHeader>
          <SheetTitle>
            <Logo />
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-3 text-base font-medium hover:bg-muted"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3 p-4">
          <div className="flex items-center gap-1">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
          <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
            {t("common.login")}
          </Link>
          <Link href="/signup" className={buttonVariants({ size: "lg" })}>
            {t("common.startTrial")}
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
