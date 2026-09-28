"use client";

import { CheckIcon, GlobeSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/i18n/locales";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LocaleSwitcher({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size={compact ? "icon" : "sm"} aria-label={t("language")} disabled={pending}>
            <GlobeSimpleIcon className="size-4" />
            {!compact && <span>{LOCALE_LABELS[locale]}</span>}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-40">
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l}
            lang={l}
            onClick={() => startTransition(() => router.replace(pathname, { locale: l }))}
            className="justify-between gap-6"
          >
            {LOCALE_LABELS[l]}
            {l === locale && <CheckIcon className="size-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
