import { CONFIG, GRAPH_POPERTIES } from "../config.js";
import {
  COLOR_PALETTE,
  BACKGROUND_COLOR,
  TEXT_LIGHT,
  TEXT_DARK,
} from "../config.js";
import {
  horizontalBarChart,
  groupedHorizontalBarChart,
  prepareWinPercentages,
  winPercentTooltip,
} from "./horizontalBars.js";
import {
  getAllDailyGames,
  gamesPlayedPerMonthLineChart,
  gamesPlayedPerMonthTimelineChart,
} from "./dailyGames.js";

function factionPopularity(containerId, chartData) {
  const data = Object.entries(chartData).sort((a, b) => b[1] - a[1]);

  const width = 600;
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
    .each(function (d, i) {
      const g = d3.select(this);

      g.append("rect")
        .attr("width", x(d[1]))
        .attr("height", barHeight)
        .attr("fill", color(d[0]))
        .attr("rx", borderRadius)
        .attr("ry", borderRadius);

      const textColor = x(d[1]) > 40 ? TEXT_LIGHT : TEXT_DARK;

      g.append("text")
        .attr("x", x(d[1]) > 40 ? x(d[1]) / 2 : x(d[1]) + 5)
        .attr("y", barHeight / 2 + 4)
        .attr("text-anchor", x(d[1]) > 40 ? "middle" : "start")
        .attr("fill", textColor)
        .style("font-size", "12px")
        .text(`${d[0]}: ${d[1]}`);
    });
}

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

  const CATEGORY_COLORS = {
    "Very Popular": COLOR_PALETTE[0],
    "Mostly Popular": COLOR_PALETTE[2],
    "Moderately Popular": COLOR_PALETTE[4],
    "Least Popular": COLOR_PALETTE[6],
  };
  const CATEGORIES = [
    "Very Popular",
    "Mostly Popular",
    "Moderately Popular",
    "Least Popular",
  ];

  const margin = { top: 20, right: 80, bottom: 70, left: 160 };
  const barHeight = 22;
  const width = 800;

  function drawChart(data) {
    d3.select(containerSelector).selectAll("*").remove();

    const wrapper = d3.select(containerSelector);
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
      .call(d3.axisLeft(y))
      .selectAll("text")
      .attr("fill", TEXT_LIGHT)
      .style("font-size", "11px");

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
      .attr("y", (d) => y(d.name) + y.bandwidth() / 2 + 4)
      .style("font-size", "11px")
      .text((d) => d.count)
      .attr("fill", TEXT_LIGHT);

    const legendY = height - margin.bottom + 40;
    const legendSpacing =
      (width - margin.left - margin.right) / CATEGORIES.length;

    CATEGORIES.forEach((cat, i) => {
      const lx = margin.left + i * legendSpacing;
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
        .attr("y", legendY + 10)
        .text(cat)
        .style("font-size", "11px")
        .attr("fill", TEXT_LIGHT);
    });
  }

  drawChart(chartData.slice(0, defaultItemCount));

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

function lastUpdated(dateValue) {
  return "Last Updated: " + dateValue;
}

d3.json(CONFIG.jsonFile).then((rawData) => {
  const data = rawData.vsr.processed_data;

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

  const allDailyGames = getAllDailyGames(rawData.vsr);

  gamesPlayedPerMonthLineChart("#daily-1", allDailyGames, {
    expandBtnSelector: "#expand-btn-played-days-1",
  });

  gamesPlayedPerMonthTimelineChart("#monthly-timeline-1", allDailyGames, {
    expandBtnSelector: "#expand-btn-monthly-timeline-1",
  });

  const updatedText = lastUpdated(rawData.last_updated);
  document.getElementById("last-updated").textContent = updatedText;
});
