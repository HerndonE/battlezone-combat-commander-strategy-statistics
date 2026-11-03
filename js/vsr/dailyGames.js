// Games Played per Month: one line per year, overlaid on a shared Jan–Dec axis.
import { COLOR_PALETTE, BACKGROUND_COLOR, TEXT_LIGHT } from "../config.js";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Well-separated palette entries first, so 2–4 years stay distinguishable.
const YEAR_COLORS = [0, 6, 4, 2, 5, 1, 3].map((i) => COLOR_PALETTE[i]);

// Dates in game_totals look like "MM.D.YY".
function parseGameDate(str) {
  const [m, d, y] = str.split(".").map(Number);
  return new Date(2000 + y, m - 1, d);
}

/**
 * Collect daily game counts from every year key under rawData.vsr
 * (e.g. "2024", "2025", ...), so future years are picked up automatically.
 */
export function getAllDailyGames(vsrData) {
  const days = [];

  Object.keys(vsrData)
    .filter((key) => /^\d{4}$/.test(key))
    .forEach((year) => {
      const gameTotals = vsrData[year]?.[`data_${year}`]?.game_totals || [];
      gameTotals
        .filter((m) => Array.isArray(m) && typeof m[0] === "string")
        .forEach((month) => {
          Object.entries(month[1] || {}).forEach(([date, games]) => {
            days.push({ date: parseGameDate(date), value: games });
          });
        });
    });

  return days.sort((a, b) => a.date - b.date);
}

/**
 * Sum daily counts into monthly totals per year. Months with no games between
 * a year's first and last played month count as 0, so lulls show as dips.
 * @returns {Map<string, {month: number, value: number}[]>}
 */
function monthlyTotalsByYear(days) {
  const result = new Map();

  d3.group(days, (d) => String(d.date.getFullYear())).forEach(
    (yearDays, year) => {
      const totals = d3.rollup(
        yearDays,
        (v) => d3.sum(v, (d) => d.value),
        (d) => d.date.getMonth(),
      );
      const [first, last] = d3.extent(totals.keys());
      result.set(
        year,
        d3.range(first, last + 1).map((month) => ({
          month,
          value: totals.get(month) || 0,
        })),
      );
    },
  );

  return result;
}

/**
 * One continuous line of monthly totals from the first month with games to
 * the latest, with dots colored by year (same colors as the overlay chart).
 */
export function gamesPlayedPerMonthTimelineChart(
  containerSelector,
  days,
  { expandBtnSelector, tooltipSelector = "#tooltip" } = {},
) {
  const container = d3.select(containerSelector);
  const tooltip = d3.select(tooltipSelector);
  const baseWidth = 800;
  const expandedWidth = 1400;
  const height = 400;
  let isExpanded = false;

  const totals = d3.rollup(
    days,
    (v) => d3.sum(v, (d) => d.value),
    (d) => +d3.timeMonth(d.date),
  );
  const [first, last] = d3.extent(days, (d) => d3.timeMonth(d.date));
  // Every month in range, with 0 for months that had no games.
  const data = first
    ? d3.timeMonth.range(first, d3.timeMonth.offset(last, 1)).map((month) => ({
        month,
        year: String(month.getFullYear()),
        value: totals.get(+month) || 0,
      }))
    : [];

  const years = Array.from(new Set(data.map((d) => d.year))).sort();
  const color = d3.scaleOrdinal().domain(years).range(YEAR_COLORS);
  // January ticks show the year; others show the month.
  const tickFormat = (d) =>
    d.getMonth() === 0 ? String(d.getFullYear()) : MONTHS[d.getMonth()];

  function render() {
    container.select("svg").remove();

    const width = isExpanded ? expandedWidth : baseWidth;
    // Wider right margin leaves room for the reference line labels.
    const margin = { top: 40, right: 90, bottom: 50, left: 60 };

    const svg = container
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("background-color", BACKGROUND_COLOR);

    const x = d3
      .scaleTime()
      .domain([first, last])
      .range([margin.left + 10, width - margin.right - 10]);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.value) || 0])
      .nice()
      .range([height - margin.bottom, margin.top]);

    // Dotted reference lines for the most, average and least games per month.
    const referenceLines = [
      { label: "Most", value: d3.max(data, (d) => d.value) },
      { label: "Avg", value: d3.mean(data, (d) => d.value) },
      { label: "Least", value: d3.min(data, (d) => d.value) },
    ];

    const reference = svg
      .append("g")
      .selectAll("g")
      .data(referenceLines)
      .join("g")
      .attr("transform", (d) => `translate(0, ${y(d.value)})`);

    reference
      .append("line")
      .attr("x1", margin.left)
      .attr("x2", width - margin.right)
      .attr("stroke", TEXT_LIGHT)
      .attr("stroke-opacity", 0.45)
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4 4");

    reference
      .append("text")
      .attr("x", width - margin.right + 6)
      .attr("dy", "0.35em")
      .style("font-size", "11px")
      .attr("fill", TEXT_LIGHT)
      .text((d) => `${d.label}: ${Math.round(d.value * 10) / 10}`);

    svg
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", TEXT_LIGHT)
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 2)
      .attr("stroke-linejoin", "round")
      .attr(
        "d",
        d3
          .line()
          .x((d) => x(d.month))
          .y((d) => y(d.value)),
      );

    svg
      .append("g")
      .selectAll("circle")
      .data(data)
      .join("circle")
      .attr("cx", (d) => x(d.month))
      .attr("cy", (d) => y(d.value))
      .attr("r", 4)
      .attr("fill", (d) => color(d.year))
      .on("mousemove", (event, d) => {
        tooltip
          .style("opacity", 1)
          .html(
            `<strong>${MONTHS[d.month.getMonth()]} ${d.year}</strong><br/>Games: ${d.value}`,
          )
          .style("left", event.pageX + 12 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseleave", () => tooltip.style("opacity", 0));

    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(d3.timeMonth.every(isExpanded ? 1 : 3))
          .tickFormat(tickFormat),
      );

    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -(height / 2))
      .attr("y", margin.left - 35)
      .attr("text-anchor", "middle")
      .attr("fill", TEXT_LIGHT)
      .text("Games per Month");

    const legend = svg
      .append("g")
      .selectAll("g")
      .data(years)
      .join("g")
      .attr("transform", (d, i) => `translate(${margin.left + i * 80}, 10)`);

    legend
      .append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("rx", 2)
      .attr("fill", (d) => color(d));

    legend
      .append("text")
      .attr("x", 16)
      .attr("y", 10)
      .style("font-size", "11px")
      .attr("fill", TEXT_LIGHT)
      .text((d) => d);
  }

  render();

  const expandBtn = expandBtnSelector
    ? document.querySelector(expandBtnSelector)
    : null;
  if (expandBtn) {
    expandBtn.addEventListener("click", () => {
      isExpanded = !isExpanded;
      expandBtn.textContent = isExpanded ? "Collapse Chart" : "Expand Chart";
      render();
    });
  }
}

export function gamesPlayedPerMonthLineChart(
  containerSelector,
  days,
  { expandBtnSelector, tooltipSelector = "#tooltip" } = {},
) {
  const container = d3.select(containerSelector);
  const tooltip = d3.select(tooltipSelector);
  const baseWidth = 800;
  const expandedWidth = 1400;
  const height = 400;
  let isExpanded = false;

  const byYear = monthlyTotalsByYear(days);
  const years = Array.from(byYear.keys()).sort();
  const color = d3.scaleOrdinal().domain(years).range(YEAR_COLORS);
  const maxValue = d3.max(Array.from(byYear.values()).flat(), (d) => d.value);

  function render() {
    container.select("svg").remove();

    const width = isExpanded ? expandedWidth : baseWidth;
    const margin = { top: 40, right: 30, bottom: 50, left: 60 };

    const svg = container
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("background-color", BACKGROUND_COLOR);

    const x = d3
      .scalePoint()
      .domain(d3.range(12))
      .range([margin.left, width - margin.right])
      .padding(0.3);

    const y = d3
      .scaleLinear()
      .domain([0, maxValue || 0])
      .nice()
      .range([height - margin.bottom, margin.top]);

    const line = d3
      .line()
      .x((d) => x(d.month))
      .y((d) => y(d.value));

    // Highlight one year and fade the rest; null restores all.
    function focusYear(year) {
      svg
        .selectAll(".year-series")
        .attr("opacity", (d) => (!year || d[0] === year ? 1 : 0.15));
      svg
        .selectAll(".year-legend")
        .attr("opacity", (d) => (!year || d === year ? 1 : 0.4));
    }

    const series = svg
      .append("g")
      .selectAll("g")
      .data(Array.from(byYear.entries()))
      .join("g")
      .attr("class", "year-series")
      .style("cursor", "pointer")
      .on("mouseenter", (event, d) => focusYear(d[0]))
      .on("mouseleave", () => focusYear(null));

    series
      .append("path")
      .attr("fill", "none")
      .attr("stroke", (d) => color(d[0]))
      .attr("stroke-width", 2.5)
      .attr("stroke-linejoin", "round")
      .attr("d", (d) => line(d[1]));

    // Wider invisible stroke so the lines are easy to hover.
    series
      .append("path")
      .attr("fill", "none")
      .attr("stroke", "transparent")
      .attr("stroke-width", 12)
      .attr("d", (d) => line(d[1]));

    series
      .selectAll("circle")
      .data((d) => d[1].map((p) => ({ ...p, year: d[0] })))
      .join("circle")
      .attr("cx", (d) => x(d.month))
      .attr("cy", (d) => y(d.value))
      .attr("r", 3.5)
      .attr("fill", (d) => color(d.year))
      .on("mousemove", (event, d) => {
        tooltip
          .style("opacity", 1)
          .html(
            `<strong>${MONTHS[d.month]} ${d.year}</strong><br/>Games: ${d.value}`,
          )
          .style("left", event.pageX + 12 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseleave", () => tooltip.style("opacity", 0));

    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickFormat((m) => MONTHS[m]));

    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -(height / 2))
      .attr("y", margin.left - 35)
      .attr("text-anchor", "middle")
      .attr("fill", TEXT_LIGHT)
      .text("Games per Month");

    // Legend along the top, below the Expand Chart button.
    const legend = svg
      .append("g")
      .selectAll("g")
      .data(years)
      .join("g")
      .attr("class", "year-legend")
      .attr("transform", (d, i) => `translate(${margin.left + i * 80}, 10)`)
      .style("cursor", "pointer")
      .on("mouseenter", (event, year) => focusYear(year))
      .on("mouseleave", () => focusYear(null));

    legend
      .append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("rx", 2)
      .attr("fill", (d) => color(d));

    legend
      .append("text")
      .attr("x", 16)
      .attr("y", 10)
      .style("font-size", "11px")
      .attr("fill", TEXT_LIGHT)
      .text((d) => d);
  }

  render();

  const expandBtn = expandBtnSelector
    ? document.querySelector(expandBtnSelector)
    : null;
  if (expandBtn) {
    expandBtn.addEventListener("click", () => {
      isExpanded = !isExpanded;
      container.classed("expanded", isExpanded);
      expandBtn.textContent = isExpanded ? "Collapse Chart" : "Expand Chart";
      render();
    });
  }
}
