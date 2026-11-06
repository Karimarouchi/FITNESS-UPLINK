import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Display size chosen by the visitor, in percent of the default size.
 * The provider lives in App.tsx and writes `--ui-scale` on <html>; scale.css applies it to the
 * whole site, public pages included. Stored per browser, like the theme.
 */
export const UI_SCALE_STORAGE_KEY = "fu.ui.scale";
export const UI_SCALE_DEFAULT = 100;
export const UI_SCALE_MIN = 70;
export const UI_SCALE_MAX = 130;
const UI_SCALE_STEP = 10;

function isScale(value: number) {
  return Number.isInteger(value) && value >= UI_SCALE_MIN && value <= UI_SCALE_MAX && value % UI_SCALE_STEP === 0;
}

/** Breakpoints ignore `zoom`, so a narrow window can only grow so far before its layout overflows. */
function maxForWidth(width: number) {
  if (width <= 720) return 110;
  if (width < 1280) return 120;
  return UI_SCALE_MAX;
}

/** Read synchronously so the first paint is already at the right size. */
function readStoredScale() {
  try {
    const stored = Number(window.localStorage.getItem(UI_SCALE_STORAGE_KEY));
    return isScale(stored) ? stored : UI_SCALE_DEFAULT;
  } catch {
    return UI_SCALE_DEFAULT;
  }
}

type UiScaleValue = {
  scale: number;
  max: number;
  increase: () => void;
  decrease: () => void;
  reset: () => void;
};

const UiScaleContext = createContext<UiScaleValue | null>(null);

export function UiScaleProvider({ children }: { children: ReactNode }) {
  const [chosen, setScaleState] = useState(readStoredScale);
  const [max, setMax] = useState(() => maxForWidth(window.innerWidth));
  // the choice itself is kept, so it comes back when the window widens again
  const scale = Math.min(chosen, max);

  useEffect(() => {
    const onResize = () => setMax(maxForWidth(window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useLayoutEffect(() => {
    document.documentElement.style.setProperty("--ui-scale", String(scale / 100));
  }, [scale]);

  const setScale = useCallback((next: number) => {
    if (!isScale(next)) return;
    setScaleState(next);
    try {
      window.localStorage.setItem(UI_SCALE_STORAGE_KEY, String(next));
    } catch {
      /* storage unavailable (private mode…): the size still applies for this session */
    }
  }, []);

  // Keep several open tabs in step with each other.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === UI_SCALE_STORAGE_KEY && isScale(Number(event.newValue))) {
        setScaleState(Number(event.newValue));
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo<UiScaleValue>(
    () => ({
      scale,
      max,
      increase: () => setScale(Math.min(scale + UI_SCALE_STEP, max)),
      decrease: () => setScale(scale - UI_SCALE_STEP),
      reset: () => setScale(UI_SCALE_DEFAULT),
    }),
    [scale, max, setScale],
  );

  return <UiScaleContext.Provider value={value}>{children}</UiScaleContext.Provider>;
}

const FALLBACK: UiScaleValue = {
  scale: UI_SCALE_DEFAULT,
  max: UI_SCALE_MAX,
  increase: () => undefined,
  decrease: () => undefined,
  reset: () => undefined,
};

/** Safe outside the provider (returns the default size and does nothing). */
export function useUiScale(): UiScaleValue {
  return useContext(UiScaleContext) ?? FALLBACK;
}
