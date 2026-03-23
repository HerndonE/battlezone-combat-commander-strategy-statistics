import { CONFIG } from "./config.js";
import { COLOR_PALETTE, BACKGROUND_COLOR, TEXT_LIGHT } from "./config.js";

// Aggregation
const commanders = {};

function ensureCommander(name) {
  if (!commanders[name]) {
    commanders[name] = {
      name,
      games: 0,
      wins: 0,
      factions: {},
      maps: {},
      opponents: {},
      lastActive: null, // track last match date
    };
  }
}

function addStats(commander, faction, map, opponent, isWinner) {
  const c = commanders[commander];
  c.games++;
  if (isWinner) c.wins++;

  c.factions[faction] = (c.factions[faction] || 0) + 1;
  c.maps[map] = (c.maps[map] || 0) + 1;
  c.opponents[opponent] = (c.opponents[opponent] || 0) + 1;
}

// Returns the top 3 opponements
function topKeys(obj, n = 3) {
  return Object.entries(obj)
    .sort(([, aCount], [, bCount]) => bCount - aCount)
    .slice(0, n)
    .map(([key, count]) => `${key} (${count})`);
}

// Parse date from JSON format (MM.DD.YY)
function parseDate(dateStr) {
  const [month, day, year] = dateStr.split(".").map(Number);
  const fullYear = year < 100 ? 2000 + year : year;
  return new Date(fullYear, month - 1, day); // JS months are 0-based
}

// Normalize Matches
function processMatch(match) {
  let [cmdA, cmdB] = match.commanders.split(" vs ").map((x) => x.trim());

  let [facA, facB] = match.factions
    .replace(/[\[\]]/g, "")
    .split(",")
    .map((x) => x.trim());

  const winner = match.winner;

  let winnerCmd, loserCmd, winnerFaction, loserFaction;

  if (winner === cmdA) {
    winnerCmd = cmdA;
    loserCmd = cmdB;
    winnerFaction = facA;
    loserFaction = facB;
  } else {
    winnerCmd = cmdB;
    loserCmd = cmdA;
    winnerFaction = facB;
    loserFaction = facA;
  }

  ensureCommander(winnerCmd);
  ensureCommander(loserCmd);

  // Update last active date
  const matchDate = parseDate(match.date);
  [winnerCmd, loserCmd].forEach((c) => {
    if (!commanders[c].lastActive || matchDate > commanders[c].lastActive) {
      commanders[c].lastActive = matchDate;
    }
  });

  addStats(winnerCmd, winnerFaction, match.map, loserCmd, true);
  addStats(loserCmd, loserFaction, match.map, winnerCmd, false);
}

let totalCommandersText = null;

// Load and Parse Data
async function loadData() {
  try {
    const response = await fetch(CONFIG.jsonFile);
    if (!response.ok) throw new Error("Failed to load JSON file");

    const data = await response.json();

    const totalCommanders = data["processed_data"]["processed_commander_times"];
    mergeCommanderTimes(totalCommanders);

    const lastEntry = totalCommanders[totalCommanders.length - 1];
    if (Array.isArray(lastEntry) && typeof lastEntry[0] === "string") {
      totalCommandersText = lastEntry[0];
    }

    Object.values(data).forEach((yearBlock) => {
      Object.values(yearBlock).forEach((rawYear) => {
        if (!rawYear?.month) return;

        Object.values(rawYear.month).forEach((monthBlock) => {
          Object.values(monthBlock).forEach((dateBlock) => {
            Object.values(dateBlock).forEach((match) => {
              processMatch(match);
            });
          });
        });
      });
    });

    renderCards();
  } catch (err) {
    console.error(err);
  }
}

loadData();

function mergeCommanderTimes(commanderTimes) {
  commanderTimes.forEach((entryArray) => {
    const entry = entryArray[0];
    if (typeof entry !== "object") return; // skip non-object items

    const name = entry.Commander;
    if (!name) return; // skip if Commander key is missing

    if (!commanders[name]) {
      ensureCommander(name);
    }

    commanders[name].totalTime = entry["Total Time"];
    commanders[name].averageTime = entry["Average Time"];
    commanders[name].firstYear = entry["First Year on Record"];
  });
}

// Cards
function topKey(obj) {
  let key = "None",
    max = 0;
  for (let k in obj) {
    if (obj[k] > max) {
      key = k;
      max = obj[k];
    }
  }
  return `${key} (${max})`;
}

// Determine inactivity
function isInactive(commander, months = 6) {
  if (!commander.lastActive) return true;
  const now = new Date();
  const diffMonths =
    (now.getFullYear() - commander.lastActive.getFullYear()) * 12 +
    (now.getMonth() - commander.lastActive.getMonth());
  return diffMonths >= months;
}

function getActivityStatus(commander) {
  if (!commander.lastActive) return { label: "Inactive", class: "inactive" };

  const now = new Date();
  const diffMonths =
    (now.getFullYear() - commander.lastActive.getFullYear()) * 12 +
    (now.getMonth() - commander.lastActive.getMonth());

  if (diffMonths < 3) {
    return { label: "Active", class: "active" };
  } else if (diffMonths < 6) {
    return { label: "Semi-Active", class: "semi-active" };
  } else {
    return { label: "Inactive", class: "inactive" };
  }
}

const factionIcons = {
  "i.s.d.f": "/assets/images/ISDF-Logo.png",
  scion: "/assets/images/Scion-Logo.png",
  hadean: "/assets/images/Hadean-Logo.png",
};

function getBaseFaction(faction) {
  return faction
    .replace(/\s*\(.*?\)\s*/, "") // remove the (number)
    .trim()
    .toLowerCase();
}

function renderFactionWithIcon(faction) {
  const key = getBaseFaction(faction);
  const icon = factionIcons[key];
  if (!icon) return faction;

  return `
    <span class="faction">
      <img src="${icon}" alt="${faction}" class="faction-icon">
      ${faction}
    </span>
  `;
}

// Create card with status badge
function createCard(c) {
  const div = document.createElement("div");
  div.className = "card";

  const winRate = c.games ? ((c.wins / c.games) * 100).toFixed(1) : 0;

  // Determine activity status
  const { label: status, class: statusClass } = getActivityStatus(c);
  div.classList.add(statusClass);

  div.innerHTML = `
  <div class="status ${statusClass}">${status}</div>
  <div class="name">${c.name}</div>

  <div class="stat"><span class="label">Games:</span> ${c.games}</div>
  <div class="stat"><span class="label">Wins:</span> ${c.wins}</div>
  <div class="stat"><span class="label">Win Rate:</span> ${winRate}%</div>

  <div class="stat"><span class="label">Recorded Time:</span> ${c.totalTime || "N/A"}</div>
  <div class="stat"><span class="label">Average Time:</span> ${c.averageTime || "N/A"}</div>
  <div class="stat"><span class="label">First Year on Record:</span> ${c.firstYear || "N/A"}</div>

  <div class="stat"><span class="label">Last Commanded:</span> ${
    c.lastActive ? c.lastActive.toLocaleDateString() : "Never"
  }</div>

  <div class="section-title">Most Played Faction</div>
  <div class="stat">${renderFactionWithIcon(topKey(c.factions))}</div>

  <div class="section-title">Most Played Map</div>
  <div class="stat">${topKey(c.maps)}</div>

  <div class="section-title">Top Opponents</div>
  <div class="stat">${topKeys(c.opponents).join(", ")}</div>

  <div class="section-title">Commander Activity</div>
  <div class="stat">
    <a href="#" class="activity-link" data-name="${c.name}">
      View Activity
    </a>
  </div>
  `;

  // Add click listener for popup
  div.querySelector(".activity-link").addEventListener("click", (e) => {
    e.preventDefault();
    openActivityModal(c.name);
  });

  return div;
}

function renderCards() {
  const container = document.getElementById("commander-card-container");
  container.innerHTML = "";

  if (totalCommandersText) {
    const heading = document.createElement("h3");
    heading.textContent = totalCommandersText;
    heading.classList.add("total-commanders-heading");
    container.parentNode.insertBefore(heading, container);
  }

  // Optional: sort by last active (most recent first)
  Object.values(commanders)
    .sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0))
    .forEach((c) => {
      container.appendChild(createCard(c));
    });
}

let cachedActivityData = null;

async function openActivityModal(commanderName) {
  const modal = document.getElementById("activityModal");
  const title = document.getElementById("modalTitle");
  const compareSelectA = document.getElementById("modalCompareA");
  const compareSelectB = document.getElementById("modalCompareB");

  // Show modal
  modal.style.display = "flex";

  // Set title
  title.textContent = `Commander Activity: ${commanderName}`;

  // Populate dropdowns
  compareSelectA.innerHTML = `<option value="">Commander A</option>`;
  compareSelectB.innerHTML = `<option value="">Commander B</option>`;
  Object.keys(commanders).forEach((name) => {
    compareSelectA.innerHTML += `<option value="${name}">${name}</option>`;
    compareSelectB.innerHTML += `<option value="${name}">${name}</option>`;
  });

  // Render left chart (single commander)
  await renderCommanderChart(commanderName, null, "modalChartLeft");

  // Render right chart initially empty
  d3.select("#modalChartRight").html("");

  // Update right chart on dropdown change
  compareSelectA.onchange = updateComparisonChart;
  compareSelectB.onchange = updateComparisonChart;

  function updateComparisonChart() {
    const a = compareSelectA.value || null;
    const b = compareSelectB.value || null;
    if (a && b) {
      renderCommanderChart(a, b, "modalChartRight");
    } else {
      d3.select("#modalChartRight").html(""); // clear if incomplete
    }
  }
}

const modal = document.getElementById("activityModal");
const closeBtn = document.querySelector(".global-close");

closeBtn.addEventListener("click", () => (modal.style.display = "none"));
modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.style.display = "none";
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") modal.style.display = "none";
});

async function renderCommanderChart(
  commanderA,
  commanderB = null,
  containerId = "modalChartLeft",
) {
  // Clear previous chart
  d3.select(`#${containerId}`).html("");

  // Load JSON from CONFIG only once
  if (!cachedActivityData) {
    const response = await fetch(CONFIG.jsonFile);
    if (!response.ok) throw new Error("Failed to load JSON file");
    cachedActivityData = await response.json();
  }

  const data = cachedActivityData;
  const structured = {};
  const labels = [];

  function getQuarter(month) {
    return "Q" + Math.ceil(month / 3);
  }

  const totalCommandersGameDates =
    data["processed_data"]["processed_commander_game_dates"];

  Object.entries(totalCommandersGameDates).forEach(([date, day]) => {
    let [month, , year] = date.split(".");
    month = +month;
    year = 2000 + +year;
    const quarter = getQuarter(month);

    if (!structured[year]) structured[year] = {};
    if (!structured[year][quarter]) structured[year][quarter] = {};

    Object.entries(day).forEach(([name, count]) => {
      if (!structured[year][quarter][name]) structured[year][quarter][name] = 0;
      structured[year][quarter][name] += count;
    });
  });

  // Build labels in order
  Object.keys(structured)
    .sort()
    .forEach((year) => {
      ["Q1", "Q2", "Q3", "Q4"].forEach((q) => {
        labels.push(`${year} ${q}`);
      });
    });

  function getData(name) {
    const arr = [];
    Object.keys(structured)
      .sort()
      .forEach((year) => {
        ["Q1", "Q2", "Q3", "Q4"].forEach((q) => {
          arr.push(structured[year][q]?.[name] || 0);
        });
      });
    return arr;
  }

  const selected = commanderB ? [commanderA, commanderB] : [commanderA];

  const width = 450;
  const height = 400;
  const margin = { top: 40, right: 20, bottom: 60, left: 60 };

  const borderRadius = 5;

  const svg = d3
    .select(`#${containerId}`)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("background", BACKGROUND_COLOR)
    .style("border-radius", "8px");

  const x = d3
    .scaleBand()
    .domain(labels)
    .range([margin.left, width - margin.right])
    .padding(0.2);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(selected, (name) => d3.max(getData(name)))])
    .nice()
    .range([height - margin.bottom, margin.top]);

  const color = d3
    .scaleOrdinal()
    .domain(selected)
    .range([COLOR_PALETTE[0], COLOR_PALETTE[5]]);

  selected.forEach((name, i) => {
    const dataset = getData(name);
    svg
      .selectAll(`.bar-${i}`)
      .data(dataset)
      .enter()
      .append("rect")
      .attr(
        "x",
        (d, idx) => x(labels[idx]) + i * (x.bandwidth() / selected.length),
      )
      .attr("y", (d) => y(d))
      .attr("width", x.bandwidth() / selected.length)
      .attr("height", (d) => y(0) - y(d))
      .attr("rx", borderRadius)
      .attr("ry", borderRadius)
      .attr("fill", color(name));
  });

  // X Axis
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end")
    .attr("fill", TEXT_LIGHT);

  // Y Axis
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))
    .selectAll("text")
    .attr("fill", TEXT_LIGHT);

  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(height / 2) - margin.top)
    .attr("y", margin.left - 35)
    .attr("text-anchor", "middle")
    .attr("fill", TEXT_LIGHT)
    .text("Count");

  // Legend if comparing
  if (commanderB) {
    const legendContainer = d3.select(
      `#${containerId === "modalChartLeft" ? "modalLegendLeft" : "modalLegendRight"}`,
    );
    legendContainer.html(""); // clear previous legend

    selected.forEach((name, i) => {
      const row = legendContainer
        .append("div")
        .style("display", "flex")
        .style("align-items", "center")
        .style("gap", "5px");
      row
        .append("div")
        .style("width", "15px")
        .style("height", "15px")
        .style("background-color", color(name));
      row
        .append("span")
        .text(name)
        .style("color", "white")
        .style("font-size", "14px");
    });
  }

  const legendContainer = d3.select("#modalLegendRight");
  legendContainer.html(""); // clear previous legend

  if (commanderA && commanderB) {
    [commanderA, commanderB].forEach((name, i) => {
      const row = legendContainer
        .append("div")
        .style("display", "flex")
        .style("align-items", "center")
        .style("gap", "5px");

      row
        .append("div")
        .style("width", "15px")
        .style("height", "15px")
        .style("background-color", color(name));

      row
        .append("span")
        .text(name)
        .style("color", "white")
        .style("font-size", "14px");
    });
  }
}
