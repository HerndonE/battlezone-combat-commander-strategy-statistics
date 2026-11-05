import { COLOR_PALETTE } from "../config.js";
import {
  parseDate,
  quarterKeyOf,
  quarterLabel,
  quarterShort,
  buildQuarterRange,
  bump,
  forEachMatch,
  splitMatch,
  esc,
  pct,
  fmtDate,
  wlRows,
  topRow,
  topRows,
  factionIcon,
  renderFaction,
  averageTime,
} from "./matchData.js";

// Re-exported so existing imports from profileModal.js keep working.
export * from "./matchData.js";

/* ==========================================================================
 * Shared profile modal used by the Commanders and Players tabs.
 *
 * A tab aggregates its own entities (each with name, games, wins, quarters,
 * matches and any number of {key: {games, wins}} buckets) and calls
 * openProfile(config). The modal renders stat tiles, quarterly activity
 * charts with comparison against up to 4 others, W/L lists, and export
 * (Excel / clipboard / Discord).
 * ========================================================================== */

const MAX_COMPARE = 4;
const DISCORD_LIMIT = 2000;

// Slot 0 is always the profile being viewed; compared entities keep their
// slot while selected, so removing one never repaints the others.
const SERIES_COLORS = [0, 5, 2, 6, 4].map((i) => COLOR_PALETTE[i]);
const WIN_COLOR = COLOR_PALETTE[0];
const LOSS_COLOR = COLOR_PALETTE[6];
const INK_MUTED = "#8a8a8a";
const GRID = "rgba(255,255,255,0.08)";

// ----------------------------------------------------------------------- Modal
const $ = (id) => document.getElementById(id);
const modal = $("activityModal");
const modalContent = modal.querySelector(".global-modal-content");
modalContent.style.setProperty("--cmd-win", WIN_COLOR);
modalContent.style.setProperty("--cmd-loss", LOSS_COLOR);

let cfg = null; // config of the open profile
const state = { compare: [], sort: {} };

/**
 * config = {
 *   entity, all, kindPlural ("commanders" / "players"), status: {label, class},
 *   quarterKeys, tiles: [{label, value (html), sub, wide}],
 *   lists: [{key, title, topN, icons, sortable, discord}],
 *   compareColumns: [{label, value(other, main) -> text}],
 *   summaryRows: [[label, value]], matchSheet: {headers, rows},
 *   discordLines: [string], filePrefix
 * }
 */
export function openProfile(config) {
  cfg = config;
  state.compare = [];
  state.sort = {};
  cfg.lists.forEach((l) => (state.sort[l.key] = "games"));
  $("cmd-copy-msg").textContent = "";

  modal.style.display = "flex";
  modalContent.scrollTop = 0;

  const e = cfg.entity;
  const statusEl = $("modalStatus");
  statusEl.className = `status ${cfg.status.class}`;
  statusEl.textContent = cfg.status.label;
  $("modalTitle").textContent = e.name;
  const kind = cfg.kindSingular;
  $("cmd-activity-title").textContent = `${kind[0].toUpperCase()}${kind.slice(1)} Activity`;
  $("cmd-compare-label").textContent = `Compare against up to ${MAX_COMPARE} ${cfg.kindPlural}:`;

  renderStats();
  renderCompareControls();
  renderActivity();
  renderLists();
  modal.querySelector(".global-close").focus();
}

function closeModal() {
  modal.style.display = "none";
  hideTooltip();
}

modal.querySelector(".global-close").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.style.display === "flex") closeModal();
});

function renderStats() {
  $("cmd-stats").innerHTML = cfg.tiles
    .map(
      (t) => `
    <div class="cmd-tile${t.wide ? " wide" : ""}">
      <div class="cmd-tile-label">${t.label}</div>
      <div class="cmd-tile-value">${t.value}</div>
      ${t.sub ? `<div class="cmd-tile-sub">${t.sub}</div>` : ""}
    </div>`,
    )
    .join("");
}

// --------------------------------------------------------------------- Compare
function seriesList() {
  return [
    { name: cfg.entity.name, color: SERIES_COLORS[0] },
    ...state.compare.map(({ name, slot }) => ({
      name,
      color: SERIES_COLORS[slot],
    })),
  ];
}

function renderCompareControls() {
  const select = $("cmd-compare-select");
  const taken = new Set([cfg.entity.name, ...state.compare.map((x) => x.name)]);
  const full = state.compare.length >= MAX_COMPARE;

  select.innerHTML =
    `<option value="">${full ? `Maximum of ${MAX_COMPARE} selected` : "Add to compare…"}</option>` +
    Object.keys(cfg.all)
      .filter((n) => !taken.has(n))
      .sort((a, b) => a.localeCompare(b))
      .map((n) => `<option value="${esc(n)}">${esc(n)}</option>`)
      .join("");
  select.disabled = full;

  $("cmd-compare-chips").innerHTML = state.compare
    .map(
      ({ name, slot }) => `
      <span class="cmd-chip">
        <i class="cmd-swatch" style="background:${SERIES_COLORS[slot]}"></i>
        ${esc(name)}
        <button type="button" data-remove="${esc(name)}" aria-label="Remove ${esc(name)}">&times;</button>
      </span>`,
    )
    .join("");
}

$("cmd-compare-select").addEventListener("change", (e) => {
  const name = e.target.value;
  if (!cfg || !name || state.compare.length >= MAX_COMPARE) return;
  const used = new Set(state.compare.map((x) => x.slot));
  const slot = [1, 2, 3, 4].find((s) => !used.has(s));
  state.compare.push({ name, slot });
  renderCompareControls();
  renderActivity();
});

$("cmd-compare-chips").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-remove]");
  if (!btn) return;
  state.compare = state.compare.filter((x) => x.name !== btn.dataset.remove);
  renderCompareControls();
  renderActivity();
});

// -------------------------------------------------------------------- Activity
function renderActivity() {
  const series = seriesList();
  const comparing = series.length > 1;

  $("cmd-legend").innerHTML = comparing
    ? series
        .map(
          (s) =>
            `<span><i class="cmd-swatch" style="background:${s.color}"></i>${esc(s.name)}</span>`,
        )
        .join("")
    : "";

  const q = (name, key) => cfg.all[name].quarters[key] || { games: 0, wins: 0 };

  renderGroupedBars($("cmd-chart-games"), {
    series,
    value: (name, key) => q(name, key).games,
    format: (v) => String(v),
    tooltipRow: (name, key) => {
      const d = q(name, key);
      return d.games ? `${d.games} (${d.wins}–${d.games - d.wins})` : "0";
    },
    yLabel: "Games",
  });

  renderGroupedBars($("cmd-chart-winrate"), {
    series,
    value: (name, key) => {
      const d = q(name, key);
      return d.games ? (d.wins / d.games) * 100 : null;
    },
    format: (v) => `${v}%`,
    tooltipRow: (name, key) => {
      const d = q(name, key);
      return d.games ? `${pct(d.wins, d.games)}% of ${d.games}` : "no games";
    },
    yMax: 100,
    reference: 50,
    yLabel: "Win %",
  });

  renderCompareTable(series);
}

// Rounded top corners, square at the baseline.
function barPath(x, y, w, h, r = 4) {
  if (h <= 0 || w <= 0) return "";
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function renderGroupedBars(container, opts) {
  const { series, value, format, tooltipRow, yMax, reference, yLabel } = opts;
  const quarterKeys = cfg.quarterKeys;
  container.innerHTML = "";
  if (!quarterKeys.length) return;

  const width = Math.max(container.clientWidth || 600, 320);
  const height = 220;
  const margin = { top: 10, right: 12, bottom: 30, left: 44 };
  const innerH = height - margin.top - margin.bottom;

  const x = d3
    .scaleBand()
    .domain(quarterKeys)
    .range([margin.left, width - margin.right])
    .paddingInner(0.25)
    .paddingOuter(0.1);

  const maxVal =
    yMax ??
    Math.max(
      1,
      d3.max(series, (s) => d3.max(quarterKeys, (k) => value(s.name, k) || 0)),
    );
  const y = d3
    .scaleLinear()
    .domain([0, maxVal])
    .nice()
    .range([height - margin.bottom, margin.top]);

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("role", "img")
    .attr(
      "aria-label",
      `${yLabel} per quarter for ${series.map((s) => s.name).join(", ")}`,
    );

  const ticks = y.ticks(Math.max(2, Math.floor(innerH / 45)));
  svg
    .append("g")
    .selectAll("line")
    .data(ticks)
    .join("line")
    .attr("x1", margin.left)
    .attr("x2", width - margin.right)
    .attr("y1", (d) => y(d))
    .attr("y2", (d) => y(d))
    .attr("stroke", GRID);
  svg
    .append("g")
    .selectAll("text")
    .data(ticks)
    .join("text")
    .attr("x", margin.left - 8)
    .attr("y", (d) => y(d))
    .attr("dy", "0.32em")
    .attr("text-anchor", "end")
    .attr("fill", INK_MUTED)
    .attr("font-size", 11)
    .text((d) => format(d));

  if (reference != null) {
    svg
      .append("line")
      .attr("x1", margin.left)
      .attr("x2", width - margin.right)
      .attr("y1", y(reference))
      .attr("y2", y(reference))
      .attr("stroke", INK_MUTED)
      .attr("stroke-dasharray", "4 4");
  }

  const every = Math.ceil(quarterKeys.length / Math.floor((width - 60) / 48));
  svg
    .append("g")
    .selectAll("text")
    .data(quarterKeys.filter((_, i) => i % every === 0))
    .join("text")
    .attr("x", (k) => x(k) + x.bandwidth() / 2)
    .attr("y", height - margin.bottom + 18)
    .attr("text-anchor", "middle")
    .attr("fill", INK_MUTED)
    .attr("font-size", 11)
    .text(quarterShort);

  svg
    .append("line")
    .attr("x1", margin.left)
    .attr("x2", width - margin.right)
    .attr("y1", y(0))
    .attr("y2", y(0))
    .attr("stroke", "#555");

  const highlight = svg
    .append("rect")
    .attr("y", margin.top)
    .attr("height", innerH)
    .attr("width", x.step())
    .attr("fill", "rgba(255,255,255,0.05)")
    .attr("opacity", 0);

  const gap = series.length > 1 ? 2 : 0;
  const barW = Math.max(
    1,
    (x.bandwidth() - gap * (series.length - 1)) / series.length,
  );
  series.forEach((s, i) => {
    svg
      .append("g")
      .selectAll("path")
      .data(quarterKeys)
      .join("path")
      .attr("fill", s.color)
      .attr("d", (k) => {
        const v = value(s.name, k);
        if (!v) return "";
        const bx = x(k) + i * (barW + gap);
        return barPath(bx, y(v), barW, y(0) - y(v), Math.min(4, barW / 2));
      });
  });

  const stepX = (k) => x(k) - (x.step() - x.bandwidth()) / 2;
  svg
    .append("g")
    .selectAll("rect")
    .data(quarterKeys)
    .join("rect")
    .attr("x", stepX)
    .attr("y", margin.top)
    .attr("width", x.step())
    .attr("height", innerH)
    .attr("fill", "transparent")
    .on("mousemove", (event, k) => {
      highlight.attr("x", stepX(k)).attr("opacity", 1);
      showTooltip(
        event,
        quarterLabel(k),
        series.map((s) => ({
          color: s.color,
          label: s.name,
          value: tooltipRow(s.name, k),
        })),
      );
    })
    .on("mouseleave", () => {
      highlight.attr("opacity", 0);
      hideTooltip();
    });
}

function renderCompareTable(series) {
  const el = $("cmd-compare-table");
  if (series.length < 2) {
    el.innerHTML = "";
    return;
  }
  const main = cfg.entity;
  const extra = cfg.compareColumns || [];
  const rows = series
    .map((s, i) => {
      const e = cfg.all[s.name];
      return `<tr>
        <td><i class="cmd-swatch" style="background:${s.color}"></i> ${esc(e.name)}</td>
        <td>${e.games}</td>
        <td>${e.wins}–${e.games - e.wins}</td>
        <td>${pct(e.wins, e.games)}%</td>
        ${extra.map((c) => `<td>${esc(i === 0 && c.relative ? "—" : c.value(e, main))}</td>`).join("")}
      </tr>`;
    })
    .join("");
  el.innerHTML = `
    <div class="cmd-table-wrap">
      <table class="cmd-table">
        <thead><tr>
          <th>Name</th><th>Games</th><th>W–L</th><th>Win %</th>
          ${extra.map((c) => `<th>${esc(c.label)}</th>`).join("")}
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// ------------------------------------------------------------------- W/L lists
const sortSelect = (key, title) => `
  <select class="cmd-sort" data-list="${key}" aria-label="Sort ${esc(title)}">
    <option value="games">Most games</option>
    <option value="winrate">Best win rate</option>
    <option value="name">Name</option>
  </select>`;

function renderLists() {
  const container = $("cmd-lists");
  container.innerHTML = cfg.lists
    .map(
      (l) => `
      <section class="cmd-section">
        <div class="cmd-section-head">
          <h3 class="cmd-section-title">${esc(l.title)}</h3>
          <div class="cmd-wl-legend" aria-hidden="true">
            <span><i class="cmd-swatch cmd-win"></i>W</span>
            <span><i class="cmd-swatch cmd-loss"></i>L</span>
          </div>
          ${l.sortable === false ? "" : sortSelect(l.key, l.title)}
        </div>
        ${l.note ? `<p class="cmd-section-note">${esc(l.note)}</p>` : ""}
        <div class="cmd-list-wrap">
          <div id="cmd-list-${l.key}" class="cmd-list"></div>
          <div class="cmd-more-hint" aria-hidden="true">&#8595; Scroll for more</div>
        </div>
      </section>`,
    )
    .join("");

  cfg.lists.forEach((l) => {
    const el = $(`cmd-list-${l.key}`);
    el.addEventListener("scroll", () => updateMoreHint(el), { passive: true });
    renderList(l);
  });
}

function renderList(l) {
  const bucket = cfg.entity[l.key];
  const rows = wlRows(bucket, state.sort[l.key]);
  const el = $(`cmd-list-${l.key}`);
  if (!rows.length) {
    el.innerHTML = `<p class="cmd-tile-sub">No games recorded.</p>`;
    updateMoreHint(el);
    return;
  }
  const topNames = new Set(topRows(bucket, l.topN || 0).map((r) => r.name));
  const maxGames = Math.max(...rows.map((r) => r.games));

  el.innerHTML = rows
    .map((r) => {
      const scale = (r.games / maxGames) * 100;
      const wPct = (r.wins / r.games) * scale;
      const lPct = (r.losses / r.games) * scale;
      return `
      <div class="cmd-row" title="${esc(r.name)}: ${r.wins} wins, ${r.losses} losses (${r.games} games)">
        <span class="cmd-row-name">${l.icons ? factionIcon(r.name, "faction-icon-sm") : ""}${esc(r.name)}${
          topNames.has(r.name) ? '<span class="cmd-top-badge">Top</span>' : ""
        }</span>
        <span class="cmd-bar" style="width:${scale}%">
          ${r.wins ? `<span class="cmd-bar-w" style="flex:${wPct}"></span>` : ""}
          ${r.losses ? `<span class="cmd-bar-l" style="flex:${lPct}"></span>` : ""}
        </span>
        <span class="cmd-row-wl">${r.wins}–${r.losses}</span>
        <span class="cmd-row-pct">${pct(r.wins, r.games, 0)}%</span>
      </div>`;
    })
    .join("");
  el.scrollTop = 0;
  updateMoreHint(el);
}

// Show a fade + "scroll for more" hint while a list has content below.
function updateMoreHint(list) {
  const more = list.scrollHeight - list.scrollTop - list.clientHeight > 4;
  list.parentElement.classList.toggle("has-more", more);
}

$("cmd-lists").addEventListener("change", (e) => {
  const sel = e.target.closest(".cmd-sort");
  if (!sel || !cfg) return;
  state.sort[sel.dataset.list] = sel.value;
  renderList(cfg.lists.find((l) => l.key === sel.dataset.list));
});

// --------------------------------------------------------------------- Tooltip
const tooltip = $("cmd-tooltip");

function showTooltip(event, title, rows) {
  tooltip.innerHTML =
    `<div class="tt-title">${esc(title)}</div>` +
    rows
      .map(
        (r) =>
          `<div class="tt-row"><i class="cmd-swatch" style="background:${r.color}"></i>${esc(r.label)}<b>${esc(r.value)}</b></div>`,
      )
      .join("");
  tooltip.style.opacity = 1;
  const { offsetWidth: w, offsetHeight: h } = tooltip;
  let left = event.clientX + 14;
  let top = event.clientY - h - 10;
  if (left + w > window.innerWidth - 8) left = event.clientX - w - 14;
  if (top < 8) top = event.clientY + 16;
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function hideTooltip() {
  tooltip.style.opacity = 0;
}

let resizeTimer;
window.addEventListener("resize", () => {
  if (modal.style.display !== "flex" || !cfg) return;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(renderActivity, 150);
});

// ---------------------------------------------------------------------- Export
const WL_HEADERS = ["Games", "Wins", "Losses", "Win %"];
const wlExportRows = (bucket) =>
  wlRows(bucket).map((r) => [
    r.name,
    r.games,
    r.wins,
    r.losses,
    +pct(r.wins, r.games),
  ]);

function quarterRows(e) {
  return cfg.quarterKeys
    .filter((k) => e.quarters[k])
    .map((k) => {
      const q = e.quarters[k];
      return [
        quarterLabel(k),
        q.games,
        q.wins,
        q.games - q.wins,
        +pct(q.wins, q.games),
      ];
    });
}

function addSheet(wb, name, aoa) {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = aoa[0].map((_, i) => ({
    wch: Math.min(
      40,
      Math.max(...aoa.map((r) => String(r[i] ?? "").length), 6) + 2,
    ),
  }));
  // Excel sheet names: max 31 chars, no []:*?/\
  XLSX.utils.book_append_sheet(wb, ws, name.replace(/[\[\]:*?/\\]/g, "").slice(0, 31));
}

function exportExcel() {
  if (!cfg) return;
  if (typeof XLSX === "undefined") {
    flash("Excel library not loaded. Please try again.");
    return;
  }
  const e = cfg.entity;
  const wb = XLSX.utils.book_new();
  addSheet(wb, "Summary", [["Stat", "Value"], ...cfg.summaryRows]);
  addSheet(wb, "Activity", [["Quarter", ...WL_HEADERS], ...quarterRows(e)]);
  cfg.lists.forEach((l) =>
    addSheet(wb, l.title, [[l.itemLabel || "Name", ...WL_HEADERS], ...wlExportRows(e[l.key])]),
  );
  addSheet(wb, "Matches", [cfg.matchSheet.headers, ...cfg.matchSheet.rows]);

  const series = seriesList();
  if (series.length > 1) {
    const extra = cfg.compareColumns || [];
    addSheet(wb, "Comparison", [
      ["Name", "Games", "Wins", "Losses", "Win %", ...extra.map((c) => c.label)],
      ...series.map((s, i) => {
        const o = cfg.all[s.name];
        return [
          o.name,
          o.games,
          o.wins,
          o.games - o.wins,
          +pct(o.wins, o.games),
          ...extra.map((c) => (i === 0 && c.relative ? "" : c.value(o, e))),
        ];
      }),
    ]);
  }

  const safe = e.name.replace(/[^\w\-]+/g, "_");
  XLSX.writeFile(wb, `bzcc-${cfg.filePrefix}-${safe}.xlsx`);
  flash("Excel file downloaded.");
}

// Tab-separated so it pastes cleanly into a spreadsheet as well as plain text.
function buildClipboardText() {
  const e = cfg.entity;
  const tsv = (rows) => rows.map((r) => r.join("\t")).join("\n");
  return [
    tsv(cfg.summaryRows),
    "",
    "ACTIVITY",
    tsv([["Quarter", ...WL_HEADERS], ...quarterRows(e)]),
    ...cfg.lists.flatMap((l) => [
      "",
      l.title.toUpperCase(),
      tsv([[l.itemLabel || "Name", ...WL_HEADERS], ...wlExportRows(e[l.key])]),
    ]),
  ].join("\n");
}

// Fit as many items as the budget allows, ending with "+N more".
function fitList(items, budget) {
  let text = "";
  for (let i = 0; i < items.length; i++) {
    const next = text ? `${text}, ${items[i]}` : items[i];
    const rest = items.length - i - 1;
    const tail = rest ? `, +${rest} more` : "";
    if (next.length + tail.length > budget) {
      const left = items.length - i;
      return text ? `${text}, +${left} more` : `+${left} more`;
    }
    text = next;
  }
  return text;
}

function buildDiscordText() {
  const e = cfg.entity;
  const header = [
    `**${e.name}** — ${cfg.status.label} ${cfg.kindSingular}`,
    "```",
    ...cfg.discordLines,
    "```",
  ].join("\n");
  const footer = "\n<https://bz2stats.us/pages/vsr.html>";

  const lists = cfg.lists
    .filter((l) => l.discord)
    .map((l) => ({
      label: `\n**${l.title} (W-L):** `,
      items: wlRows(e[l.key]).map((r) => `${r.name} ${r.wins}-${r.losses}`),
    }));
  lists.forEach((l) => (l.full = l.items.join(", ") || "None"));

  // Shortest lists first: each takes what it needs up to an equal share of
  // what is left, so unused room flows to the longer lists.
  let budget =
    DISCORD_LIMIT -
    10 -
    header.length -
    footer.length -
    lists.reduce((n, l) => n + l.label.length, 0);
  [...lists]
    .sort((a, b) => a.full.length - b.full.length)
    .forEach((l, i, arr) => {
      const share = Math.floor(budget / (arr.length - i));
      l.text = l.full.length <= share ? l.full : fitList(l.items, share);
      budget -= l.text.length;
    });

  return header + lists.map((l) => l.label + l.text).join("") + footer;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    modal.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

let flashTimer;
function flash(msg) {
  const el = $("cmd-copy-msg");
  el.textContent = msg;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => (el.textContent = ""), 3000);
}

$("cmd-export-excel").addEventListener("click", exportExcel);
$("cmd-copy-text").addEventListener("click", async () => {
  if (!cfg) return;
  await copyText(buildClipboardText());
  flash("Copied (pastes into a spreadsheet too).");
});
$("cmd-copy-discord").addEventListener("click", async () => {
  if (!cfg) return;
  const text = buildDiscordText();
  await copyText(text);
  flash(`Copied for Discord (${text.length}/${DISCORD_LIMIT} characters).`);
});

// Exposed for tests.
export const _test = {
  buildDiscordText: (c) => ((cfg = c), buildDiscordText()),
  buildClipboardText: (c) => ((cfg = c), buildClipboardText()),
};
