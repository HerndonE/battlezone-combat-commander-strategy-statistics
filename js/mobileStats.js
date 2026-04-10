import { CONFIG } from "./config.js";
import { COLOR_PALETTE } from "./config.js";

const response = await fetch(CONFIG.jsonFile);
const allData = await response.json();

function createCard(title, value) {
  const card = document.createElement("div");
  card.className = "stat-card";
  card.innerHTML = `<div class="stat-title">${title}</div>
                    <div class="stat-value">${value}</div>`;
  return card;
}

// Populate cards
function populateCards(containerId, data) {
  const container = document.getElementById(containerId);

  let entries;
  if (Array.isArray(data)) {
    if (data.length && Array.isArray(data[0])) {
      entries = data.map(([name, value]) => ({ name, value }));
    } else {
      entries = data;
    }
  } else {
    entries = Object.entries(data).map(([name, value]) => ({ name, value }));
  }

  entries.sort((a, b) => b.value - a.value);

  entries.forEach(({ name, value }) => {
    container.appendChild(createCard(name, value));
  });
}

// Populate commander faction cards
function populateCommanderCards(containerId, data) {
  const container = document.getElementById(containerId);

  Object.entries(data).forEach(([commander, factions]) => {
    const card = document.createElement("div");
    card.className = "stat-card";

    // Commander Name
    const title = document.createElement("div");
    title.className = "stat-title";
    title.textContent = commander;
    card.appendChild(title);

    // Faction breakdown inside the card
    const breakdown = document.createElement("div");
    breakdown.className = "faction-breakdown";

    Object.entries(factions)
      .sort((a, b) => b[1] - a[1]) // sort by count descending
      .forEach(([faction, count]) => {
        const item = document.createElement("div");
        item.className = "faction-item";
        item.textContent = `${faction}: ${count}`;
        breakdown.appendChild(item);
      });

    card.appendChild(breakdown);
    container.appendChild(card);
  });
}

// Populate commander win rates
function populateCommanderWinCards(containerId, data) {
  const container = document.getElementById(containerId);

  const entries = data
    .filter(([_, __, totalGames]) => totalGames >= 5) // ignore commanders with <5 games
    .map(([name, _, totalGames, wins]) => {
      const adjustedTotal = totalGames - 5;
      const adjustedWins = wins - 5;
      return {
        name,
        totalGames: adjustedTotal,
        wins: adjustedWins,
        percentage:
          adjustedTotal > 0
            ? ((adjustedWins / adjustedTotal) * 100).toFixed(1)
            : 0,
      };
    })
    .sort((a, b) => b.percentage - a.percentage); // sort descending by win %

  // Create cards
  entries.forEach(({ name, totalGames, wins, percentage }) => {
    const card = document.createElement("div");
    card.className = "stat-card";

    // Commander Name
    const title = document.createElement("div");
    title.className = "stat-title";
    title.textContent = name;
    card.appendChild(title);

    // Win details
    const details = document.createElement("div");
    details.className = "faction-breakdown";
    details.innerHTML = `
      <div class="faction-item">Wins: ${wins}</div>
      <div class="faction-item">Total: ${totalGames}</div>
      <div class="faction-item">Win %: ${percentage}%</div>
    `;

    card.appendChild(details);
    container.appendChild(card);
  });
}

// Populate games by month from game_totals
function populateGamesByMonth(containerId, data) {
  const container = document.getElementById(containerId);
  if (!data || !container) return;
  data.forEach((entry) => {
    if (typeof entry[0] !== "string") return; // skip the summary row at the end
    const month = entry[0];
    const games = entry[3]["Game(s) Played"];
    const days = entry[2]["Day(s) Played"];
    container.appendChild(createCard(month, `${games} games · ${days} days`));
  });
}

// Parse game_times into a flat object — handles both 2025 and 2026 structures
function parseGameTimes(data) {
  if (!data) return null;
  const stats = {};

  // Index 0: [[label, value], ...] for Total Time, Mean, Median, Range
  data[0].forEach(([label, value]) => {
    stats[label] = value;
  });

  // Index 1: [label, value] for Mode
  stats[data[1][0]] = data[1][1];

  // Recursively find Shortest Match / Longest Match labels in the rest
  function findPairs(arr) {
    if (!Array.isArray(arr)) return;
    if (
      arr.length === 2 &&
      typeof arr[0] === "string" &&
      typeof arr[1] === "string"
    ) {
      if (arr[0] === "Shortest Match" || arr[0] === "Longest Match") {
        stats[arr[0]] = arr[1];
      }
      return;
    }
    arr.forEach((item) => findPairs(item));
  }
  data.slice(2).forEach((item) => findPairs(item));

  return stats;
}

// Populate match time stat cards
function populateMatchTimes(containerId, data) {
  const container = document.getElementById(containerId);
  if (!data || !container) return;
  const stats = parseGameTimes(data);
  if (!stats) return;

  const labels = [
    ["Total Time", stats["Total Time"]],
    ["Avg (Mean)", stats["Mean"]],
    ["Median", stats["Median"]],
    ["Mode", stats["Mode"]],
    ["Range", stats["Range"]],
    ["Shortest Match", stats["Shortest Match"]],
    ["Longest Match", stats["Longest Match"]],
  ];
  labels.forEach(([label, value]) => {
    if (value !== undefined) container.appendChild(createCard(label, value));
  });
}

// Populate commander time cards (total time commanded, avg game time)
function populateCommanderTimes(containerId, data) {
  const container = document.getElementById(containerId);
  if (!data || !container) return;
  data.forEach((entry) => {
    const cmd = entry[0];
    const card = document.createElement("div");
    card.className = "stat-card";
    card.innerHTML = `
      <div class="stat-title">${cmd["Commander"]}</div>
      <div class="faction-breakdown">
        <div class="faction-item">Total: ${cmd["Total Time"]}</div>
        <div class="faction-item">Avg: ${cmd["Average Time"]}</div>
        <div class="faction-item">Since: ${cmd["First Year on Record"]}</div>
      </div>`;
    container.appendChild(card);
  });
}

// Populate player time cards (total playtime, status, last played)
function populatePlayerTimes(containerId, data) {
  const container = document.getElementById(containerId);
  if (!data || !container) return;
  const statusOrder = { Active: 0, "Semi-Active": 1, Inactive: 2 };
  const sorted = [...data].sort((a, b) => {
    const sa = statusOrder[a[0]["Status"]] ?? 99;
    const sb = statusOrder[b[0]["Status"]] ?? 99;
    return sa - sb;
  });
  sorted.forEach((entry) => {
    const player = entry[0];
    if (!player || !player["Player"] || !player["Status"]) return;
    const card = document.createElement("div");
    card.className = "stat-card";
    card.innerHTML = `
      <div class="stat-title">${player["Player"]}</div>
      <div class="faction-breakdown">
        <div class="faction-item">Time: ${player["Total Time"]}</div>
        <div class="faction-item">Status: ${player["Status"]}</div>
        <div class="faction-item">Last: ${player["Last Played"]}</div>
      </div>`;
    container.appendChild(card);
  });
}

// Populate map popularity
function populateMapPopularity(containerId, data) {
  const container = document.getElementById(containerId);

  // Map tier to a color from the palette
  const tierNames = Object.keys(data);
  const tierColors = {};
  tierNames.forEach((tier, index) => {
    tierColors[tier] = COLOR_PALETTE[index % COLOR_PALETTE.length];
  });

  Object.entries(data).forEach(([tier, maps]) => {
    // Sub-category dropdown
    const subCategory = document.createElement("div");
    subCategory.className = "sub-category";

    const btn = document.createElement("button");
    btn.className = "dropdown-btn-map-popularity";
    btn.textContent = `${tier} ▼`;
    btn.style.backgroundColor = tierColors[tier];

    const cardContainer = document.createElement("div");
    cardContainer.className = "cards dropdown-content";

    // Create pills for each map
    maps.forEach((map) => {
      const mapPill = document.createElement("div");
      mapPill.className = "map-pill";
      mapPill.textContent = map;
      cardContainer.appendChild(mapPill);
    });

    subCategory.appendChild(btn);
    subCategory.appendChild(cardContainer);
    container.appendChild(subCategory);

    // Dropdown toggle
    btn.addEventListener("click", () => {
      cardContainer.classList.toggle("show");
      btn.textContent = cardContainer.classList.contains("show")
        ? btn.textContent.replace("▼", "▲")
        : btn.textContent.replace("▲", "▼");
    });
  });
}

// Overview
populateCards(
  "overview-factions",
  allData.processed_data.processed_most_played_factions,
);
populateCards("overview-maps", allData.processed_data.processed_map_counts);
populateCards(
  "overview-active-commanders",
  allData.processed_data.processed_commander_list,
);
populateCommanderCards(
  "overview-commander-cards",
  allData.processed_data.processed_commander_faction_counts,
);
populateCommanderWinCards(
  "commander-win-cards",
  allData.processed_data.processed_commander_win_percentages,
);
populateCommanderTimes(
  "overview-commander-times",
  allData.processed_data.processed_commander_times,
);
populatePlayerTimes(
  "overview-player-times",
  allData.processed_data.processed_player_times,
);
populateMapPopularity(
  "map-popularity-container",
  allData.processed_data.processed_map_popularity,
);

// 2024
populateCards("factions-2024", allData["2024"]["data_2024"].faction_counter);
populateCards("maps-2024", allData["2024"]["data_2024"].map_counts);
populateCards(
  "active-commanders-2024",
  allData["2024"]["data_2024"].commander_list,
);
populateCommanderCards(
  "commander-cards-2024",
  allData["2024"]["data_2024"].commander_faction_counts,
);
populateCommanderWinCards(
  "commander-win-cards-2024",
  allData["2024"]["data_2024"].commander_win_percentages,
);
populateGamesByMonth(
  "games-by-month-2024",
  allData["2024"]["data_2024"].game_totals,
);

// 2025
populateCards("factions-2025", allData["2025"]["data_2025"].faction_counter);
populateCards("maps-2025", allData["2025"]["data_2025"].map_counts);
populateCards(
  "active-commanders-2025",
  allData["2025"]["data_2025"].commander_list,
);
populateCommanderCards(
  "commander-cards-2025",
  allData["2025"]["data_2025"].commander_faction_counts,
);
populateCommanderWinCards(
  "commander-win-cards-2025",
  allData["2025"]["data_2025"].commander_win_percentages,
);
populateGamesByMonth(
  "games-by-month-2025",
  allData["2025"]["data_2025"].game_totals,
);
populateMatchTimes("match-times-2025", allData["2025"]["data_2025"].game_times);

// 2026
populateCards("factions-2026", allData["2026"]["data_2026"].faction_counter);
populateCards("maps-2026", allData["2026"]["data_2026"].map_counts);
populateCards(
  "active-commanders-2026",
  allData["2026"]["data_2026"].commander_list,
);
populateCommanderCards(
  "commander-cards-2026",
  allData["2026"]["data_2026"].commander_faction_counts,
);
populateCommanderWinCards(
  "commander-win-cards-2026",
  allData["2026"]["data_2026"].commander_win_percentages,
);
populateGamesByMonth(
  "games-by-month-2026",
  allData["2026"]["data_2026"].game_totals,
);
populateMatchTimes("match-times-2026", allData["2026"]["data_2026"].game_times);

// Dropdown toggle
document.querySelectorAll(".dropdown-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const content = btn.nextElementSibling;
    content.classList.toggle("show");
    btn.textContent = content.classList.contains("show")
      ? btn.textContent.replace("▼", "▲")
      : btn.textContent.replace("▲", "▼");
  });
});
