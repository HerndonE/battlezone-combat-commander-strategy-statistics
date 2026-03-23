import { CONFIG } from "./config.js";
import { FACTIONICONS } from "./config.js";

function formatPercent(value) {
  return (value * 100).toFixed(1) + "%";
}

function getBaseFaction(faction) {
  return faction
    .replace(/\s*\(.*?\)\s*/, "")
    .trim()
    .toLowerCase();
}

function renderFactionWithIcon(faction) {
  const key = getBaseFaction(faction);
  const icon = FACTIONICONS?.[key];
  if (!icon) return faction;
  return `
    <span class="faction">
      <img src="${icon}" alt="${faction}" class="faction-icon">
      ${faction}
    </span>
  `;
}

function createCard(mapName, map) {
  const div = document.createElement("div");
  div.className = "card";

  // Activity styling based on total games
  if (map.totalGames >= 100) div.classList.add("active");
  else if (map.totalGames >= 50) div.classList.add("semi-active");
  else div.classList.add("inactive");

  div.innerHTML = `
    <div class="name">${mapName}</div>

    <div class="stat"><span class="label">Author:</span> ${map.author}</div>
    <div class="stat"><span class="label">Total Games:</span> ${map.totalGames}</div>
    <div class="stat"><span class="label">Base to Base:</span> ${map.basetoBase}</div>
    <div class="stat"><span class="label">Map Size:</span> ${map.mapSize}</div>
    <div class="stat"><span class="label">Pools:</span> ${map.pools}</div>

    <div class="section-title">Factions</div>
    ${Object.entries(map.factions)
      .map(
        ([name, f]) => `
      <div class="stat">
        <span class="label">${name}</span><br>
        Games: ${f.games} |
        Wins: ${f.wins} |
        WR: ${formatPercent(f.winRate)}
      </div>
    `,
      )
      .join("")}

    <div class="section-title">Favored</div>
    <div class="stat">${renderFactionWithIcon(map.favoredFaction)}</div>
  `;

  return div;
}

function renderCardsFromData(
  maps,
  containerId = "map-card-container",
  headingClass = "total-commanders-heading",
) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  // Remove existing heading if present
  const existing = container.parentNode.querySelector(`.${headingClass}`);
  if (existing) existing.remove();

  // Add heading
  const heading = document.createElement("h3");
  heading.innerHTML = `
    Minimum Games: 20 | Winrate Gap: 0.05 | Mirror Matchups Removed
  `;
  heading.classList.add(headingClass);
  container.parentNode.insertBefore(heading, container);

  // Sort maps by totalGames descending
  Object.entries(maps)
    .sort((a, b) => b[1].totalGames - a[1].totalGames)
    .forEach(([name, map]) => {
      container.appendChild(createCard(name, map));
    });
}

async function initMaps() {
  try {
    const response = await fetch(CONFIG.jsonFile);
    if (!response.ok) throw new Error("Failed to load JSON file");

    const data = await response.json();
    const totalMaps = data?.processed_data?.processed_faction_favorite_maps;

    if (!totalMaps) {
      console.error("No map data found in JSON");
      return;
    }

    renderCardsFromData(totalMaps);
  } catch (err) {
    console.error(err);
  }
}

initMaps();
