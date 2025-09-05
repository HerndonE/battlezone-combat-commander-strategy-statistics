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

d3.json("../data/mydata.json").then((rawData) => {
  const data = rawData.processed_data;

  factionPopularity("#inline-bar-chart-1", data.processed_most_played_factions);
});
