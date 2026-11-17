export const CONFIG = {
  jsonFile: "../data/data.json",
};

export const COLOR_PALETTE = [
  "#4cc9f0",
  "#4895ef",
  "#4361ee",
  "#3a0ca3",
  "#7209b7",
  "#b5179e",
  "#f72585",
];

export const SERIES_COLOR = COLOR_PALETTE[0];

export const FACTION_COLORS = {
  "I.S.D.F": COLOR_PALETTE[0], // cyan
  Scion: COLOR_PALETTE[4], // purple
  Hadean: COLOR_PALETTE[6], // pink
};
export const factionColor = (name) => FACTION_COLORS[name] || "#B9B5C6";

// Same steps the original Map Popularity chart used.
export const POPULARITY_COLORS = {
  "Very Popular": COLOR_PALETTE[0],
  "Mostly Popular": COLOR_PALETTE[2],
  "Moderately Popular": COLOR_PALETTE[4],
  "Least Popular": COLOR_PALETTE[6],
};

// Readable text color for a label drawn on top of `fill` (a #rrggbb hex).
export function textOn(fill) {
  const n = parseInt(String(fill).replace("#", ""), 16);
  const lin = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const L =
    0.2126 * lin((n >> 16) & 255) +
    0.7152 * lin((n >> 8) & 255) +
    0.0722 * lin(n & 255);
  // Pick whichever of white / near-black contrasts more.
  return 1.05 / (L + 0.05) >= (L + 0.05) / 0.05 ? TEXT_LIGHT : "#0A0206";
}

export const THEME = {
  primary: "#d1581f", // burnt orange: buttons, borders, active states, glows (4.9:1)
  primaryLight: "#F8813C", // hover + orange text on dark (6.9:1)
  onPrimary: "#0A0206", // text on orange fills (5.6:1)
  secondary: "#27569D", // steel blue: fills only (white text 7.2:1)
  secondaryLight: "#8FB3E8", // links and blue text on dark (8.3:1)
  accent: "#E0BF43", // gold: badges / warnings, sparingly
  background: "#19171E", // page background (also the smoke backdrop)
  surface: "#202840", // navbar, footer, cards
  text: "#E8E6EE", // body text (14:1)
  textMuted: "#B9B5C6", // secondary text (8.9:1)
  focus: "#E0BF43", // keyboard focus ring
  // Smoke background (smoke.js)
  smoke: "#3F3D60", // slate purple tint for the smoke background
  smokeOpacity: 0.35,
};

// THEME key -> CSS variable it drives.
const THEME_CSS_VARS = {
  primary: "--color-primary",
  primaryLight: "--color-primary-light",
  onPrimary: "--color-on-primary",
  secondary: "--color-secondary",
  secondaryLight: "--color-secondary-light",
  accent: "--color-accent",
  background: "--color-bg",
  surface: "--color-surface",
  text: "--color-text",
  textMuted: "--color-text-muted",
  focus: "--color-focus",
};

if (typeof document !== "undefined") {
  const root = document.documentElement.style;
  for (const [key, cssVar] of Object.entries(THEME_CSS_VARS)) {
    root.setProperty(cssVar, THEME[key]);
  }
}

export const BACKGROUND_COLOR = "transparent";
export const TEXT_LIGHT = "#ffffff";
export const TEXT_DARK = "#000000";

export const GRAPH_POPERTIES = {
  svgHeight: 450,
};

export const FACTIONICONS = {
  "i.s.d.f": "/assets/images/ISDF-Logo.png",
  scion: "/assets/images/Scion-Logo.png",
  hadean: "/assets/images/Hadean-Logo.png",
};

// "Last Updated" in the navbar, shown in the viewer's own time zone.
function parseUtc(raw) {
  const m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/.exec(
    String(raw || "").trim(),
  );
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d, h, mi));
  return Number.isNaN(date.getTime()) ? null : date;
}

// e.g. "Nov 15, 2026, 1:29 PM EST" (format follows the viewer's locale).
export function formatLastUpdated(raw) {
  const date = parseUtc(raw);
  if (!date) return raw; // unrecognised format: show it as stored
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function showLastUpdated(
  raw,
  el = document.getElementById("last-updated"),
) {
  if (!el || !raw) return;
  el.textContent = "Last Updated: " + formatLastUpdated(raw);
  el.title = raw; // original UTC time on hover
}

// ---- Responsive chart helpers (shared by VSR, tournaments, stock etc) ----
// Charts draw at the width of the box they sit in and redraw when that box
// changes size (window resized, tab shown, chart expanded).

/**
 * Width to draw a chart at. Hidden containers (an inactive tab) measure 0, so
 * they get `fallback`; the resize observer redraws them once they're shown.
 */
export function chartWidth(
  node,
  { min = 320, max = Infinity, fallback = 800 } = {},
) {
  const measured = node ? node.clientWidth : 0;
  if (!measured) return fallback;
  return Math.max(min, Math.min(max, Math.floor(measured)));
}

/** Call `redraw` whenever `node` changes width (height changes are ignored). */
export function redrawOnResize(node, redraw) {
  if (!node || typeof ResizeObserver === "undefined") return;
  let lastWidth = node.clientWidth;
  let frame = 0;
  new ResizeObserver(() => {
    const width = node.clientWidth;
    if (!width || width === lastWidth) return;
    lastWidth = width;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(redraw);
  }).observe(node);
}

/**
 * "Expand Chart" on a time chart: let its card span the whole row of the
 * two-column chart grid instead of drawing wider than the screen.
 */
export function setFullRow(node, isFull) {
  const card = node && node.closest(".graph-wrapper");
  if (card) card.classList.toggle("graph-wrapper--full", isFull);
}

/**
 * Smallest month step (1, 2, 3, 4, 6 or 12) whose tick labels fit in
 * `plotWidth` at roughly `minSpacing` pixels apart.
 */
export function monthTickStep(monthCount, plotWidth, minSpacing = 52) {
  const fits = Math.max(1, Math.floor(plotWidth / minSpacing));
  return [1, 2, 3, 4, 6, 12].find((step) => monthCount / step <= fits) || 12;
}

/**
 * Evenly spaced ticks for a day-by-day time axis: the 1st and 15th of each
 * month when there is room, otherwise one label per month (or every few
 * months). Avoids d3's default mix of week and month ticks, which can put
 * "November" and "Nov 08" almost on top of each other.
 * @returns {{values: Date[], format: (d: Date) => string}}
 */
export function dayAxisTicks(x, plotWidth) {
  const [start, end] = x.domain();
  const months = Math.max(1, d3.timeMonth.count(start, end) + 1);
  const pxPerMonth = plotWidth / months;
  const inRange = (d) => d >= start && d <= end;

  if (pxPerMonth >= 140) {
    const values = d3.timeDay
      .range(d3.timeMonth.floor(start), d3.timeDay.offset(end, 1))
      .filter((d) => d.getDate() === 1 || d.getDate() === 15)
      .filter(inRange);
    return { values, format: d3.timeFormat("%b %-d") };
  }

  const step = monthTickStep(months, plotWidth, 48);
  const values = d3.timeMonth
    .range(d3.timeMonth.ceil(start), d3.timeDay.offset(end, 1))
    .filter((d) => d.getMonth() % step === 0)
    .filter(inRange);
  return { values, format: d3.timeFormat("%b") };
}

/** Shorten a label to roughly fit `maxPx` at ~8px per character. */
export function fitLabel(text, maxPx) {
  const str = String(text);
  const maxChars = Math.max(3, Math.floor(maxPx / 8));
  return str.length > maxChars ? str.slice(0, maxChars - 1) + "…" : str;
}
