"use client";

import { useSystemThemeSync } from "@/components/theme/theme";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children, dir }: { children: React.ReactNode; dir: "ltr" | "rtl" }) {
  useSystemThemeSync();

  return (
    <TooltipProvider>
      {children}
      <Toaster position={dir === "rtl" ? "bottom-left" : "bottom-right"} dir={dir} />
    </TooltipProvider>
  );
}
