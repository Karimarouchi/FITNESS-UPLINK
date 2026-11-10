import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Back-office theme. One source of truth for the whole app: the provider lives in App.tsx,
 * so the choice survives navigation and is shared by every component that calls useTheme().
 * The theme is only *applied* by the back-office shell (data-bo-theme) and by its modals;
 * the public site, login and member areas never read it.
 */
export type BoTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "fu.bo.theme";

function isTheme(value: unknown): value is BoTheme {
  return value === "light" || value === "dark";
}

/** Dark by default; a previous choice is restored. Read synchronously so the first paint is right. */
function readStoredTheme(): BoTheme {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : "dark";
  } catch {
    return "dark";
  }
}

type ThemeValue = {
  theme: BoTheme;
  isDark: boolean;
  setTheme: (theme: BoTheme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<BoTheme>(readStoredTheme);

  const setTheme = useCallback((next: BoTheme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* storage unavailable (private mode…): the theme still applies for this session */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: BoTheme = current === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        /* see above */
      }
      return next;
    });
  }, []);

  // Keep several open tabs in step with each other.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === THEME_STORAGE_KEY && isTheme(event.newValue)) {
        setThemeState(event.newValue);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo<ThemeValue>(
    () => ({ theme, isDark: theme === "dark", setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

const FALLBACK: ThemeValue = { theme: "dark", isDark: true, setTheme: () => undefined, toggleTheme: () => undefined };

/** Safe outside the provider (returns the dark theme and does nothing on toggle). */
export function useTheme(): ThemeValue {
  return useContext(ThemeContext) ?? FALLBACK;
}
