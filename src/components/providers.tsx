"use client";
import { createContext, useContext } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { en, fa, type MessageKey } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
const Context = createContext<{
  locale: Locale;
  t: (key: MessageKey) => string;
}>({ locale: "en", t: (key) => en[key] });
export function Providers({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <Context.Provider
      value={{ locale, t: (key) => (locale === "fa" ? fa : en)[key] }}
    >
      <ThemeProvider
        attribute="data-theme"
        defaultTheme="light"
        enableSystem={false}
        disableTransitionOnChange
      >
        {children}
        <Toaster
          position={locale === "fa" ? "bottom-left" : "bottom-right"}
          richColors
          closeButton
          dir={locale === "fa" ? "rtl" : "ltr"}
        />
      </ThemeProvider>
    </Context.Provider>
  );
}
export function useI18n() {
  return useContext(Context);
}
