export function timeAgo(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} j`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: days > 300 ? "numeric" : undefined });
}

export function clockTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (date.toDateString() === yesterday.toDateString()) return "Hier";
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export function shortDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export function compactNumber(value: number) {
  return new Intl.NumberFormat("fr-FR", { notation: value >= 10_000 ? "compact" : "standard" }).format(value);
}

export type ProductStatus = { label: string; tone: "is-success" | "is-warn" | "is-danger" };

export function productStatus(product: { active: boolean; hiddenByAdmin: boolean }): ProductStatus {
  if (product.hiddenByAdmin) return { label: "Masqué par la modération", tone: "is-danger" };
  if (!product.active) return { label: "Brouillon", tone: "is-warn" };
  return { label: "Publié", tone: "is-success" };
}
