// Year tabs for a stats page (VSR, Stock, ...). One tab per year key under
// data[MODE] ("2024", "2025", ... and any future year), each built from the
// same template below, so adding a year needs no new JS file or HTML.
// The mobile cards for each year are built in mobileStats.js.
import {
  CONFIG,
  MODE,
  chartWidth,
  redrawOnResize,
  setFullRow,
  dayAxisTicks,
  COLOR_PALETTE,
  BACKGROUND_COLOR,
  TEXT_LIGHT,
} from "../config.js";
import { renderYearSummary } from "./summaryCards.js";
import {
  horizontalBarChart,
  groupedHorizontalBarChart,
  prepareWinPercentages,
  winPercentTooltip,
  factionPopularity,
} from "./horizontalBars.js";
import { getMonthlyActivity, playerActivityChart } from "./playerActivity.js";
import { getYears } from "./matchData.js";

// Extra text under a year's Player Activity chart, per mode and year.
const ACTIVITY_NOTES = {
  vsr: {
    2024: "Most 2024 games have no team roster, so these counts are mostly commanders.",
  },
};

function chartBox(title, id, { expand = false, hidden = true } = {}) {
  const btn = expand
    ? `<button class="expand-btn" id="expand-btn-${id}"${hidden ? ' style="display: none;"' : ""}>Expand Chart</button>`
    : "";
  return `
    <div class="graph-wrapper">
      <h3 style="padding-top: 10px;">${title}</h3>
      ${btn}
      <div class="graph-box" id="chart-wrapper-${id}"></div>
    </div>`;
}

function yearTabHtml(year) {
  const note = ACTIVITY_NOTES[MODE]?.[year] || "";
  return `
    <div align="center">
      <div id="info-${year}"></div>
      <h3>Faction Popularity</h3> Values are based on the faction the commander choses to play as. <div id="inline-bar-chart-${year}"></div>
      <div class="graph-container">
        ${chartBox("Most Played Maps", `played-maps-${year}`, { expand: true })}
        ${chartBox("Commanders", `played-commanders-${year}`, { expand: true })}
        ${chartBox("Commander Win Percentages (Adjusted After First 5 Games)", `commander-wins-${year}`, { expand: true })}
        ${chartBox("Commanders Faction Choices", `faction-choice-${year}`, { expand: true })}
        <div class="graph-wrapper">
          <h3 style="padding-top: 10px;">Games Played per Month</h3>
          <div id="monthly-${year}"></div>
        </div>
        <div class="graph-wrapper">
          <h3 style="padding-top: 10px;">Games Played per Day</h3>
          <button class="expand-btn" id="expand-btn-played-days-${year}">Expand Chart</button>
          <div id="daily-${year}"></div>
        </div>
        <div class="graph-wrapper">
          <h3 style="padding-top: 10px;">Player Activity per Month</h3>
          <p class="activity-note">Players = everyone in a game, commanders included. New players = first game on record.${note ? ` ${note}` : ""}</p>
          <div id="player-activity-${year}"></div>
        </div>
        <div id="tooltip${year}" class="tooltip"></div>
      </div>
    </div>`;
}

// Adds a tab button (after Overview) and tab content (after #Overview) per year.
function buildYearTabs(years) {
  let lastBtn = document.querySelector(".tablinks[onclick*=\"'Overview'\"]");
  let lastTab = document.getElementById("Overview");
  years.forEach((year) => {
    const btn = document.createElement("button");
    btn.className = "tablinks";
    btn.textContent = year;
    btn.setAttribute("onclick", `getData(event, 'year-${year}')`);
    lastBtn.after(btn);
    lastBtn = btn;

    const tab = document.createElement("div");
    tab.id = `year-${year}`;
    tab.className = "tabcontent";
    tab.innerHTML = yearTabHtml(year);
    lastTab.after(tab);
    lastTab = tab;
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
  tooltipSelector,
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

    let tooltip = d3.select(tooltipSelector);
    if (tooltip.empty()) {
      tooltip = d3
        .select("body")
        .append("div")
        .style("position", "fixed")
        .attr("id", tooltipSelector.slice(1))
        .attr("class", "tooltip");
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

function gamesPlayedPerMonthBarChart(container, data, tooltipSelector) {
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

    let tooltip = d3.select(tooltipSelector);
    if (tooltip.empty()) {
      tooltip = d3
        .select("body")
        .append("div")
        .attr("id", tooltipSelector.slice(1))
        .attr("class", "tooltip");
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

function renderYear(rawData, year, monthlyActivity) {
  const data = rawData[MODE][year][`data_${year}`];
  const tooltipSelector = `#tooltip${year}`;
  const id = (name) => `#chart-wrapper-${name}-${year}`;
  const btn = (name) => `#expand-btn-${name}-${year}`;

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

  renderYearSummary(`#info-${year}`, data.game_totals, data.game_times);

  horizontalBarChart(id("played-maps"), mapCounts, {
    expandBtnSelector: btn("played-maps"),
    tooltipSelector,
  });
  horizontalBarChart(id("played-commanders"), commanderCounts, {
    expandBtnSelector: btn("played-commanders"),
    tooltipSelector,
  });
  groupedHorizontalBarChart(id("faction-choice"), factionCounts, {
    expandBtnSelector: btn("faction-choice"),
    tooltipSelector,
  });

  factionPopularity(`#inline-bar-chart-${year}`, data.faction_counter);

  horizontalBarChart(
    id("commander-wins"),
    prepareWinPercentages(data.commander_win_percentages),
    {
      expandBtnSelector: btn("commander-wins"),
      tooltipSelector,
      valueLabel: "Win %",
      formatValue: (v) => `${v.toFixed(1)}%`,
      tooltipHtml: winPercentTooltip,
    },
  );

  gamesPlayedPerMonthBarChart(
    `#monthly-${year}`,
    getMonthlyGames(data.game_totals),
    tooltipSelector,
  );
  gamesPlayedPerDayBarChart(
    `#daily-${year}`,
    getDailyGames(data.game_totals),
    btn("played-days"),
    tooltipSelector,
  );

  playerActivityChart(
    `#player-activity-${year}`,
    monthlyActivity.filter((d) => d.month.getFullYear() === Number(year)),
  );
}

d3.json(CONFIG.jsonFile).then((rawData) => {
  const years = getYears(rawData[MODE]);
  buildYearTabs(years);
  const monthlyActivity = getMonthlyActivity(rawData);
  years.forEach((year) => renderYear(rawData, year, monthlyActivity));
});
