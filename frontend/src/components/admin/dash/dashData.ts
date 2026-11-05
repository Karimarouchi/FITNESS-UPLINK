import type { AuthUser } from "@/features/auth/types";

/** Pure calculations for the admin dashboard. Everything comes from the real user list. */

export type PeriodKey = "month" | "30d" | "90d" | "365d";

export const PERIODS: { value: PeriodKey; label: string; vs: string }[] = [
  { value: "month", label: "Ce mois", vs: "vs mois dernier" },
  { value: "30d", label: "30 derniers jours", vs: "vs 30 jours précédents" },
  { value: "90d", label: "90 derniers jours", vs: "vs 90 jours précédents" },
  { value: "365d", label: "12 derniers mois", vs: "vs année précédente" },
];

export type ChartRange = "30d" | "6m" | "12m";

export const CHART_RANGES: { value: ChartRange; label: string }[] = [
  { value: "30d", label: "30 derniers jours" },
  { value: "6m", label: "6 derniers mois" },
  { value: "12m", label: "12 derniers mois" },
];

const DAY = 24 * 60 * 60 * 1000;

function time(user: AuthUser) {
  const value = new Date(user.createdAt).getTime();
  return Number.isNaN(value) ? 0 : value;
}

export function isBlocked(user: AuthUser) {
  return user.enabled === false;
}

export function isVerifiedAccount(user: AuthUser) {
  return user.verificationStatus === "verified";
}

/** Bounds of the selected period and of the equivalent period just before it. */
export function periodBounds(period: PeriodKey, now = new Date()) {
  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    return { start, end: now.getTime() + 1, prevStart, prevEnd: start };
  }
  const days = period === "30d" ? 30 : period === "90d" ? 90 : 365;
  const end = now.getTime() + 1;
  const start = end - days * DAY;
  return { start, end, prevStart: start - days * DAY, prevEnd: start };
}

export function signupsBetween(users: AuthUser[], from: number, to: number) {
  return users.filter((user) => {
    const created = time(user);
    return created >= from && created < to;
  }).length;
}

export type Growth = { current: number; previous: number; percent: number | null };

export function signupGrowth(users: AuthUser[], period: PeriodKey): Growth {
  const bounds = periodBounds(period);
  const current = signupsBetween(users, bounds.start, bounds.end);
  const previous = signupsBetween(users, bounds.prevStart, bounds.prevEnd);
  return { current, previous, percent: previous > 0 ? Math.round(((current - previous) / previous) * 100) : null };
}

export type Bucket = { key: string; label: string; full: string; count: number };

/** Registrations grouped by day (30 days) or by month (6 / 12 months), oldest first. */
export function registrationBuckets(users: AuthUser[], range: ChartRange, now = new Date()): Bucket[] {
  const buckets: { key: string; label: string; full: string; from: number; to: number }[] = [];
  if (range === "30d") {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (let i = 29; i >= 0; i -= 1) {
      const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1);
      buckets.push({
        key: from.toISOString(),
        label: from.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
        full: from.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
        from: from.getTime(),
        to: to.getTime(),
      });
    }
  } else {
    const months = range === "6m" ? 6 : 12;
    for (let i = months - 1; i >= 0; i -= 1) {
      const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const to = new Date(from.getFullYear(), from.getMonth() + 1, 1);
      const month = from.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "");
      buckets.push({
        key: from.toISOString(),
        label: month.charAt(0).toUpperCase() + month.slice(1),
        full: from.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
        from: from.getTime(),
        to: to.getTime(),
      });
    }
  }
  const times = users.map(time);
  return buckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    full: bucket.full,
    count: times.filter((t) => t >= bucket.from && t < bucket.to).length,
  }));
}

/** Axis maximum and tick values that stay readable ("nice" numbers). */
export function niceAxis(maxValue: number) {
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10000];
  const step = steps.find((candidate) => candidate * 4 >= Math.max(maxValue, 1)) ?? Math.ceil(maxValue / 4);
  return { max: step * 4, ticks: [0, 1, 2, 3, 4].map((index) => index * step) };
}

/** Smooth monotone curve through the points (never overshoots the data). */
export function smoothPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;
  const n = points.length;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx.push(points[i + 1].x - points[i].x);
    slope.push((points[i + 1].y - points[i].y) / (points[i + 1].x - points[i].x || 1));
  }
  const tangents: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i += 1) {
    tangents.push(slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2);
  }
  tangents.push(slope[n - 2]);
  for (let i = 0; i < n - 1; i += 1) {
    if (slope[i] === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
      continue;
    }
    const a = tangents[i] / slope[i];
    const b = tangents[i + 1] / slope[i];
    const h = Math.hypot(a, b);
    if (h > 3) {
      const t = 3 / h;
      tangents[i] = t * a * slope[i];
      tangents[i + 1] = t * b * slope[i];
    }
  }
  let path = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < n - 1; i += 1) {
    const c1x = points[i].x + dx[i] / 3;
    const c1y = points[i].y + (tangents[i] * dx[i]) / 3;
    const c2x = points[i + 1].x - dx[i] / 3;
    const c2y = points[i + 1].y - (tangents[i + 1] * dx[i]) / 3;
    path += ` C${c1x},${c1y} ${c2x},${c2y} ${points[i + 1].x},${points[i + 1].y}`;
  }
  return path;
}

export type AccountStatus = { key: "verified" | "pending" | "blocked"; label: string; count: number };

/** Mutually exclusive account statuses: each user is counted exactly once. */
export function accountStatuses(users: AuthUser[]): AccountStatus[] {
  let verified = 0;
  let pending = 0;
  let blocked = 0;
  users.forEach((user) => {
    if (isBlocked(user)) blocked += 1;
    else if (isVerifiedAccount(user)) verified += 1;
    else pending += 1;
  });
  return [
    { key: "verified", label: "Vérifiés", count: verified },
    { key: "pending", label: "Non vérifiés", count: pending },
    { key: "blocked", label: "Bloqués", count: blocked },
  ];
}

export type CountryRow = { key: string; name: string; flag: string | null; count: number };

/** Top three countries, everything else (and users without a country) grouped as "Autres". */
export function countryRows(users: AuthUser[], limit = 3): CountryRow[] {
  const map = new Map<string, CountryRow>();
  let unknown = 0;
  users.forEach((user) => {
    if (!user.country) {
      unknown += 1;
      return;
    }
    const key = user.country.iso2 || user.country.name;
    const row = map.get(key) ?? { key, name: user.country.name, flag: user.country.flagEmoji || null, count: 0 };
    row.count += 1;
    map.set(key, row);
  });
  const sorted = [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const top = sorted.slice(0, limit);
  const others = sorted.slice(limit).reduce((sum, row) => sum + row.count, 0) + unknown;
  return others > 0 ? [...top, { key: "others", name: "Autres", flag: null, count: others }] : top;
}

export function percentOf(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}
