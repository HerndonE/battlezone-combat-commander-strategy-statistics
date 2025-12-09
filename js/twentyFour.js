import { CONFIG, GRAPH_POPERTIES } from "./config.js";
import {
  COLOR_PALETTE,
  BACKGROUND_COLOR,
  TEXT_LIGHT,
  TEXT_DARK,
} from "./config.js";

function mapCountBarChart2024(containerSelector, mapData, expandBtnSelector) {
  const container = d3.select(containerSelector);

  let svg = container.select("svg");
  if (svg.empty()) {
    svg = container.append("svg").attr("height", GRAPH_POPERTIES.svgHeight);
  }

  svg.style("background-color", BACKGROUND_COLOR);

  const expandBtn = document.querySelector(expandBtnSelector);

  const defaultItemCount = 10;
  const margin = { top: 20, right: 20, bottom: 100, left: 50 };
  const height = +svg.attr("height") - margin.top - margin.bottom;
  const borderRadius = 5;

  let isExpanded = false;

  function drawChart(dataSubset) {
    svg.selectAll("*").remove();

    let tooltip = d3.select("#tooltip1");
    if (tooltip.empty()) {
      tooltip = d3
        .select("body")
        .append("div")
        .attr("id", "tooltip1")
        .attr("class", "tooltip1");
    }

    const maxSvgWidth = 1200;
    const minSvgWidth = 500;
    const computedWidth = Math.max(
      minSvgWidth,
      Math.min(dataSubset.length * 60, maxSvgWidth)
    );
    svg.attr("width", computedWidth);

    const width = computedWidth - margin.left - margin.right;

    const x = d3
      .scaleBand()
      .domain(dataSubset.map((d) => d.name))
      .range([margin.left, width + margin.left])
      .padding(0.2);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(dataSubset, (d) => d.value)])
      .nice()
      .range([height + margin.top, margin.top]);

    const xAxis = d3.axisBottom(x);
    const yAxis = d3.axisLeft(y);

    svg
      .append("g")
      .attr("class", "axis") // <-- Added here
      .attr("transform", `translate(0, ${height + margin.top})`)
      .call(xAxis)
      .selectAll("text")
      .attr("transform", "rotate(90)")
      .attr("x", 9)
      .attr("y", 0)
      .attr("dy", ".35em")
      .style("text-anchor", "start")
      .attr("fill", TEXT_LIGHT);

    svg
      .append("g")
      .attr("class", "axis") // <-- Added here
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(yAxis)
      .selectAll("text")
      .attr("fill", TEXT_LIGHT);

    svg
      .selectAll(".bar")
      .data(dataSubset)
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
          .html(`<strong>${d.name}</strong><br>Count: ${d.value}`);
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      });

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
  drawChart(mapData.slice(0, defaultItemCount));

  if (mapData.length > defaultItemCount) {
    expandBtn.style.display = "inline-block";
    expandBtn.addEventListener("click", () => {
      isExpanded = !isExpanded;
      const dataToUse = isExpanded
        ? mapData
        : mapData.slice(0, defaultItemCount);
      drawChart(dataToUse);
      expandBtn.textContent = isExpanded ? "Collapse Chart" : "Expand Chart";
    });
  }
}

function commanderCountBarChart2024(
  containerSelector,
  mapData,
  expandBtnSelector
) {
  const container = d3.select(containerSelector);

  let svg = container.select("svg");
  if (svg.empty()) {
    svg = container.append("svg").attr("height", GRAPH_POPERTIES.svgHeight);
  }

  svg.style("background-color", BACKGROUND_COLOR);

  const expandBtn = document.querySelector(expandBtnSelector);

  const defaultItemCount = 10;
  const margin = { top: 20, right: 20, bottom: 100, left: 50 };
  const height = +svg.attr("height") - margin.top - margin.bottom;
  const borderRadius = 5;

  let isExpanded = false;

  function drawChart(dataSubset) {
    svg.selectAll("*").remove();

    let tooltip = d3.select("#tooltip1");
    if (tooltip.empty()) {
      tooltip = d3
        .select("body")
        .append("div")
        .attr("id", "tooltip1")
        .attr("class", "tooltip1");
    }

    const maxSvgWidth = 1200;
    const minSvgWidth = 500;
    const computedWidth = Math.max(
      minSvgWidth,
      Math.min(dataSubset.length * 60, maxSvgWidth)
    );
    svg.attr("width", computedWidth);

    const width = computedWidth - margin.left - margin.right;

    const x = d3
      .scaleBand()
      .domain(dataSubset.map((d) => d.name))
      .range([margin.left, width + margin.left])
      .padding(0.2);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(dataSubset, (d) => d.value)])
      .nice()
      .range([height + margin.top, margin.top]);

    const xAxis = d3.axisBottom(x);
    const yAxis = d3.axisLeft(y);

    svg
      .append("g")
      .attr("class", "axis") // <-- Added here
      .attr("transform", `translate(0, ${height + margin.top})`)
      .call(xAxis)
      .selectAll("text")
      .attr("transform", "rotate(90)")
      .attr("x", 9)
      .attr("y", 0)
      .attr("dy", ".35em")
      .style("text-anchor", "start")
      .attr("fill", TEXT_LIGHT);

    svg
      .append("g")
      .attr("class", "axis") // <-- Added here
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(yAxis)
      .selectAll("text")
      .attr("fill", TEXT_LIGHT);

    svg
      .selectAll(".bar")
      .data(dataSubset)
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
          .html(`<strong>${d.name}</strong><br>Count: ${d.value}`);
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      });

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
  drawChart(mapData.slice(0, defaultItemCount));

  if (mapData.length > defaultItemCount) {
    expandBtn.style.display = "inline-block";
    expandBtn.addEventListener("click", () => {
      isExpanded = !isExpanded;
      const dataToUse = isExpanded
        ? mapData
        : mapData.slice(0, defaultItemCount);
      drawChart(dataToUse);
      expandBtn.textContent = isExpanded ? "Collapse Chart" : "Expand Chart";
    });
  }
}

function commanderFactionChoiceCountBarChart2024(
  containerId,
  chartData,
  expandBtnSelector = "#expand-btn"
) {
  const defaultItemCount = 10;
  const barWidth = 50;
  const margin = { top: 20, right: 20, bottom: 100, left: 50 };
  const borderRadius = 5;

  const svgHeight = 400;
  const svg = d3
    .select(containerId)
    .append("svg")
    .attr("height", svgHeight)
    .style("background-color", BACKGROUND_COLOR);
  const tooltip = d3.select("#tooltip1");
  const expandBtn = document.querySelector(expandBtnSelector);
  let isExpanded = false;

  const allCommanders = Array.from(new Set(chartData.map((d) => d.commander)));

  function drawChart(data) {
    svg.selectAll("*").remove();

    const commanders = Array.from(new Set(data.map((d) => d.commander)));
    const factions = Array.from(new Set(data.map((d) => d.faction)));

    const svgWidth = commanders.length * barWidth + margin.left + margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    svg.attr("width", svgWidth);

    const x0 = d3
      .scaleBand()
      .domain(commanders)
      .range([margin.left, svgWidth - margin.right])
      .paddingInner(0.2);

    const x1 = d3
      .scaleBand()
      .domain(factions)
      .range([0, x0.bandwidth()])
      .padding(0.05);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.value)])
      .nice()
      .range([height + margin.top, margin.top]);

    const color = d3.scaleOrdinal().domain(factions).range(COLOR_PALETTE);

    // X Axis
    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height + margin.top})`)
      .call(d3.axisBottom(x0))
      .selectAll("text")
      .attr("transform", "rotate(-30)")
      .style("text-anchor", "end")
      .attr("fill", TEXT_LIGHT);

    // Y Axis
    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

    // Grouped bars
    const groups = svg
      .append("g")
      .selectAll("g")
      .data(d3.group(data, (d) => d.commander))
      .join("g")
      .attr("transform", (d) => `translate(${x0(d[0])},0)`);

    groups
      .selectAll("rect")
      .data((d) => d[1])
      .join("rect")
      .attr("x", (d) => x1(d.faction))
      .attr("y", (d) => y(d.value))
      .attr("width", x1.bandwidth())
      .attr("height", (d) => height + margin.top - y(d.value))
      .attr("fill", (d, i) => COLOR_PALETTE[i % COLOR_PALETTE.length])
      .attr("rx", borderRadius)
      .attr("ry", borderRadius)
      .attr("class", "bar")
      .on("mouseover", (event, d) => {
        tooltip
          .style("opacity", 1)
          .html(
            `<strong>${d.commander}</strong><br><em>${d.faction}</em><br>Count: ${d.value}`
          );
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      });

    // Legend
    const legend = svg
      .append("g")
      .attr(
        "transform",
        `translate(${svgWidth - margin.right - 100},${margin.top})`
      );

    factions.forEach((faction, i) => {
      const legendRow = legend
        .append("g")
        .attr("transform", `translate(0, ${i * 20})`);

      legendRow
        .append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", color(faction));

      legendRow
        .append("text")
        .attr("x", 18)
        .attr("y", 10)
        .attr("fill", TEXT_LIGHT)
        .text(faction)
        .attr("class", "axis-label");
    });
  }

  // Initial chart render
  const initialCommanders = allCommanders.slice(0, defaultItemCount);
  const initialData = chartData.filter((d) =>
    initialCommanders.includes(d.commander)
  );
  drawChart(initialData);

  // Expand/Collapse logic
  if (expandBtn && allCommanders.length > defaultItemCount) {
    expandBtn.style.display = "inline-block";
    expandBtn.textContent = "Expand Chart";

    expandBtn.addEventListener("click", () => {
      isExpanded = !isExpanded;

      const commandersToShow = isExpanded
        ? allCommanders
        : allCommanders.slice(0, defaultItemCount);

      const dataToUse = chartData.filter((d) =>
        commandersToShow.includes(d.commander)
      );
      drawChart(dataToUse);

      expandBtn.textContent = isExpanded ? "Collapse Chart" : "Expand Chart";
    });
  }
}

function factionPopularity2024(containerId, chartData) {
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

function commanderWinPercentages2024(
  containerSelector,
  chartData,
  expandButtonSelector
) {
  const container = d3.select(containerSelector);
  container.html(""); // clear previous content

  const width = 800;
  const height = 400;
  const margin = { top: 40, right: 20, bottom: 80, left: 60 };
  const borderRadius = 5;

  const svg = container
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("background-color", BACKGROUND_COLOR);

  const data = chartData
    .filter(([_, __, total]) => total >= 5)
    .map(([name, _, total, wins]) => {
      const adjustedTotal = total - 5;
      const adjustedWins = wins - 5;
      return {
        name,
        total: adjustedTotal,
        wins: adjustedWins,
        percentage:
          adjustedTotal > 0 ? (adjustedWins / adjustedTotal) * 100 : 0,
      };
    })
    .sort((a, b) => b.percentage - a.percentage);

  let tooltip = container.select(".tooltip1");
  if (tooltip.empty()) {
    tooltip = container
      .append("div")
      .attr("class", "tooltip1")
      .style("position", "absolute")
      .style("background", "rgba(0,0,0,0.8)")
      .style("color", "white")
      .style("padding", "8px 10px")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("font-size", "12px")
      .style("opacity", 0);
  }

  const x = d3
    .scaleBand()
    .domain(data.map((d) => d.name))
    .range([margin.left, width - margin.right])
    .padding(0.2);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.percentage)])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg
    .selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", (d) => x(d.name))
    .attr("y", (d) => y(d.percentage))
    .attr("width", x.bandwidth())
    .attr("height", (d) => y(0) - y(d.percentage))
    .attr("fill", (d, i) => COLOR_PALETTE[i % COLOR_PALETTE.length])
    .attr("rx", borderRadius)
    .attr("ry", borderRadius)
    .on("mousemove", (event, d) => {
      tooltip
        .style("opacity", 1)
        .html(
          `<strong>${d.name}</strong><br>` +
            `Games (After 5 removed): ${d.total}<br>` +
            `Wins (After 5 removed): ${d.wins}<br>` +
            `Win %: ${d.percentage.toFixed(1)}%`
        )
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseleave", () => tooltip.style("opacity", 0));

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-40)")
    .style("text-anchor", "end")
    .attr("fill", TEXT_LIGHT);

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))
    .selectAll("text")
    .attr("fill", TEXT_LIGHT);

  if (expandButtonSelector) {
    d3.select(expandButtonSelector).on("click", () => {
      container.classed("expanded", !container.classed("expanded"));
    });
  }
}

d3.json(CONFIG.jsonFile).then((rawData) => {
  const data = rawData["2024"]["data_2024"];

  const mapCounts = data.map_counts.map(([name, value]) => ({ name, value }));

  const commanderCounts = data.commander_list.map(([name, value]) => ({
    name,
    value,
  }));

  const commanderFactionCounts = Object.entries(
    data.commander_faction_counts
  ).flatMap(([commander, factions]) =>
    Object.entries(factions).map(([faction, value]) => ({
      commander,
      faction,
      value,
    }))
  );

  mapCountBarChart2024(
    "#chart-wrapper-played-maps-2024",
    mapCounts,
    "#expand-btn-played-maps-2024"
  );

  commanderCountBarChart2024(
    "#chart-wrapper-played-commanders-2024",
    commanderCounts,
    "#expand-btn-played-commanders-2024"
  );

  commanderFactionChoiceCountBarChart2024(
    "#chart-wrapper-faction-choice-2024",
    commanderFactionCounts,
    "#expand-btn-faction-choice-2024"
  );

  factionPopularity2024("#inline-bar-chart-2", data.faction_counter);

  commanderWinPercentages2024(
    "#chart-wrapper-commander-wins-2024",
    data.commander_win_percentages,
    "#expand-btn-commander-wins-2024"
  );
});
