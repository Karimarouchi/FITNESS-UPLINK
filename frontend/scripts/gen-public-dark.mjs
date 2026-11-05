/**
 * Generates src/features/theme/public-dark.generated.css.
 *
 * The public site was written with hard-coded light colours, so there is no variable to flip. This script reads
 * the public stylesheets, and for every rule that sets a light background, a dark text colour or a light border
 * it emits a counterpart scoped to `.fu-public[data-bo-theme="dark"]` with the dark equivalent.
 *   run:  node scripts/gen-public-dark.mjs
 * Hand-written fixes live in src/features/theme/public-dark.css (loaded after the generated file).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const FILES = [
  "shared/styles/index.css",
  "shared/styles/fu.css",
  "shared/styles/brand-theme.css",
  "components/layout/public-shell.css",
  "components/brand/brand-logo.css",
  "components/ui/credit-card-form.css",
  "features/home/public/public.css",
  "features/home/home.css",
  "features/home/landing/hero.css",
  "features/home/landing/landing.css",
  "features/home/landing/vantage.css",
  "features/academy/pages/formation-detail.css",
];

const SCOPE = '.fu-public[data-bo-theme="dark"]';

// ---------- colour helpers ----------
function parseHex(hex) {
  let h = hex.slice(1);
  if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = h.length === 8 ? h.slice(6, 8) : "";
  return { r, g, b, a };
}
const toHex = ({ r, g, b, a = "" }) =>
  "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("") + a;
function lum({ r, g, b }) {
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function sat({ r, g, b }) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}
function hue({ r, g, b }) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
const mix = (c, base, t) => ({
  r: c.r * t + base.r * (1 - t),
  g: c.g * t + base.g * (1 - t),
  b: c.b * t + base.b * (1 - t),
  a: c.a,
});

const SURFACE = { r: 27, g: 35, b: 50 };
const PAGE_HEXES = new Set(["#f3eee6", "#f4efe7", "#f2ede5", "#f3efe8", "#f4f0e8", "#f5f1ea", "#f4f7fb"]);

function mapBackground(hex) {
  const c = parseHex(hex);
  const L = lum(c);
  const s = sat(c);
  if (L >= 0.6 && s > 0.12) return toHex(mix(c, SURFACE, 0.2)); // keep the hue of tinted fills (soft orange / blue / green)
  if (L >= 0.97) return "#1b2332";
  if (L >= 0.88) return PAGE_HEXES.has(hex.toLowerCase()) ? "#0d111b" : "#1f2838";
  if (L >= 0.72) return "#2a3342";
  return hex;
}
function mapText(hex) {
  const c = parseHex(hex);
  const L = lum(c);
  const s = sat(c);
  if (s > 0.45) {
    const h = hue(c);
    if (h >= 200 && h <= 260 && L < 0.2) return "#7ba3ff"; // brand blue text
    if (L < 0.12) return "#ff7a36"; // very dark saturated -> lift
    return hex; // orange and other accents stay
  }
  if (L < 0.06) return "#f8fafc";
  if (L < 0.2) return "#aab6c6";
  if (L < 0.45) return "#8190a5";
  return hex;
}
function mapBorder(hex) {
  const c = parseHex(hex);
  const L = lum(c);
  const s = sat(c);
  if (L >= 0.6 && s > 0.12) return toHex(mix(c, SURFACE, 0.35));
  if (L >= 0.72) return "#343c4a";
  return hex;
}

const VAR_BG = {
  "--uf-cream": "#0d111b",
  "--vt-paper": "#0d111b",
  "--uf-cream-2": "#1f2838",
  "--paper-2": "#1b2332",
  "--paper": "#0d111b",
  "--vx-cream": "#0d111b",
  "--lime-dim": "#1c2740",
};
const VAR_TEXT = {
  "--uf-ink": "#f8fafc",
  "--uf-ink-2": "#e2e8f0",
  "--vt-navy": "#f8fafc",
  "--vt-navy-2": "#e2e8f0",
  "--night": "#f8fafc",
  "--ink": "#f8fafc",
  "--uf-muted": "#9ca9ba",
  "--vt-text": "#9ca9ba",
  "--slate": "#9ca9ba",
  "--uf-grey": "#8190a5",
  "--vt-grey": "#8190a5",
  "--slate-light": "#8190a5",
  "--vx-ink": "#f8fafc",
  "--vx-blue": "#7ba3ff",
  "--lime": "#7ba3ff",
  "--brand": "#7ba3ff",
  "--vx-muted": "#9ca9ba",
};
const VAR_BORDER = { "--uf-line": "#343c4a", "--vt-line": "#343c4a", "--paper-line": "#343c4a" };

function mapValue(prop, value) {
  let kind = null;
  if (/^background(-color)?$/.test(prop)) kind = "bg";
  else if (/^(color|fill|stroke|caret-color|text-decoration-color|-webkit-text-fill-color)$/.test(prop)) kind = "text";
  else if (/^(border|outline)(-top|-right|-bottom|-left|-block|-inline)?(-color)?$/.test(prop) || /^column-rule/.test(prop)) kind = "border";
  if (!kind) return value;
  const map = { bg: mapBackground, text: mapText, border: mapBorder }[kind];
  let out = value.replace(/#[0-9a-fA-F]{3,8}\b/g, (m) => (/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(m) ? map(m) : m));
  const vars = { bg: VAR_BG, text: VAR_TEXT, border: VAR_BORDER }[kind];
  out = out.replace(/var\((--[a-z0-9-]+)(?:,[^)]*)?\)/gi, (m, name) => vars[name] ?? m);
  if (kind === "bg") {
    out = out.replace(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,/g, "rgba(27, 35, 50,");
  }
  return out;
}

// ---------- selector scoping ----------
function scopeSelector(sel) {
  const s = sel.trim();
  if (!s || /^(:root|html|body|\*|@)/.test(s)) return null;
  if (/\.fu-app|\.bo-|\.ob-shell|\.fu-switch|\.auth-shell|\.vt-app/.test(s)) return null;
  if (s.startsWith(".fu-public")) return s.replace(".fu-public", SCOPE);
  if (s.includes(".fu-public")) return null;
  return `${SCOPE} ${s}`;
}

// ---------- walk ----------
const WRAPPERS = new Set(["media", "supports", "layer"]);

function processContainer(container, out) {
  container.each((node) => {
    if (node.type === "rule") {
      if (node.parent?.type === "atrule" && /keyframes/.test(node.parent.name)) return;
      const selectors = node.selectors.map(scopeSelector).filter(Boolean);
      if (!selectors.length) return;
      const decls = [];
      node.each((d) => {
        if (d.type !== "decl") return;
        const next = mapValue(d.prop.toLowerCase(), d.value);
        if (next !== d.value) decls.push({ prop: d.prop, value: next });
      });
      if (!decls.length) return;
      const rule = postcss.rule({ selectors });
      decls.forEach((d) => rule.append(postcss.decl({ prop: d.prop, value: d.value, important: true })));
      out.append(rule);
    } else if (node.type === "atrule" && node.name === "layer" && node.nodes) {
      // flatten: a layer block in this file would be seen before Tailwind's and reorder the cascade layers
      processContainer(node, out);
    } else if (node.type === "atrule" && WRAPPERS.has(node.name) && node.nodes) {
      const wrapper = postcss.atRule({ name: node.name, params: node.params });
      processContainer(node, wrapper);
      if (wrapper.nodes && wrapper.nodes.length) out.append(wrapper);
    }
  });
}

const result = postcss.root();
let count = 0;
for (const file of FILES) {
  const css = readFileSync(join(root, file), "utf8");
  const parsed = postcss.parse(css, { from: file });
  const chunk = postcss.root();
  processContainer(parsed, chunk);
  if (chunk.nodes.length) {
    chunk.first.raws.before = `\n\n/* ---- ${file} ---- */\n`;
    count += chunk.nodes.length;
    result.append(chunk.nodes);
  }
}

const banner = `/* GENERATED by scripts/gen-public-dark.mjs - do not edit by hand.\n   Dark counterparts of the public site's light rules (scoped to ${SCOPE}). */\n`;
writeFileSync(join(root, "features/theme/public-dark.generated.css"), banner + result.toString() + "\n");
console.log("rules emitted:", count);
