// Shared horizontal bar charts:
// category labels on the left, bars growing to the right, so expanding a
// chart makes it taller rather than wider.
import { COLOR_PALETTE, BACKGROUND_COLOR, TEXT_LIGHT } from "../config.js";

const CHART_WIDTH = 800;
const BAR_HEIGHT = 22;
const DEFAULT_ITEM_COUNT = 10;

// Rough label width so long names are not clipped off the left edge.
function leftMarginFor(names) {
  const longest = d3.max(names, (n) => String(n).length) || 0;
  return Math.max(80, Math.min(220, longest * 7 + 16));
}

function bindTooltip(selection, tooltip, htmlFn) {
  selection
    .on("mousemove", (event, d) => {
      tooltip
        .style("opacity", 1)
        .html(htmlFn(d))
        .style("left", event.pageX + 12 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseleave", () => tooltip.style("opacity", 0));
}

function setupExpand(expandBtnSelector, itemCount, defaultItemCount, redraw) {
  const expandBtn = expandBtnSelector
    ? document.querySelector(expandBtnSelector)
    : null;
  if (!expandBtn || itemCount <= defaultItemCount) return;

  let isExpanded = false;
  expandBtn.style.display = "inline-block";
  expandBtn.textContent = "Expand Chart";
  expandBtn.addEventListener("click", () => {
    isExpanded = !isExpanded;
    redraw(isExpanded);
    expandBtn.textContent = isExpanded ? "Collapse Chart" : "Expand Chart";
  });
}

function drawValueAxis(svg, x, height, margin, label) {
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(6))
    .selectAll("text")
    .attr("fill", TEXT_LIGHT);

  svg
    .append("text")
    .attr("x", margin.left + (CHART_WIDTH - margin.left - margin.right) / 2)
    .attr("y", height - margin.bottom + 36)
    .attr("text-anchor", "middle")
    .attr("fill", TEXT_LIGHT)
    .style("font-size", "12px")
    .text(label);
}

function drawCategoryAxis(svg, y, margin) {
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y))
    .selectAll("text")
    .attr("fill", TEXT_LIGHT)
    .style("font-size", "11px");
}

/**
 * @param {string} containerSelector
 * @param {{name: string, value: number}[]} data  already sorted
 * @param {object} opts
 *   expandBtnSelector, tooltipSelector, valueLabel, formatValue(v),
 *   tooltipHtml(d), defaultItemCount
 */
export function horizontalBarChart(containerSelector, data, opts = {}) {
  const {
    expandBtnSelector,
    tooltipSelector = "#tooltip",
    valueLabel = "Count",
    formatValue = (v) => v,
    tooltipHtml = (d) =>
      `<strong>${d.name}</strong><br>${valueLabel}: ${formatValue(d.value)}`,
    defaultItemCount = DEFAULT_ITEM_COUNT,
  } = opts;

  const container = d3.select(containerSelector);
  const tooltip = d3.select(tooltipSelector);
  const margin = {
    top: 20,
    right: 60,
    bottom: 50,
    left: leftMarginFor(data.map((d) => d.name)),
  };
  // Keep the value scale fixed across expand/collapse.
  const maxValue = d3.max(data, (d) => d.value) || 0;

  function drawChart(subset) {
    container.selectAll("svg").remove();

    const height = subset.length * BAR_HEIGHT + margin.top + margin.bottom;
    const svg = container
      .append("svg")
      .attr("width", CHART_WIDTH)
      .attr("height", height)
      .style("background-color", BACKGROUND_COLOR);

    const x = d3
      .scaleLinear()
      .domain([0, maxValue])
      .nice()
      .range([margin.left, CHART_WIDTH - margin.right]);

    const y = d3
      .scaleBand()
      .domain(subset.map((d) => d.name))
      .range([margin.top, height - margin.bottom])
      .padding(0.15);

    drawValueAxis(svg, x, height, margin, valueLabel);
    drawCategoryAxis(svg, y, margin);

    svg
      .selectAll("rect.bar")
      .data(subset)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", margin.left)
      .attr("y", (d) => y(d.name))
      .attr("width", (d) => Math.max(0, x(d.value) - margin.left))
      .attr("height", y.bandwidth())
      .attr("fill", (d, i) => COLOR_PALETTE[i % COLOR_PALETTE.length])
      .attr("rx", 3)
      .attr("ry", 3)
      .call(bindTooltip, tooltip, tooltipHtml);

    svg
      .selectAll("text.count-label")
      .data(subset)
      .enter()
      .append("text")
      .attr("class", "count-label")
      .attr("x", (d) => Math.max(margin.left, x(d.value)) + 5)
      .attr("y", (d) => y(d.name) + y.bandwidth() / 2 + 4)
      .style("font-size", "11px")
      .attr("fill", TEXT_LIGHT)
      .text((d) => formatValue(d.value));
  }

  drawChart(data.slice(0, defaultItemCount));
  setupExpand(expandBtnSelector, data.length, defaultItemCount, (expanded) =>
    drawChart(expanded ? data : data.slice(0, defaultItemCount)),
  );
}

/**
 * Grouped horizontal bars: one band per commander, one bar per faction.
 * @param {{commander: string, faction: string, value: number}[]} data
 */
export function groupedHorizontalBarChart(containerSelector, data, opts = {}) {
  const {
    expandBtnSelector,
    tooltipSelector = "#tooltip",
    valueLabel = "Count",
    defaultItemCount = DEFAULT_ITEM_COUNT,
  } = opts;

  const container = d3.select(containerSelector);
  const tooltip = d3.select(tooltipSelector);
  // Most games commanded (all factions combined) first; ties alphabetical.
  const totals = d3.rollup(
    data,
    (v) => d3.sum(v, (d) => d.value),
    (d) => d.commander,
  );
  const allCommanders = Array.from(totals.keys()).sort(
    (a, b) => totals.get(b) - totals.get(a) || a.localeCompare(b),
  );
  const factions = Array.from(new Set(data.map((d) => d.faction)));
  const color = d3.scaleOrdinal().domain(factions).range(COLOR_PALETTE);
  const margin = {
    top: 40,
    right: 60,
    bottom: 50,
    left: leftMarginFor(allCommanders),
  };
  const groupHeight = Math.max(BAR_HEIGHT, factions.length * 12 + 8);
  const maxValue = d3.max(data, (d) => d.value) || 0;

  function drawChart(commanders) {
    container.selectAll("svg").remove();

    const subset = data.filter((d) => commanders.includes(d.commander));
    const height = commanders.length * groupHeight + margin.top + margin.bottom;

    const svg = container
      .append("svg")
      .attr("width", CHART_WIDTH)
      .attr("height", height)
      .style("background-color", BACKGROUND_COLOR);

    const x = d3
      .scaleLinear()
      .domain([0, maxValue])
      .nice()
      .range([margin.left, CHART_WIDTH - margin.right]);

    const y0 = d3
      .scaleBand()
      .domain(commanders)
      .range([margin.top, height - margin.bottom])
      .paddingInner(0.2);

    const y1 = d3
      .scaleBand()
      .domain(factions)
      .range([0, y0.bandwidth()])
      .padding(0.05);

    drawValueAxis(svg, x, height, margin, valueLabel);
    drawCategoryAxis(svg, y0, margin);

    const groups = svg
      .append("g")
      .selectAll("g")
      .data(d3.group(subset, (d) => d.commander))
      .join("g")
      .attr("transform", (d) => `translate(0, ${y0(d[0])})`);

    groups
      .selectAll("rect")
      .data((d) => d[1])
      .join("rect")
      .attr("class", "bar")
      .attr("x", margin.left)
      .attr("y", (d) => y1(d.faction))
      .attr("width", (d) => Math.max(0, x(d.value) - margin.left))
      .attr("height", y1.bandwidth())
      .attr("fill", (d) => color(d.faction))
      .attr("rx", 2)
      .attr("ry", 2)
      .call(
        bindTooltip,
        tooltip,
        (d) =>
          `<strong>${d.commander}</strong><br><em>${d.faction}</em><br>${valueLabel}: ${d.value}<br>Total commanded: ${totals.get(d.commander)}`,
      );

    // Legend along the top, directly below the Expand Chart button.
    const legendY = 8;
    const legendSpacing =
      (CHART_WIDTH - margin.left - margin.right) / Math.max(1, factions.length);

    factions.forEach((faction, i) => {
      const lx = margin.left + i * legendSpacing;
      svg
        .append("rect")
        .attr("x", lx)
        .attr("y", legendY)
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", color(faction))
        .attr("rx", 2);

      svg
        .append("text")
        .attr("x", lx + 16)
        .attr("y", legendY + 10)
        .style("font-size", "11px")
        .attr("fill", TEXT_LIGHT)
        .text(faction);
    });
  }

  drawChart(allCommanders.slice(0, defaultItemCount));
  setupExpand(
    expandBtnSelector,
    allCommanders.length,
    defaultItemCount,
    (expanded) =>
      drawChart(
        expanded ? allCommanders : allCommanders.slice(0, defaultItemCount),
      ),
  );
}

/** Shared data prep for the commander win % charts. */
export function prepareWinPercentages(chartData) {
  return chartData
    .filter(([_, __, total]) => total >= 5)
    .map(([name, _, total, wins]) => {
      const adjustedTotal = total - 5;
      const adjustedWins = wins - 5;
      return {
        name,
        total: adjustedTotal,
        wins: adjustedWins,
        value: adjustedTotal > 0 ? (adjustedWins / adjustedTotal) * 100 : 0,
      };
    })
    .sort((a, b) => b.value - a.value);
}

export const winPercentTooltip = (d) =>
  `<strong>${d.name}</strong><br>` +
  `Games (After 5 removed): ${d.total}<br>` +
  `Wins (After 5 removed): ${d.wins}<br>` +
  `Win %: ${d.value.toFixed(1)}%`;
