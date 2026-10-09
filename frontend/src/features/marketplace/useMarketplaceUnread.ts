import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { fetchMarketplaceUnread } from "./api";

const REFRESH_EVENT = "fu:marketplace-unread";

export function refreshMarketplaceUnread() {
  window.dispatchEvent(new Event(REFRESH_EVENT));
}

export function useMarketplaceUnread(enabled = true) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const active = enabled && Boolean(user) && user?.onboardingStep === "DONE";

  useEffect(() => {
    if (!active) {
      setCount(0);
      return;
    }
    let cancelled = false;
    const load = () => {
      fetchMarketplaceUnread()
        .then((result) => {
          if (!cancelled) setCount(result.count);
        })
        .catch(() => {
          if (!cancelled) setCount(0);
        });
    };
    load();
    const timer = window.setInterval(load, 45_000);
    window.addEventListener(REFRESH_EVENT, load);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener(REFRESH_EVENT, load);
    };
  }, [active]);

  return count;
}
