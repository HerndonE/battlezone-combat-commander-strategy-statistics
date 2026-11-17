import {
  CONFIG,
  GRAPH_POPERTIES,
  chartWidth,
  redrawOnResize,
  setFullRow,
  dayAxisTicks,
  COLOR_PALETTE,
  BACKGROUND_COLOR,
  TEXT_LIGHT,
  TEXT_DARK,
} from "../config.js";
import { renderYearSummary } from "./summaryCards.js";
import {
  horizontalBarChart,
  groupedHorizontalBarChart,
  prepareWinPercentages,
  winPercentTooltip,
  factionPopularity,
} from "./horizontalBars.js";

function mapCountBarChart2026(containerSelector, mapData, expandBtnSelector) {
  horizontalBarChart(containerSelector, mapData, {
    expandBtnSelector,
    tooltipSelector: "#tooltip3",
  });
}

function commanderCountBarChart2026(
  containerSelector,
  mapData,
  expandBtnSelector,
) {
  horizontalBarChart(containerSelector, mapData, {
    expandBtnSelector,
    tooltipSelector: "#tooltip3",
  });
}

function commanderFactionChoiceCountBarChart2026(
  containerId,
  chartData,
  expandBtnSelector = "#expand-btn",
) {
  groupedHorizontalBarChart(containerId, chartData, {
    expandBtnSelector,
    tooltipSelector: "#tooltip3",
  });
}

function commanderWinPercentages2026(
  containerSelector,
  chartData,
  expandButtonSelector,
) {
  horizontalBarChart(containerSelector, prepareWinPercentages(chartData), {
    expandBtnSelector: expandButtonSelector,
    tooltipSelector: "#tooltip3",
    valueLabel: "Win %",
    formatValue: (v) => `${v.toFixed(1)}%`,
    tooltipHtml: winPercentTooltip,
  });
}


function getValidMonths(data) {
  return data.filter((m) => Array.isArray(m) && typeof m[0] === "string");
}

function getMonthlyGames(data) {
  const months = getValidMonths(data);
  return months.map((m) => ({
    label: m[0],
    value: m[3]["Game(s) Played"],
  }));
}

function parseCustomDate(str) {
  const [m, d, y] = str.split(".").map(Number);
  return new Date(2000 + y, m - 1, d);
}

function getDailyGames(data) {
  const days = [];
  getValidMonths(data).forEach((month) => {
    Object.entries(month[1]).forEach(([date, games]) => {
      days.push({
        date: parseCustomDate(date),
        label: date,
        value: games,
      });
    });
  });
  return days.sort((a, b) => a.date - b.date);
}

function gamesPlayedPerDayBarChart(
  containerSelector,
  data,
  expandButtonSelector,
) {
  const container = d3.select(containerSelector);

  const height = 400;

  function render() {
    container.select("svg").remove();

    const isExpanded = container.classed("expanded");
    const width = chartWidth(container.node(), { min: 360 });

    const svg = container
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("background-color", BACKGROUND_COLOR);

    const margin = {
      top: 40,
      right: isExpanded ? 100 : 20,
      bottom: 80,
      left: 60,
    };

    const x = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => d.date))
      .range([margin.left, width - margin.right]);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.value)])
      .nice()
      .range([height - margin.bottom, margin.top]);

    const line = d3
      .line()
      .x((d) => x(d.date))
      .y((d) => y(d.value))
      .curve(d3.curveMonotoneX);

    let tooltip = d3.select("#tooltip3");
    if (tooltip.empty()) {
      tooltip = d3
        .select("body")
        .append("div")
        .style("position", "fixed")
        .attr("id", "tooltip3")
        .attr("class", "tooltip3");
    }

    // Line
    svg
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", COLOR_PALETTE[5])
      .attr("stroke-width", 2)
      .attr("d", line);

    // Points
    svg
      .append("g")
      .selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", (d) => x(d.date))
      .attr("cy", (d) => y(d.value))
      .attr("r", 4)
      .attr("fill", COLOR_PALETTE[5])
      .on("mousemove", (event, d) => {
        tooltip
          .style("opacity", 1)
          .html(`<strong>${d.label}</strong><br/>Games: ${d.value}`)
          .style("left", event.pageX + 12 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseleave", () => tooltip.style("opacity", 0));

    // X Axis: evenly spaced dates (1st/15th, or monthly when narrow)
    const dayTicks = dayAxisTicks(x, width - margin.left - margin.right);
    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .attr("class", "axis")
      .call(
        d3.axisBottom(x).tickValues(dayTicks.values).tickFormat(dayTicks.format),
      );

    // Y Axis
    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .attr("class", "axis")
      .call(d3.axisLeft(y));

    // Y Axis Label
    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -(height / 2))
      .attr("y", margin.left - 35)
      .attr("text-anchor", "middle")
      .attr("fill", TEXT_LIGHT)
      .text("Count");
  }

  render();
  redrawOnResize(container.node(), render);

  if (expandButtonSelector) {
    d3.select(expandButtonSelector)
      .classed("expand-btn--row", true)
      .on("click", function () {
      const isExpanded = container.classed("expanded");

      container.classed("expanded", !isExpanded);
      setFullRow(container.node(), !isExpanded);

      d3.select(this).text(isExpanded ? "Expand Chart" : "Collapse Chart");

      render();
    });
  }
}

function gamesPlayedPerMonthBarChart(container, data) {
  const defaultItemCount = 12;
  const margin = { top: 40, right: 20, bottom: 80, left: 60 };
  const borderRadius = 5;

  function drawChart(dataSubset) {
    d3.select(container).select("svg").remove();

    const computedWidth = chartWidth(document.querySelector(container), {
      min: 360,
    });

    const width = computedWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", computedWidth)
      .attr("height", height + margin.top + margin.bottom)
      .style("background-color", BACKGROUND_COLOR);

    let tooltip = d3.select("#tooltip3");
    if (tooltip.empty()) {
      tooltip = d3
        .select("body")
        .append("div")
        .attr("id", "tooltip3")
        .attr("class", "tooltip3");
    }

    const x = d3
      .scaleBand()
      .domain(dataSubset.map((d) => d.label))
      .range([margin.left, width + margin.left])
      .padding(0.3);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(dataSubset, (d) => d.value)])
      .nice()
      .range([height + margin.top, margin.top]);

    // Bars
    svg
      .append("g")
      .selectAll("rect")
      .data(dataSubset)
      .enter()
      .append("rect")
      .attr("x", (d) => x(d.label))
      .attr("y", (d) => y(d.value))
      .attr("height", (d) => y(0) - y(d.value))
      .attr("width", x.bandwidth())
      .attr("rx", borderRadius)
      .attr("fill", COLOR_PALETTE[0])
      .on("mousemove", (event, d) => {
        tooltip
          .style("opacity", 1)
          .html(`<strong>${d.label}</strong><br/>Games: ${d.value}`)
          .style("left", event.pageX + 12 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseleave", () => {
        tooltip.style("opacity", 0);
      });

    // X Axis
    svg
      .append("g")
      .attr("transform", `translate(0,${height + margin.top})`)
      .attr("class", "axis")
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-40)")
      .style("text-anchor", "end");

    // Y Axis
    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .attr("class", "axis")
      .call(d3.axisLeft(y));

    // Y Axis Label
    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -(height / 2) - margin.top)
      .attr("y", margin.left - 35)
      .attr("text-anchor", "middle")
      .attr("fill", TEXT_LIGHT)
      .text("Count");
  }

  // Initial render
  drawChart(data.slice(0, defaultItemCount));
  redrawOnResize(document.querySelector(container), () =>
    drawChart(data.slice(0, defaultItemCount)),
  );
}

d3.json(CONFIG.jsonFile).then((rawData) => {
  const data = rawData["vsr"]["2026"]["data_2026"];

  const mapCounts = data.map_counts.map(([name, value]) => ({ name, value }));

  const commanderCounts = data.commander_list.map(([name, value]) => ({
    name,
    value,
  }));

  const factionCounts = Object.entries(data.commander_faction_counts).flatMap(
    ([commander, factions]) =>
      Object.entries(factions).map(([faction, value]) => ({
        commander,
        faction,
        value,
      })),
  );

  renderYearSummary("#info-2026", data.game_totals, data.game_times);

  mapCountBarChart2026(
    "#chart-wrapper-played-maps-2026",
    mapCounts,
    "#expand-btn-played-maps-2026",
  );

  commanderCountBarChart2026(
    "#chart-wrapper-played-commanders-2026",
    commanderCounts,
    "#expand-btn-played-commanders-2026",
  );

  commanderFactionChoiceCountBarChart2026(
    "#chart-wrapper-faction-choice-2026",
    factionCounts,
    "#expand-btn-faction-choice-2026",
  );

  factionPopularity("#inline-bar-chart-4", data.faction_counter);

  commanderWinPercentages2026(
    "#chart-wrapper-commander-wins-2026",
    data.commander_win_percentages,
    "#expand-btn-commander-wins-2026",
  );

  gamesPlayedPerMonthBarChart(
    "#monthly-2026",
    getMonthlyGames(data.game_totals),
  );

  gamesPlayedPerDayBarChart(
    "#daily-2026",
    getDailyGames(data.game_totals),
    "#expand-btn-played-days-2026",
  );
});
