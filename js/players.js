import { CONFIG } from "./config.js";
import { FACTIONICONS } from "./config.js";

// Aggregation
const players = {};
let totalPlayersText = null;

function ensurePlayer(name) {
  if (!players[name]) {
    players[name] = {
      name,
      totalTime: "N/A",
      status: "Unknown",
      lastPlayed: null,
      factions: {},
    };
  }
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr.includes(".")) {
    const [month, day, year] = dateStr.split(".").map(Number);
    const fullYear = year < 100 ? 2000 + year : year;
    return new Date(fullYear, month - 1, day);
  } else if (dateStr.includes("-")) {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return null;
}

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

function getBaseFaction(faction) {
  return faction
    .replace(/\s*\(.*?\)\s*/, "")
    .trim()
    .toLowerCase();
}

function renderFactionWithIcon(faction) {
  const key = getBaseFaction(faction);
  const icon = FACTIONICONS[key];
  if (!icon) return faction;
  return `
    <span class="faction">
      <img src="${icon}" alt="${faction}" class="faction-icon">
      ${faction}
    </span>
  `;
}

function parseFactionsPlayed(factionsStr) {
  const factions = {};
  if (!factionsStr) return factions;

  factionsStr
    .replace(/[\[\]]/g, "")
    .split(",")
    .forEach((part) => {
      const [name, count] = part.split(":").map((x) => x.trim());
      if (name && count) factions[name] = Number(count);
    });

  return factions;
}

function createCard(c) {
  const div = document.createElement("div");
  div.className = "card";

  // Status styling
  let statusClass = "inactive";
  if (c.status.toLowerCase() === "active") statusClass = "active";
  else if (c.status.toLowerCase() === "semi-active")
    statusClass = "semi-active";

  div.classList.add(statusClass);

  // Get top faction separately
  const topFaction = topKey(c.factions);

  // Prepare remaining factions
  const remainingFactions = Object.entries(c.factions)
    .filter(([name]) => !topFaction.startsWith(name))
    .map(([name, count]) => `${name} (${count})`)
    .join(", ");

  div.innerHTML = `
    <div class="status ${statusClass}">${c.status}</div>
    <div class="name">${c.name}</div>

    <div class="stat"><span class="label">Time on Record:</span> ${c.totalTime}</div>
    <div class="stat"><span class="label">Last Played:</span> ${
      c.lastPlayed ? c.lastPlayed.toLocaleDateString() : "Never"
    }</div>

    <div class="section-title">Most Played Faction</div>
    <div class="stat">${renderFactionWithIcon(topFaction)}</div>

    ${
      remainingFactions
        ? `<div class="section-title">Other Factions</div>
           <div class="stat">${remainingFactions}</div>`
        : ""
    }
  `;

  return div;
}

function renderCards(
  containerId = "player-card-container",
  headingClass = "total-players-heading",
) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  // Add heading for total players
  if (totalPlayersText) {
    const heading = document.createElement("h3");
    heading.textContent = totalPlayersText;
    heading.classList.add(headingClass);
    container.parentNode.insertBefore(heading, container);
  }

  // Sort players by last played (most recent first)
  Object.values(players)
    .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0))
    .forEach((p) => container.appendChild(createCard(p)));
}

async function loadData() {
  try {
    const response = await fetch(CONFIG.jsonFile);
    if (!response.ok) throw new Error("Failed to load JSON file");

    const data = await response.json();
    const totalPlayers = data["processed_data"]["processed_player_times"];

    const lastEntry = totalPlayers[totalPlayers.length - 1];
    if (Array.isArray(lastEntry) && typeof lastEntry[0] === "string") {
      totalPlayersText = lastEntry[0];
    }

    totalPlayers.forEach((entry) => {
      if (!entry[0] || typeof entry[0] !== "object") return;
      const p = entry[0];
      ensurePlayer(p.Player);
      const playerObj = players[p.Player];
      playerObj.totalTime = p["Total Time"] || "N/A";
      playerObj.status = p.Status || "Unknown";
      playerObj.lastPlayed = parseDate(p["Last Played"]);
      playerObj.factions = parseFactionsPlayed(p["Factions Played"]);
    });

    renderCards("player-card-container", "total-players-heading");
  } catch (err) {
    console.error(err);
  }
}

loadData();
