// Shared horizontal bar charts:
// category labels on the left, bars growing to the right, so expanding a
// chart makes it taller rather than wider.
import {
  COLOR_PALETTE,
  factionColor,
  BACKGROUND_COLOR,
  TEXT_LIGHT,
  textOn,
  chartWidth,
  redrawOnResize,
  fitLabel,
} from "../config.js";

// Charts fill their box; below this they would be too cramped to read.
const MIN_CHART_WIDTH = 360;
const BAR_HEIGHT = 26;
const DEFAULT_ITEM_COUNT = 10;

// Rough label width so long names are not clipped off the left edge.
function leftMarginFor(names) {
  const longest = d3.max(names, (n) => String(n).length) || 0;
  return Math.max(90, Math.min(250, longest * 8 + 18));
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
    .attr("x", (x.range()[0] + x.range()[1]) / 2)
    .attr("y", height - margin.bottom + 36)
    .attr("text-anchor", "middle")
    .attr("fill", TEXT_LIGHT)
    .style("font-size", "14px")
    .text(label);
}

function drawCategoryAxis(svg, y, margin) {
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y).tickFormat((d) => fitLabel(d, margin.left - 14)))
    .selectAll("text")
    .attr("fill", TEXT_LIGHT)
    .style("font-size", "13px");
}

// Left margin sized for the names, but never more than ~35% of the chart.
function marginFor(base, width) {
  return { ...base, left: Math.min(base.left, Math.round(width * 0.35)) };
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
  const baseMargin = {
    top: 20,
    right: 60,
    bottom: 50,
    left: leftMarginFor(data.map((d) => d.name)),
  };
  // Keep the value scale fixed across expand/collapse.
  const maxValue = d3.max(data, (d) => d.value) || 0;
  let current = data.slice(0, defaultItemCount);

  function drawChart(subset) {
    current = subset;
    container.selectAll("svg").remove();

    const width = chartWidth(container.node(), { min: MIN_CHART_WIDTH });
    const margin = marginFor(baseMargin, width);
    const height = subset.length * BAR_HEIGHT + margin.top + margin.bottom;
    const svg = container
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("background-color", BACKGROUND_COLOR);

    const x = d3
      .scaleLinear()
      .domain([0, maxValue])
      .nice()
      .range([margin.left, width - margin.right]);

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
      .attr("y", (d) => y(d.name) + y.bandwidth() / 2 + 5)
      .style("font-size", "13px")
      .style("font-weight", "bold")
      .attr("fill", TEXT_LIGHT)
      .text((d) => formatValue(d.value));
  }

  drawChart(current);
  redrawOnResize(container.node(), () => drawChart(current));
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
  const color = factionColor;
  const baseMargin = {
    top: 40,
    right: 60,
    bottom: 50,
    left: leftMarginFor(allCommanders),
  };
  const groupHeight = Math.max(BAR_HEIGHT, factions.length * 14 + 10);
  const maxValue = d3.max(data, (d) => d.value) || 0;
  let current = allCommanders.slice(0, defaultItemCount);

  function drawChart(commanders) {
    current = commanders;
    container.selectAll("svg").remove();

    const width = chartWidth(container.node(), { min: MIN_CHART_WIDTH });
    const margin = marginFor(baseMargin, width);
    const subset = data.filter((d) => commanders.includes(d.commander));
    const height = commanders.length * groupHeight + margin.top + margin.bottom;

    const svg = container
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("background-color", BACKGROUND_COLOR);

    const x = d3
      .scaleLinear()
      .domain([0, maxValue])
      .nice()
      .range([margin.left, width - margin.right]);

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
      (width - margin.left - margin.right) / Math.max(1, factions.length);

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
        .attr("y", legendY + 11)
        .style("font-size", "13px")
        .attr("fill", TEXT_LIGHT)
        .text(faction);
    });
  }

  drawChart(current);
  redrawOnResize(container.node(), () => drawChart(current));
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

// Faction Popularity: one stacked bar, each faction's share of the total.
// Used by the Overview and every year tab.
const FACTION_MAX_WIDTH = 600;
const FACTION_HEIGHT = 60;
const FACTION_BAR_HEIGHT = 28;
const FACTION_BORDER_RADIUS = 5;
const FACTION_LABEL_PAD = 8; // breathing room inside the segment

// Longest label that really fits in the segment, measured after rendering:
// "Scion: 96", then "Scion 96", then just "96".
function fitFactionLabel(textEl, name, value, segmentWidth) {
  for (const label of [`${name}: ${value}`, `${name} ${value}`, String(value)]) {
    textEl.text(label);
    if (textEl.node().getComputedTextLength() + FACTION_LABEL_PAD <= segmentWidth) return;
  }
}

export function factionPopularity(containerId, chartData) {
  const node = document.querySelector(containerId);
  if (!node) return;

  const data = Object.entries(chartData || {}).sort((a, b) => b[1] - a[1]);
  const total = d3.sum(data, (d) => d[1]);
  const color = factionColor; // fixed per faction, not by rank

  function render() {
    d3.select(node).selectAll("svg").remove();

    const width = Math.min(
      FACTION_MAX_WIDTH,
      chartWidth(node, { min: 280, fallback: FACTION_MAX_WIDTH }),
    );
    const x = d3.scaleLinear().domain([0, total]).range([0, width]);

    const svg = d3
      .select(node)
      .append("svg")
      .attr("width", width)
      .attr("height", FACTION_HEIGHT)
      .style("background-color", BACKGROUND_COLOR);

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
        const segment = x(d[1]);

        g.append("rect")
          .attr("width", segment)
          .attr("height", FACTION_BAR_HEIGHT)
          .attr("fill", color(d[0]))
          .attr("rx", FACTION_BORDER_RADIUS)
          .attr("ry", FACTION_BORDER_RADIUS);

        g.append("title").text(`${d[0]}: ${d[1]}`);

        const inside = segment > 40;
        const label = g
          .append("text")
          .attr("x", inside ? segment / 2 : segment + 5)
          .attr("y", FACTION_BAR_HEIGHT / 2 + 5)
          .attr("text-anchor", inside ? "middle" : "start")
          .attr("fill", inside ? textOn(color(d[0])) : TEXT_LIGHT)
          .style("font-size", "15px")
          .style("font-weight", "bold")
          .text(`${d[0]}: ${d[1]}`);
        if (inside) fitFactionLabel(label, d[0], d[1], segment);
      });
  }

  render();
  redrawOnResize(node, render);
}
