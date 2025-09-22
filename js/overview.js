function factionPopularity(containerId, chartData) {
  const data = Object.entries(chartData);

  const width = 600;
  const height = 60;
  const barHeight = 20;

  const svg = d3
    .select(containerId)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const total = d3.sum(data, (d) => d[1]);

  const x = d3.scaleLinear().domain([0, total]).range([0, width]);

  const color = d3
    .scaleOrdinal()
    .domain(data.map((d) => d[0]))
    .range(d3.schemeSet2);

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

      g.append("rect")
        .attr("width", x(d[1]))
        .attr("height", barHeight)
        .attr("fill", color(d[0]));

      if (x(d[1]) > 40) {
        g.append("text")
          .attr("x", x(d[1]) / 2)
          .attr("y", barHeight / 2 + 4)
          .attr("text-anchor", "middle")
          .attr("fill", "white")
          .style("font-size", "12px")
          .text(`${d[0]}: ${d[1]}`);
      } else {
        g.append("text")
          .attr("x", x(d[1]) + 5)
          .attr("y", barHeight / 2 + 4)
          .attr("fill", "black")
          .style("font-size", "12px")
          .text(`${d[0]}: ${d[1]}`);
      }
    });
}

function mapCountBarChart(
  containerId,
  chartData,
  expandBtnSelector = "#expand-btn"
) {
  const fullData = Object.entries(chartData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const defaultItemCount = 10;
  const svgHeight = 450;
  const margin = { top: 20, right: 20, bottom: 100, left: 50 };

  const svg = d3.select(containerId).append("svg").attr("height", svgHeight);

  const tooltip = d3.select("#tooltip");
  const expandBtn = document.querySelector(expandBtnSelector);
  let isExpanded = false;

  function drawChart(dataSubset) {
    svg.selectAll("*").remove();

    const maxSvgWidth = 1200;
    const minSvgWidth = 500;
    const computedWidth = Math.max(
      minSvgWidth,
      Math.min(dataSubset.length * 60, maxSvgWidth)
    );
    svg.attr("width", computedWidth);

    const width = computedWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

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

    // Add x-axis group with .axis class
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
      .style("text-anchor", "start");

    // Add y-axis group with .axis class
    svg
      .append("g")
      .attr("class", "axis") // <-- Already here, confirmed
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(yAxis);

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
      .attr("fill", "steelblue")
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
      .text("Count");
  }

  drawChart(fullData.slice(0, defaultItemCount));

  if (expandBtn && fullData.length > defaultItemCount) {
    expandBtn.style.display = "inline-block";
    expandBtn.textContent = "Expand Chart";

    expandBtn.addEventListener("click", () => {
      isExpanded = !isExpanded;
      const dataToUse = isExpanded
        ? fullData
        : fullData.slice(0, defaultItemCount);
      drawChart(dataToUse);
      expandBtn.textContent = isExpanded ? "Collapse Chart" : "Expand Chart";
    });
  }
}

function commanderCountBarChart(
  containerId,
  chartData,
  expandBtnSelector = "#expand-btn"
) {
  const fullData = chartData
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const defaultItemCount = 10;
  const svgHeight = 450;
  const margin = { top: 20, right: 20, bottom: 100, left: 50 };

  const svg = d3.select(containerId).append("svg").attr("height", svgHeight);

  const tooltip = d3.select("#tooltip");
  const expandBtn = document.querySelector(expandBtnSelector);
  let isExpanded = false;

  function drawChart(dataSubset) {
    svg.selectAll("*").remove();

    const maxSvgWidth = 1200;
    const minSvgWidth = 500;
    const computedWidth = Math.max(
      minSvgWidth,
      Math.min(dataSubset.length * 60, maxSvgWidth)
    );
    svg.attr("width", computedWidth);

    const width = computedWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

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
      .attr("class", "axis")
      .attr("transform", `translate(0, ${height + margin.top})`)
      .call(xAxis)
      .selectAll("text")
      .attr("transform", "rotate(90)")
      .attr("x", 9)
      .attr("y", 0)
      .attr("dy", ".35em")
      .style("text-anchor", "start");

    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(yAxis);

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
      .attr("fill", "steelblue")
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
      .text("Count");
  }

  drawChart(fullData.slice(0, defaultItemCount));

  if (expandBtn && fullData.length > defaultItemCount) {
    expandBtn.style.display = "inline-block";
    expandBtn.textContent = "Expand Chart";

    expandBtn.addEventListener("click", () => {
      isExpanded = !isExpanded;
      const dataToUse = isExpanded
        ? fullData
        : fullData.slice(0, defaultItemCount);
      drawChart(dataToUse);
      expandBtn.textContent = isExpanded ? "Collapse Chart" : "Expand Chart";
    });
  }
}

d3.json("../data/mydata.json").then((rawData) => {
  const data = rawData.processed_data;

  factionPopularity("#inline-bar-chart-1", data.processed_most_played_factions);
  mapCountBarChart(
    "#chart-wrapper-played-maps-1",
    data.processed_map_counts,
    "#expand-btn-played-maps-1"
  );
  commanderCountBarChart(
    "#chart-wrapper-active-commanders-1",
    data.processed_commander_list,
    "#expand-btn-active-commanders-1"
  );
});
