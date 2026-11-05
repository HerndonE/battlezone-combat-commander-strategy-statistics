// Player Activity per Month: games played (bars), distinct players (line) and
// players in their first recorded game (line), on one count axis. Players
// include commanders as well as everyone on the team rosters.
//
// Where it renders (found automatically, no year list to maintain):
//   #player-activity-1      -> Overview: full timeline, with Expand button
//                              #expand-btn-player-activity-1
//   #player-activity-YYYY   -> that year's months, for any year (2024, 2025,
//                              2026, 2027, ...). Adding a new year tab only
//                              needs <div id="player-activity-2027"></div>.
// Each chart uses the .tooltip element inside its own tab.
import { CONFIG, COLOR_PALETTE, TEXT_LIGHT } from "../config.js";
import { cleanRoster, forEachMatch, parseDate, splitMatch } from "./matchData.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const SERIES = {
  games: { label: "Games", color: COLOR_PALETTE[1] },
  people: { label: "Players", color: COLOR_PALETTE[6] },
  newPeople: { label: "New players", color: COLOR_PALETTE[0] },
};

/**
 * Monthly activity across every match in data.json. "People" counts both
 * commanders and everyone on the team rosters; "new" is a person's first
 * month on record.
 * @returns {{month: Date, games: number, people: number, newPeople: number}[]}
 */
export function getMonthlyActivity(rawData) {
  const matches = [];
  forEachMatch(rawData, (m) => matches.push(m));

  const byMonth = new Map(); // +monthStart -> { games, people: Set }
  const firstSeen = new Map(); // person -> +monthStart

  matches
    .map((m) => ({ m, date: parseDate(m.date) }))
    .sort((a, b) => a.date - b.date)
    .forEach(({ m, date }) => {
      const key = +d3.timeMonth(date);
      if (!byMonth.has(key)) byMonth.set(key, { games: 0, people: new Set() });
      const bucket = byMonth.get(key);
      bucket.games++;

      const { cmdA, cmdB } = splitMatch(m);
      [cmdA, cmdB, ...cleanRoster(m.teamOne), ...cleanRoster(m.teamTwo)].forEach((p) => {
        bucket.people.add(p);
        if (!firstSeen.has(p)) firstSeen.set(p, key);
      });
    });

  const newCounts = d3.rollup(
    Array.from(firstSeen.values()),
    (v) => v.length,
    (k) => k,
  );

  const keys = Array.from(byMonth.keys());
  if (!keys.length) return [];
  const first = new Date(d3.min(keys));
  const last = new Date(d3.max(keys));

  // Every month in range, so quiet months show as dips rather than gaps.
  return d3.timeMonth.range(first, d3.timeMonth.offset(last, 1)).map((month) => {
    const b = byMonth.get(+month);
    return {
      month,
      games: b ? b.games : 0,
      people: b ? b.people.size : 0,
      newPeople: newCounts.get(+month) || 0,
    };
  });
}

// Rounded top corners, square at the baseline.
function barPath(x, y, w, h, r = 4) {
  if (h <= 0 || w <= 0) return "";
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

export function playerActivityChart(
  containerSelector,
  data,
  { expandBtnSelector, tooltipSelector } = {},
) {
  const container = d3.select(containerSelector);
  if (container.empty()) return;
  if (!data.length) {
    container
      .append("p")
      .attr("class", "activity-note")
      .text("No games recorded yet.");
    return;
  }
  // Default to the tab's own tooltip (id "tooltip", "tooltip1", "tooltip2",
  // ...). Some charts add their own .tooltip inside their box; skip those.
  const isTabTooltip = (el) => /^tooltip\d*$/.test(el.id);
  const tab = container.node().closest(".tabcontent");
  const tooltipEl = tooltipSelector
    ? document.querySelector(tooltipSelector)
    : Array.from(tab?.querySelectorAll(".tooltip") || []).find(isTabTooltip) ||
      document.getElementById("tooltip");
  const tooltip = d3.select(tooltipEl);
  const baseWidth = 800;
  const expandedWidth = 1400;
  const height = 400;
  let isExpanded = false;

  const multiYear = new Set(data.map((d) => d.month.getFullYear())).size > 1;
  const monthLabel = (d) => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const tickLabel = (d) =>
    multiYear && d.getMonth() === 0 ? String(d.getFullYear()) : MONTHS[d.getMonth()];

  function render() {
    container.select("svg").remove();

    const width = isExpanded ? expandedWidth : baseWidth;
    const margin = { top: 40, right: 30, bottom: 50, left: 60 };

    const svg = container
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("background-color", "transparent");

    const x = d3
      .scaleBand()
      .domain(data.map((d) => +d.month))
      .range([margin.left, width - margin.right])
      .paddingInner(0.25)
      .paddingOuter(0.1);
    const cx = (d) => x(+d.month) + x.bandwidth() / 2;

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => Math.max(d.games, d.people)) || 1])
      .nice()
      .range([height - margin.bottom, margin.top]);

    // Light horizontal grid
    svg
      .append("g")
      .selectAll("line")
      .data(y.ticks(6))
      .join("line")
      .attr("x1", margin.left)
      .attr("x2", width - margin.right)
      .attr("y1", (d) => y(d))
      .attr("y2", (d) => y(d))
      .attr("stroke", TEXT_LIGHT)
      .attr("stroke-opacity", 0.08);

    const highlight = svg
      .append("rect")
      .attr("y", margin.top)
      .attr("height", height - margin.top - margin.bottom)
      .attr("width", x.step())
      .attr("fill", TEXT_LIGHT)
      .attr("opacity", 0);

    // Games: bars
    svg
      .append("g")
      .selectAll("path")
      .data(data)
      .join("path")
      .attr("fill", SERIES.games.color)
      .attr("d", (d) =>
        barPath(x(+d.month), y(d.games), x.bandwidth(), y(0) - y(d.games), Math.min(4, x.bandwidth() / 2)),
      );

    // People + new people: lines with dots
    ["people", "newPeople"].forEach((key) => {
      const color = SERIES[key].color;
      svg
        .append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 2.5)
        .attr("stroke-linejoin", "round")
        .attr("d", d3.line().x(cx).y((d) => y(d[key])));
      svg
        .append("g")
        .selectAll("circle")
        .data(data)
        .join("circle")
        .attr("cx", cx)
        .attr("cy", (d) => y(d[key]))
        .attr("r", 3.5)
        .attr("fill", color)
        .attr("stroke", "#1a1a1a")
        .attr("stroke-width", 1.5);
    });

    // Axes
    const every = Math.max(1, Math.ceil(data.length / Math.floor((width - 90) / 44)));
    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(
        d3
          .axisBottom(x)
          .tickValues(
            data
              .filter((d, i) => (multiYear ? d.month.getMonth() % (isExpanded ? 1 : 3) === 0 : i % every === 0))
              .map((d) => +d.month),
          )
          .tickFormat((k) => tickLabel(new Date(k))),
      );

    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(6));

    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -(height / 2))
      .attr("y", margin.left - 40)
      .attr("text-anchor", "middle")
      .attr("fill", TEXT_LIGHT)
      .text("Count per Month");

    // Hover columns: one per month, full height
    svg
      .append("g")
      .selectAll("rect")
      .data(data)
      .join("rect")
      .attr("x", (d) => x(+d.month) - (x.step() - x.bandwidth()) / 2)
      .attr("y", margin.top)
      .attr("width", x.step())
      .attr("height", height - margin.top - margin.bottom)
      .attr("fill", "transparent")
      .on("mousemove", (event, d) => {
        highlight
          .attr("x", x(+d.month) - (x.step() - x.bandwidth()) / 2)
          .attr("opacity", 0.06);
        tooltip
          .style("opacity", 1)
          .html(
            `<strong>${monthLabel(d.month)}</strong><br/>` +
              `Games: ${d.games}<br/>Players: ${d.people}<br/>New players: ${d.newPeople}`,
          )
          .style("left", event.pageX + 12 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseleave", () => {
        highlight.attr("opacity", 0);
        tooltip.style("opacity", 0);
      });

    // Legend along the top: bar swatch for games, line swatches for the rest
    const legend = svg
      .append("g")
      .selectAll("g")
      .data(Object.entries(SERIES))
      .join("g")
      .attr("transform", (_, i) => `translate(${margin.left + i * 110}, 10)`);

    legend.each(function ([key, s]) {
      const g = d3.select(this);
      if (key === "games") {
        g.append("rect").attr("width", 12).attr("height", 12).attr("rx", 2).attr("fill", s.color);
      } else {
        g.append("line")
          .attr("x1", 0)
          .attr("x2", 14)
          .attr("y1", 6)
          .attr("y2", 6)
          .attr("stroke", s.color)
          .attr("stroke-width", 2.5);
        g.append("circle").attr("cx", 7).attr("cy", 6).attr("r", 3.5).attr("fill", s.color);
      }
      g.append("text")
        .attr("x", 18)
        .attr("y", 10)
        .style("font-size", "11px")
        .attr("fill", TEXT_LIGHT)
        .text(s.label);
    });
  }

  render();

  const expandBtn = expandBtnSelector ? document.querySelector(expandBtnSelector) : null;
  if (expandBtn) {
    expandBtn.addEventListener("click", () => {
      isExpanded = !isExpanded;
      expandBtn.textContent = isExpanded ? "Collapse Chart" : "Expand Chart";
      render();
    });
  }
}

// Overview chart plus one per year container present on the page.
function renderAll(rawData) {
  const monthly = getMonthlyActivity(rawData);

  playerActivityChart("#player-activity-1", monthly, {
    expandBtnSelector: "#expand-btn-player-activity-1",
  });

  document.querySelectorAll('[id^="player-activity-"]').forEach((el) => {
    const match = el.id.match(/^player-activity-(\d{4})$/);
    if (!match) return;
    const year = Number(match[1]);
    playerActivityChart(
      `#${el.id}`,
      monthly.filter((d) => d.month.getFullYear() === year),
    );
  });
}

d3.json(CONFIG.jsonFile).then(renderAll);
