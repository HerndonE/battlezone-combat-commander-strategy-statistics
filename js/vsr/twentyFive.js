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

function mapCountBarChart2025(containerSelector, mapData, expandBtnSelector) {
  horizontalBarChart(containerSelector, mapData, {
    expandBtnSelector,
    tooltipSelector: "#tooltip2",
  });
}

function commanderCountBarChart2025(
  containerSelector,
  mapData,
  expandBtnSelector,
) {
  horizontalBarChart(containerSelector, mapData, {
    expandBtnSelector,
    tooltipSelector: "#tooltip2",
  });
}

function commanderFactionChoiceCountBarChart2025(
  containerId,
  chartData,
  expandBtnSelector = "#expand-btn",
) {
  groupedHorizontalBarChart(containerId, chartData, {
    expandBtnSelector,
    tooltipSelector: "#tooltip2",
  });
}

function factionPopularity2025(containerId, chartData) {
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

function commanderWinPercentages2025(
  containerSelector,
  chartData,
  expandButtonSelector,
) {
  horizontalBarChart(containerSelector, prepareWinPercentages(chartData), {
    expandBtnSelector: expandButtonSelector,
    tooltipSelector: "#tooltip2",
    valueLabel: "Win %",
    formatValue: (v) => `${v.toFixed(1)}%`,
    tooltipHtml: winPercentTooltip,
  });
}

function showTotals(container, data, gameTimeData) {
  const displayData = document.querySelector(container);
  if (!displayData) return;

  const totals = data[data.length - 1];
  const totalDays = totals[0]["Total Days Played"];
  const totalGames = totals[1]["Total Games Played"];

  const gameTimeTotals = gameTimeData || [];
  const totalTime = gameTimeTotals[0] || [];
  const totalMode = gameTimeTotals[1] || [];
  const matchTimes = gameTimeTotals[2] || [];

  // Shortest and Longest match details (extract first object from array)
  const shortestMatchTime = matchTimes[0]?.[1] || null;
  const shortestMatchDetails = matchTimes[1]?.[0] || {};
  const longestMatchTime = matchTimes[2]?.[1] || null;
  const longestMatchDetails = matchTimes[3]?.[0] || {};

  // Main totals
  const mainTotals = [
    totalDays ? `Total Days Played: ${totalDays}` : null,
    totalGames ? `Total Games Played: ${totalGames}` : null,
    totalTime[0]?.[1] ? `${totalTime[0][0]}: ${totalTime[0][1]}` : null,
    totalTime[1]?.[1] ? `${totalTime[1][0]}: ${totalTime[1][1]}` : null,
    totalTime[2]?.[1] ? `${totalTime[2][0]}: ${totalTime[2][1]}` : null,
    totalTime[3]?.[1] ? `${totalTime[3][0]}: ${totalTime[3][1]}` : null,
    totalMode[1] ? `${totalMode[0]}: ${totalMode[1]}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // Shortest and Longest matches on separate lines
  const matchTotals = [
    shortestMatchTime
      ? `<strong>Shortest Match:</strong> ${shortestMatchTime} · ${shortestMatchDetails.commanders || "N/A"} · ${shortestMatchDetails.map || "Unknown"} · ${shortestMatchDetails.date || ""}`
      : null,
    longestMatchTime
      ? `<strong>Longest Match:</strong> ${longestMatchTime} · ${longestMatchDetails.commanders || "N/A"} · ${longestMatchDetails.map || "Unknown"} · ${longestMatchDetails.date || ""}`
      : null,
  ]
    .filter(Boolean)
    .join("<br>");

  displayData.innerHTML =
    mainTotals + (matchTotals ? "<br>" + matchTotals : "");
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

  const baseWidth = 800;
  const expandedWidth = 1400;
  const height = 400;

  function render() {
    container.select("svg").remove();

    const isExpanded = container.classed("expanded");
    const width = isExpanded ? expandedWidth : baseWidth;

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

    let tooltip = d3.select("#tooltip2");
    if (tooltip.empty()) {
      tooltip = d3
        .select("body")
        .append("div")
        .style("position", "fixed")
        .attr("id", "tooltip2")
        .attr("class", "tooltip2");
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

    // X Axis
    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .attr("class", "axis")
      .call(d3.axisBottom(x));

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

  if (expandButtonSelector) {
    d3.select(expandButtonSelector).on("click", function () {
      const isExpanded = container.classed("expanded");

      container.classed("expanded", !isExpanded);

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

    const maxSvgWidth = 1200;
    const minSvgWidth = 800;
    const computedWidth = Math.max(
      minSvgWidth,
      Math.min(dataSubset.length * 60, maxSvgWidth),
    );

    const width = computedWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", computedWidth)
      .attr("height", height + margin.top + margin.bottom)
      .style("background-color", BACKGROUND_COLOR);

    let tooltip = d3.select("#tooltip2");
    if (tooltip.empty()) {
      tooltip = d3
        .select("body")
        .append("div")
        .attr("id", "tooltip2")
        .attr("class", "tooltip2");
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
}

d3.json(CONFIG.jsonFile).then((rawData) => {
  const data = rawData["vsr"]["2025"]["data_2025"];

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

  showTotals("#info-2025", data.game_totals, data.game_times);

  mapCountBarChart2025(
    "#chart-wrapper-played-maps-2025",
    mapCounts,
    "#expand-btn-played-maps-2025",
  );

  commanderCountBarChart2025(
    "#chart-wrapper-played-commanders-2025",
    commanderCounts,
    "#expand-btn-played-commanders-2025",
  );

  commanderFactionChoiceCountBarChart2025(
    "#chart-wrapper-faction-choice-2025",
    factionCounts,
    "#expand-btn-faction-choice-2025",
  );

  factionPopularity2025("#inline-bar-chart-3", data.faction_counter);

  commanderWinPercentages2025(
    "#chart-wrapper-commander-wins-2025",
    data.commander_win_percentages,
    "#expand-btn-commander-wins-2025",
  );

  gamesPlayedPerMonthBarChart(
    "#monthly-2025",
    getMonthlyGames(data.game_totals),
  );

  gamesPlayedPerDayBarChart(
    "#daily-2025",
    getDailyGames(data.game_totals),
    "#expand-btn-played-days-2025",
  );
});
