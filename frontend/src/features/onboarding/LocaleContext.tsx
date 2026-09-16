import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  copy,
  readOnboardingLocale,
  writeOnboardingLocale,
  type OnboardingCopy,
  type OnboardingLocale,
} from "./i18n";

type LocaleContextValue = {
  locale: OnboardingLocale;
  t: OnboardingCopy;
  setLocale: (locale: OnboardingLocale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function OnboardingLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<OnboardingLocale>(readOnboardingLocale);
  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      t: copy[locale],
      setLocale: (next) => {
        writeOnboardingLocale(next);
        setLocaleState(next);
      },
    }),
    [locale],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useOnboardingLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("OnboardingLocaleProvider missing");
  }
  return ctx;
}

export function LocaleSwitch() {
  const { locale, setLocale, t } = useOnboardingLocale();
  return (
    <div className="ob-locale">
      <button type="button" className={locale === "fr" ? "is-active" : ""} onClick={() => setLocale("fr")}>
        {t.langFr}
      </button>
      <button type="button" className={locale === "en" ? "is-active" : ""} onClick={() => setLocale("en")}>
        {t.langEn}
      </button>
    </div>
  );
}
