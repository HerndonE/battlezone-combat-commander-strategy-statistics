function mapCountBarChart2024(containerSelector, mapData, expandBtnSelector) {
  const container = d3.select(containerSelector);

  let svg = container.select("svg");
  if (svg.empty()) {
    svg = container.append("svg").attr("height", 450);
  }

  const expandBtn = document.querySelector(expandBtnSelector);

  const defaultItemCount = 10;
  const margin = { top: 20, right: 20, bottom: 100, left: 50 };
  const height = +svg.attr("height") - margin.top - margin.bottom;

  let isExpanded = false;

  function drawChart(dataSubset) {
    svg.selectAll("*").remove();

    let tooltip = d3.select("#tooltip2");
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
      .style("text-anchor", "start");

    svg
      .append("g")
      .attr("class", "axis") // <-- Added here
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
    svg = container.append("svg").attr("height", 450);
  }

  const expandBtn = document.querySelector(expandBtnSelector);

  const defaultItemCount = 10;
  const margin = { top: 20, right: 20, bottom: 100, left: 50 };
  const height = +svg.attr("height") - margin.top - margin.bottom;

  let isExpanded = false;

  function drawChart(dataSubset) {
    svg.selectAll("*").remove();

    let tooltip = d3.select("#tooltip2");
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
      .style("text-anchor", "start");

    svg
      .append("g")
      .attr("class", "axis") // <-- Added here
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

d3.json("../data/mydata.json").then((rawData) => {
  const mapCounts = rawData["2025"]["data_2025"].map_counts.map(
    ([name, value]) => ({ name, value })
  );

  const commanderCounts = rawData["2025"]["data_2025"].commander_list.map(
    ([name, value]) => ({ name, value })
  );

  mapCountBarChart2024(
    "#chart-wrapper-played-maps-2025",
    mapCounts,
    "#expand-btn-played-maps-2025"
  );

  commanderCountBarChart2024(
    "#chart-wrapper-played-commanders-2025",
    commanderCounts,
    "#expand-btn-played-commanders-2025"
  );
});
