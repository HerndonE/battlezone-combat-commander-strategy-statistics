import {
  COLOR_PALETTE,
  BACKGROUND_COLOR,
  TEXT_LIGHT,
  TEXT_DARK,
  GRAPH_POPERTIES,
} from "../config.js";
import { timeToSeconds } from "./data.js";

function clear(selector) {
  const el = document.querySelector(selector);
  if (el) el.innerHTML = "";
  return el;
}

// Widest a chart may be drawn. Charts are sized from their data, but on a
// phone that has to give way to the viewport or the SVG overflows the screen.
function availableWidth() {
  const viewport =
    typeof window !== "undefined" && window.innerWidth ? window.innerWidth : 1200;
  return Math.min(1200, Math.max(300, viewport - 40));
}

// Single stacked bar, proportional to each faction share. Mirrors the VSR
// overview so both pages read the same way.
function factionPopularity(containerId, chartData) {
  if (!clear(containerId)) return;

  const data = Object.entries(chartData || {}).sort((a, b) => b[1] - a[1]);
  if (!data.length) return;

  const width = Math.min(600, availableWidth());
  const height = 60;
  const barHeight = 20;
  const borderRadius = 5;

  const svg = d3
    .select(containerId)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("background-color", BACKGROUND_COLOR);

  const total = d3.sum(data, (d) => d[1]);
  const x = d3.scaleLinear().domain([0, total]).range([0, width]);
  const color = d3
    .scaleOrdinal()
    .domain(data.map((d) => d[0]))
    .range(COLOR_PALETTE);

  let currentX = 0;

  svg
    .selectAll("g")
    .data(data)
    .enter()
    .append("g")
    .attr("transform", (d) => {
      const xPos = currentX;
      currentX += x(d[1]);
      return `translate(${xPos}, 20)`;
    })
    .each(function (d) {
      const g = d3.select(this);
      const barWidth = x(d[1]);

      g.append("rect")
        .attr("width", barWidth)
        .attr("height", barHeight)
        .attr("fill", color(d[0]))
        .attr("rx", borderRadius)
        .attr("ry", borderRadius);

      g.append("text")
        .attr("x", barWidth > 40 ? barWidth / 2 : barWidth + 5)
        .attr("y", barHeight / 2 + 4)
        .attr("text-anchor", barWidth > 40 ? "middle" : "start")
        .attr("fill", barWidth > 40 ? TEXT_LIGHT : TEXT_DARK)
        .style("font-size", "12px")
        .text(`${d[0]}: ${d[1]}`);
    });
}

// Vertical bar chart used for map counts, matchups, rounds and game lengths.
function countBarChart(containerId, entries, options = {}) {
  if (!clear(containerId)) return;

  const data = entries
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  if (!data.length) return;

  const narrow = availableWidth() < 520;
  const svgHeight = narrow
    ? Math.round(GRAPH_POPERTIES.svgHeight * 0.85)
    : GRAPH_POPERTIES.svgHeight;
  const margin = {
    top: 20,
    right: narrow ? 10 : 20,
    bottom: options.bottom || 140,
    left: narrow ? 38 : 50,
  };
  const borderRadius = 5;

  const maxWidth = availableWidth();
  const computedWidth = Math.min(
    Math.max(data.length * 90, Math.min(500, maxWidth)),
    maxWidth,
  );
  const width = computedWidth - margin.left - margin.right;
  const height = svgHeight - margin.top - margin.bottom;

  const svg = d3
    .select(containerId)
    .append("svg")
    .attr("width", computedWidth)
    .attr("height", svgHeight)
    .style("background-color", BACKGROUND_COLOR);

  const x = d3
    .scaleBand()
    .domain(data.map((d) => d.name))
    .range([margin.left, width + margin.left])
    .padding(0.2);

  const maxValue = d3.max(data, (d) => d.value);

  const y = d3
    .scaleLinear()
    .domain([0, maxValue])
    .nice()
    .range([height + margin.top, margin.top]);

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0, ${height + margin.top})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(90)")
    .attr("x", 9)
    .attr("y", 0)
    .attr("dy", ".35em")
    .style("text-anchor", "start")
    .attr("fill", TEXT_LIGHT);

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y).ticks(Math.min(maxValue, 10)))
    .selectAll("text")
    .attr("fill", TEXT_LIGHT);

  const tooltip = d3.select("#tooltip");

  svg
    .selectAll(".bar")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", (d) => x(d.name))
    .attr("y", (d) => y(d.value))
    .attr("width", x.bandwidth())
    .attr("height", (d) => height + margin.top - y(d.value))
    .attr("fill", (d, i) => COLOR_PALETTE[i % COLOR_PALETTE.length])
    .attr("rx", borderRadius)
    .attr("ry", borderRadius)
    .on("mouseover", (event, d) => {
      tooltip
        .style("opacity", 1)
        .html(
          `<strong>${d.name}</strong><br>${options.label || "Count"}: ${d.value}`,
        );
    })
    .on("mousemove", (event) => {
      tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", () => tooltip.style("opacity", 0));

  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(height / 2) - margin.top)
    .attr("y", margin.left - 35)
    .attr("text-anchor", "middle")
    .attr("fill", TEXT_LIGHT)
    .text(options.label || "Count");
}

function summaryCard(label, value, sub) {
  return `
    <div class="trn-stat">
      <span class="trn-stat-value">${value}</span>
      <span class="trn-stat-label">${label}</span>
      ${sub ? `<span class="trn-stat-sub">${sub}</span>` : ""}
    </div>`;
}

function describeGame(record) {
  if (!record || !record.data) return "";
  const game = record.data;
  return `${game.map} &middot; ${game.teams} &middot; ${game.date}`;
}

function renderSummary(tournament, totals) {
  const el = document.getElementById("trn-summary");
  if (!el) return;

  const times = tournament.game_times || {};
  const period = totals.months.length
    ? `${totals.months.join(", ")} ${tournament.year || ""}`.trim()
    : tournament.year || "";

  el.innerHTML = [
    summaryCard("Games", totals.games, period),
    summaryCard("Teams", totals.teams, `${totals.days} play days`),
    summaryCard(
      "Matches",
      totals.matches,
      `Best-of series across ${totals.games} games`,
    ),
    summaryCard("Average Game", times.average_time || "&mdash;", ""),
    summaryCard(
      "Longest Game",
      times.longest_time ? times.longest_time.time : "&mdash;",
      describeGame(times.longest_time),
    ),
    summaryCard(
      "Shortest Game",
      times.shortest_time ? times.shortest_time.time : "&mdash;",
      describeGame(times.shortest_time),
    ),
  ].join("");
}

export function renderOverview(tournament, games, totals) {
  renderSummary(tournament, totals);

  factionPopularity("#trn-faction-bar", tournament.faction_counts);

  countBarChart("#trn-chart-maps", tournament.most_played_maps || [], {
    label: "Games",
  });

  countBarChart(
    "#trn-chart-matchups",
    Object.entries(tournament.popular_matchups || {}),
    { label: "Games", bottom: 160 },
  );

  // How many matches were swept versus going the distance. The per-game
  // "round #" counts games inside a series, so it says nothing on its own.
  const lengthCounts = new Map();
  for (const series of totals.series) {
    const played = series.games.length;
    lengthCounts.set(played, (lengthCounts.get(played) || 0) + 1);
  }
  const lengthEntries = [...lengthCounts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([played, count]) => [`${played}-game match`, count]);

  countBarChart("#trn-chart-rounds", lengthEntries, {
    label: "Matches",
    bottom: 120,
  });

  // Longest games, so the time stats have some shape behind them.
  const longest = games
    .filter((g) => timeToSeconds(g.time) > 0)
    .sort((a, b) => timeToSeconds(b.time) - timeToSeconds(a.time))
    .slice(0, 8)
    .map((g) => [
      `${g.map} (${g.teams})`,
      Math.round(timeToSeconds(g.time) / 60),
    ]);

  countBarChart("#trn-chart-longest", longest, {
    label: "Minutes",
    bottom: 200,
  });
}
