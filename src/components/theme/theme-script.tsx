"use client";

import { THEME_INIT_SCRIPT } from "./theme";

/**
 * Inline script that runs during HTML parsing, before the first paint.
 * On the server it is executable (text/javascript); on the client it renders
 * as inert text/plain, so React never renders a live <script> in the browser
 * (see Next.js guide "Preventing flash before hydration").
 */
export function ThemeScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
    />
  );
}
