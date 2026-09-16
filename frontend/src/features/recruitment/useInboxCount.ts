import { createElement, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { hasPermission } from "@/features/auth/types";
import { PERMS } from "@/features/auth/permissions";
import { fetchInboxCount } from "./api";

export function useInboxCount() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [count, setCount] = useState(0);
  const allowed = hasPermission(user, PERMS.HIRE_PIPELINE);

  useEffect(() => {
    if (!allowed) {
      setCount(0);
      return;
    }
    let cancelled = false;
    fetchInboxCount()
      .then((row) => {
        if (!cancelled) {
          setCount(row.count);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCount(0);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [allowed, pathname]);

  return count;
}

export function InboxCountBadge({ count }: { count: number }) {
  if (count <= 0) {
    return null;
  }
  const label = count > 99 ? "99+" : String(count);
  return createElement("span", { className: "hire-nav-count" }, label);
}
