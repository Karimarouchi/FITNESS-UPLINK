import { useEffect, useState } from "react";
import { fetchMyBilling, type MeBilling } from "./api";

export function useBilling() {
  const [billing, setBilling] = useState<MeBilling | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMyBilling()
      .then((row) => {
        if (!cancelled) {
          setBilling(row);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBilling({ subscription: null, entitlements: [], limits: {} });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return billing;
}

export function can(billing: MeBilling | null, code: string) {
  return Boolean(billing?.entitlements.includes(code) || billing?.entitlements.includes("billing.unlock_all"));
}
