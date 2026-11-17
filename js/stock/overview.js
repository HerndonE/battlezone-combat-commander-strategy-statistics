import {
  chartWidth,
  redrawOnResize,
  fitLabel,
  CONFIG,
  GRAPH_POPERTIES,
  showLastUpdated,
  POPULARITY_COLORS,
  BACKGROUND_COLOR,
  TEXT_LIGHT,
  TEXT_DARK,
} from "../config.js";
import { renderOverviewSummary } from "./summaryCards.js";
import {
  horizontalBarChart,
  groupedHorizontalBarChart,
  prepareWinPercentages,
  winPercentTooltip,
  factionPopularity,
} from "./horizontalBars.js";
import {
  getAllDailyGames,
  gamesPlayedPerMonthLineChart,
  gamesPlayedPerMonthTimelineChart,
} from "./dailyGames.js";

function mapCountBarChart(
  containerId,
  chartData,
  expandBtnSelector = "#expand-btn",
) {
  const fullData = Object.entries(chartData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  horizontalBarChart(containerId, fullData, { expandBtnSelector });
}

function commanderCountBarChart(
  containerId,
  chartData,
  expandBtnSelector = "#expand-btn",
) {
  const fullData = chartData
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  horizontalBarChart(containerId, fullData, { expandBtnSelector });
}

function commanderFactionChoiceCountBarChart(
  containerId,
  chartData,
  expandBtnSelector = "#expand-btn",
) {
  if (!Array.isArray(chartData)) {
    chartData = Object.entries(chartData);
  }

  const fullData = chartData.flatMap(([commander, factions]) =>
    Object.entries(factions).map(([faction, value]) => ({
      commander,
      faction,
      value,
    })),
  );

  groupedHorizontalBarChart(containerId, fullData, { expandBtnSelector });
}

function mapPopularity(
  containerSelector,
  chartData,
  expandBtnSelector = "#expand-btn-popular-maps-1",
) {
  const defaultItemCount = 10;
  const expandBtn = document.querySelector(expandBtnSelector);
  let isExpanded = false;

  const CATEGORY_COLORS = POPULARITY_COLORS; // cyan → pink, same as the original chart
  const CATEGORIES = [
    "Very Popular",
    "Mostly Popular",
    "Moderately Popular",
    "Least Popular",
  ];

  const barHeight = 22;
  const node = document.querySelector(containerSelector);
  let current = chartData.slice(0, defaultItemCount);

  function drawChart(data) {
    current = data;
    d3.select(containerSelector).selectAll("*").remove();

    const wrapper = d3.select(containerSelector);
    const width = chartWidth(node, { min: 360 });
    // Legend: as many columns as fit (~170px each), wrapping onto more rows.
    const legendCols = Math.max(
      1,
      Math.min(CATEGORIES.length, Math.floor((width - 20) / 170)),
    );
    const legendRows = Math.ceil(CATEGORIES.length / legendCols);
    const margin = {
      top: 20,
      right: 60,
      bottom: 50 + legendRows * 20,
      left: Math.min(160, Math.round(width * 0.35)),
    };
    const height = data.length * barHeight + margin.top + margin.bottom;

    wrapper
      .append("div")
      .attr("class", "tooltip")
      .attr("id", "tooltip-" + containerSelector.replace(/[^a-zA-Z0-9]/g, ""));

    const tooltip = wrapper.select(".tooltip");

    const svg = wrapper
      .append("svg")
      .attr("class", "popularity-chart")
      .attr("width", width)
      .attr("height", height)
      .style("background-color", BACKGROUND_COLOR);

    const x = d3
      .scaleLinear()
      .domain([0, d3.max(chartData, (d) => d.count)])
      .nice()
      .range([margin.left, width - margin.right]);

    const y = d3
      .scaleBand()
      .domain(data.map((d) => d.name))
      .range([margin.top, height - margin.bottom])
      .padding(0.15);

    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(6))
      .selectAll("text")
      .attr("fill", TEXT_LIGHT);

    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(y).tickFormat((d) => fitLabel(d, margin.left - 14)))
      .selectAll("text")
      .attr("fill", TEXT_LIGHT)
      .style("font-size", "13px");

    svg
      .selectAll("rect.bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", margin.left)
      .attr("y", (d) => y(d.name))
      .attr("width", (d) => x(d.count) - margin.left)
      .attr("height", y.bandwidth())
      .attr("fill", (d) => CATEGORY_COLORS[d.category])
      .attr("rx", 3)
      .attr("ry", 3)
      .on("mousemove", function (event, d) {
        tooltip
          .style("opacity", 1)
          .html(
            `<strong>${d.name}</strong><br>` +
              `Games: ${d.count}<br>` +
              `Category: ${d.category}`,
          )
          .style("left", event.pageX + 12 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseleave", () => {
        tooltip.style("opacity", 0);
      });

    svg
      .selectAll("text.count-label")
      .data(data)
      .enter()
      .append("text")
      .attr("class", "count-label")
      .attr("x", (d) => x(d.count) + 5)
      .attr("y", (d) => y(d.name) + y.bandwidth() / 2 + 5)
      .style("font-size", "13px")
      .style("font-weight", "bold")
      .text((d) => d.count)
      .attr("fill", TEXT_LIGHT);

    const legendTop = height - margin.bottom + 40;
    const legendLeft = legendCols === CATEGORIES.length ? margin.left : 10;
    const legendSpacing = (width - legendLeft - 10) / legendCols;

    CATEGORIES.forEach((cat, i) => {
      const lx = legendLeft + (i % legendCols) * legendSpacing;
      const legendY = legendTop + Math.floor(i / legendCols) * 20;
      svg
        .append("rect")
        .attr("x", lx)
        .attr("y", legendY)
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", CATEGORY_COLORS[cat])
        .attr("rx", 2);

      svg
        .append("text")
        .attr("x", lx + 16)
        .attr("y", legendY + 11)
        .text(cat)
        .style("font-size", "13px")
        .attr("fill", TEXT_LIGHT);
    });
  }

  drawChart(current);
  redrawOnResize(node, () => drawChart(current));

  if (expandBtn && chartData.length > defaultItemCount) {
    expandBtn.style.display = "inline-block";
    expandBtn.textContent = "Expand Chart";

    expandBtn.addEventListener("click", () => {
      isExpanded = !isExpanded;
      const dataToUse = isExpanded
        ? chartData
        : chartData.slice(0, defaultItemCount);
      drawChart(dataToUse);
      expandBtn.textContent = isExpanded ? "Collapse Chart" : "Expand Chart";
    });
  }
}

function commanderWinPercentages(
  containerSelector,
  chartData,
  expandButtonSelector,
) {
  horizontalBarChart(containerSelector, prepareWinPercentages(chartData), {
    expandBtnSelector: expandButtonSelector,
    valueLabel: "Win %",
    formatValue: (v) => `${v.toFixed(1)}%`,
    tooltipHtml: winPercentTooltip,
  });
}

d3.json(CONFIG.jsonFile).then((rawData) => {
  const data = rawData.stock.processed_data;

  renderOverviewSummary("#info-overview", rawData.stock);

  factionPopularity("#inline-bar-chart-1", data.processed_most_played_factions);
  mapCountBarChart(
    "#chart-wrapper-played-maps-1",
    data.processed_map_counts,
    "#expand-btn-played-maps-1",
  );
  commanderCountBarChart(
    "#chart-wrapper-active-commanders-1",
    data.processed_commander_list,
    "#expand-btn-active-commanders-1",
  );
  commanderFactionChoiceCountBarChart(
    "#chart-wrapper-faction-choice-1",
    data.processed_commander_faction_counts,
    "#expand-btn-faction-choice-1",
  );

  mapPopularity(
    "#chart-wrapper-popular-maps-1",
    data.processed_map_popularity,
    "#expand-btn-popular-maps-1",
  );

  commanderWinPercentages(
    "#chart-wrapper-commander-wins-1",
    data.processed_commander_win_percentages,
    "#expand-btn-commander-wins-1",
  );

  const allDailyGames = getAllDailyGames(rawData.stock);

  gamesPlayedPerMonthLineChart("#daily-1", allDailyGames, {
    expandBtnSelector: "#expand-btn-played-days-1",
  });

  gamesPlayedPerMonthTimelineChart("#monthly-timeline-1", allDailyGames, {
    expandBtnSelector: "#expand-btn-monthly-timeline-1",
  });

  showLastUpdated(rawData.last_updated);
});
