import { FACTIONICONS } from "../config.js";

/* ==========================================================================
 * Pure data helpers shared by the Commanders, Players and Player Activity
 * code. No DOM access at import time, so any page can use them.
 * ========================================================================== */

// Every year key under data.vsr ("2024", "2025", ... and any future year) is
// read automatically by forEachMatch, so new years need no code changes here.

// Players listed on a team roster, ignoring blanks and the "NA" placeholder.
export const cleanRoster = (list) =>
  (Array.isArray(list) ? list : [])
    .map((p) => String(p || "").trim())
    .filter((p) => p && p !== "NA");

export function parseDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr.includes("-")) {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  const [month, day, year] = dateStr.split(".").map(Number);
  const fullYear = year < 100 ? 2000 + year : year;
  return new Date(fullYear, month - 1, day);
}

export const quarterKeyOf = (date) =>
  date.getFullYear() * 4 + Math.floor(date.getMonth() / 3);
export const quarterLabel = (key) => `${Math.floor(key / 4)} Q${(key % 4) + 1}`;
export const quarterShort = (key) =>
  `Q${(key % 4) + 1} '${String(Math.floor(key / 4)).slice(-2)}`;

// Continuous list of quarter keys covering every entity's activity.
export function buildQuarterRange(entities) {
  let min = Infinity;
  let max = -Infinity;
  entities.forEach((e) =>
    Object.keys(e.quarters).forEach((k) => {
      min = Math.min(min, +k);
      max = Math.max(max, +k);
    }),
  );
  const keys = [];
  for (let k = min; k <= max; k++) keys.push(k);
  return keys;
}

export function bump(bucket, key, won) {
  const b = (bucket[key] = bucket[key] || { games: 0, wins: 0 });
  b.games++;
  if (won) b.wins++;
}

// Iterate every raw match in data.json.
export function forEachMatch(data, fn) {
  Object.values(data?.vsr || {}).forEach((yearBlock) => {
    Object.values(yearBlock || {}).forEach((rawYear) => {
      if (!rawYear?.month) return;
      Object.values(rawYear.month).forEach((monthBlock) => {
        Object.values(monthBlock).forEach((dateBlock) => {
          Object.values(dateBlock).forEach(fn);
        });
      });
    });
  });
}

export function splitMatch(match) {
  const [cmdA, cmdB] = match.commanders.split(" vs ").map((x) => x.trim());
  const [facA, facB] = match.factions
    .replace(/[\[\]]/g, "")
    .split(",")
    .map((x) => x.trim());
  return { cmdA, cmdB, facA, facB, aWon: match.winner === cmdA };
}

export const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ],
  );

export const pct = (wins, games, digits = 1) =>
  games ? ((wins / games) * 100).toFixed(digits) : "0.0";

export const fmtDate = (d) => (d ? d.toLocaleDateString() : "Never");

export function wlRows(bucket, sort = "games") {
  const rows = Object.entries(bucket || {}).map(([name, { games, wins }]) => ({
    name,
    games,
    wins,
    losses: games - wins,
    rate: games ? wins / games : 0,
  }));
  const byName = (a, b) => a.name.localeCompare(b.name);
  if (sort === "name") return rows.sort(byName);
  if (sort === "winrate")
    return rows.sort(
      (a, b) => b.rate - a.rate || b.games - a.games || byName(a, b),
    );
  return rows.sort(
    (a, b) => b.games - a.games || b.wins - a.wins || byName(a, b),
  );
}

export const topRow = (bucket) => wlRows(bucket)[0] || null;
export const topRows = (bucket, n = 3) => wlRows(bucket).slice(0, n);

export function factionIcon(faction, cls = "faction-icon") {
  const icon = FACTIONICONS[String(faction).trim().toLowerCase()];
  return icon ? `<img src="${icon}" alt="" class="${cls}">` : "";
}

export function renderFaction(row, iconClass = "") {
  if (!row) return "None";
  return `<span class="faction ${iconClass}">${factionIcon(row.name)}${esc(row.name)} (${row.games})</span>`;
}

const secondsOf = (t) => {
  const p = String(t || "")
    .split(":")
    .map(Number);
  if (p.some(isNaN)) return 0;
  if (p.length === 2) return p[0] * 60 + p[1];
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  return 0;
};

// Average "MM:SS" match length over matches that recorded a time.
export function averageTime(matches) {
  const timed = matches.map((m) => secondsOf(m.time)).filter(Boolean);
  if (!timed.length) return "N/A";
  const avg = Math.round(timed.reduce((a, b) => a + b, 0) / timed.length);
  return `${Math.floor(avg / 60)}:${String(avg % 60).padStart(2, "0")}`;
}
