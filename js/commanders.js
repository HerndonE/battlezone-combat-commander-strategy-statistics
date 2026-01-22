import { CONFIG } from "./config.js";

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

// Load and Parse Data
async function loadData() {
  try {
    const response = await fetch(CONFIG.jsonFile);
    if (!response.ok) throw new Error("Failed to load JSON file");

    const data = await response.json();

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

  const winRate = ((c.wins / c.games) * 100).toFixed(1);

  // Determine activity status
  const { label: status, class: statusClass } = getActivityStatus(c);
  div.classList.add(statusClass); // for full card styling

  div.innerHTML = `
  <div class="status ${statusClass}">${status}</div>
  <div class="name">${c.name}</div>

  <div class="stat"><span class="label">Games:</span> ${c.games}</div>
  <div class="stat"><span class="label">Wins:</span> ${c.wins}</div>
  <div class="stat"><span class="label">Win Rate:</span> ${winRate}%</div>
  <div class="stat"><span class="label">Last Commanded:</span> ${
    c.lastActive ? c.lastActive.toLocaleDateString() : "Never"
  }</div>

  <div class="section-title">Most Played Faction</div>
  <div class="stat">${renderFactionWithIcon(topKey(c.factions))}</div>

  <div class="section-title">Most Played Map</div>
  <div class="stat">${topKey(c.maps)}</div>

  <div class="section-title">Top Opponent</div>
  <div class="stat">${topKey(c.opponents)}</div>

`;
  console.log(topKey(c.factions));
  return div;
}

function renderCards() {
  const container = document.getElementById("card-container");
  container.innerHTML = "";

  // Optional: sort by last active (most recent first)
  Object.values(commanders)
    .sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0))
    .forEach((c) => {
      container.appendChild(createCard(c));
    });
}
