import { CONFIG, FACTIONICONS, FACTION_COLORS, MODE } from "../config.js";

function formatPercent(value) {
  return (value * 100).toFixed(1) + "%";
}

// Same faction order on every card: the order factions are listed in
// FACTION_COLORS (config.js). Any unknown faction goes last, A-Z.
const FACTION_ORDER = Object.keys(FACTION_COLORS);
function factionRank(name) {
  const i = FACTION_ORDER.indexOf(name);
  return i === -1 ? FACTION_ORDER.length : i;
}
function sortFactions(factions) {
  return Object.entries(factions).sort(
    ([a], [b]) => factionRank(a) - factionRank(b) || a.localeCompare(b),
  );
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

const MAP_LIST_FILE = "../data/maplist.json";

// Map name (lowercase) -> preview image URL, from data/maplist.json.
async function loadMapImages() {
  try {
    const response = await fetch(MAP_LIST_FILE);
    if (!response.ok) throw new Error("Failed to load map list");
    const list = await response.json();
    return new Map(
      list
        .filter((m) => m.Name && m.Image)
        .map((m) => [m.Name.trim().toLowerCase(), m.Image]),
    );
  } catch (err) {
    console.error(err);
    return new Map(); // cards still render, just without images
  }
}

// Loads one image off-page. Resolves with the <img> once it has loaded,
// rejects if the URL is missing or the image fails.
function preloadImage(url, alt) {
  return new Promise((resolve, reject) => {
    if (!url) return reject(new Error(`No image for ${alt}`));
    const img = new Image();
    img.className = "map-image";
    img.alt = alt;
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Image failed: ${url}`));
    img.src = url;
  });
}

// All or nothing: images are only added once every card's image has loaded.
// If any one is missing or fails, no card gets an image, so the cards stay
// uniform and no broken-image icons appear.
async function addMapImages(cards) {
  try {
    const imgs = await Promise.all(
      cards.map(({ name, url }) => preloadImage(url, `${name} map preview`)),
    );
    imgs.forEach((img, i) => cards[i].card.prepend(img));
  } catch (err) {
    console.warn("Map images skipped:", err.message);
  }
}

function createCard(mapName, map) {
  const div = document.createElement("div");
  // Every listed map has passed the 20-game minimum, so all get the glow.
  div.className = "card active";

  div.innerHTML = `
    <div class="name">${mapName}</div>

    <div class="stat"><span class="label">Author:</span> ${map.author}</div>
    <div class="stat"><span class="label">Total Games:</span> ${map.totalGames}</div>
    <div class="stat"><span class="label">Base to Base:</span> ${map.basetoBase}</div>
    <div class="stat"><span class="label">Map Size:</span> ${map.mapSize}</div>
    <div class="stat"><span class="label">Pools:</span> ${map.pools}</div>

    <div class="section-title">Factions</div>
    ${sortFactions(map.factions)
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
  mapImages = new Map(),
  containerId = "map-card-container",
  headingClass = "total-commanders-heading",
) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  // Remove existing heading/description if present
  container.parentNode
    .querySelectorAll(`.${headingClass}, .maps-description`)
    .forEach((el) => el.remove());

  // Add heading
  const heading = document.createElement("h3");
  heading.textContent =
    "Minimum Games: 20 | Win Rate Gap: 5% | Mirror Matchups Removed";
  heading.classList.add(headingClass);
  container.parentNode.insertBefore(heading, container);

  // Plain-language explanation of the heading (values match
  // get_faction_map_win_chance in scripts/combine_json.py).
  const description = document.createElement("p");
  description.className = "maps-description";
  description.innerHTML = `
    This shows which faction tends to win on each map.
  `;
  container.parentNode.insertBefore(description, container);

  // Sort maps by totalGames descending
  const cards = Object.entries(maps)
    .sort((a, b) => b[1].totalGames - a[1].totalGames)
    .map(([name, map]) => {
      const card = createCard(name, map);
      container.appendChild(card);
      return { card, name, url: mapImages.get(name.trim().toLowerCase()) };
    });

  if (cards.length) addMapImages(cards);
}

async function initMaps() {
  try {
    const [response, mapImages] = await Promise.all([
      fetch(CONFIG.jsonFile),
      loadMapImages(),
    ]);
    if (!response.ok) throw new Error("Failed to load JSON file");

    const data = await response.json();
    const totalMaps =
      data?.[MODE]?.processed_data?.processed_faction_favorite_maps;

    if (!totalMaps) {
      console.error("No map data found in JSON");
      return;
    }

    renderCardsFromData(totalMaps, mapImages);
  } catch (err) {
    console.error(err);
  }
}

initMaps();
