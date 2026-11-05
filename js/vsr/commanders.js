import { CONFIG } from "../config.js";
import {
  bump,
  buildQuarterRange,
  esc,
  fmtDate,
  forEachMatch,
  openProfile,
  parseDate,
  pct,
  quarterKeyOf,
  renderFaction,
  splitMatch,
  topRow,
  topRows,
} from "./profileModal.js";

/* ==========================================================================
 * Commanders tab: one card per commander; "View Profile" opens the shared
 * profile modal (profileModal.js).
 * ========================================================================== */

const commanders = {};
let quarterKeys = [];
let totalCommandersText = null;

function ensureCommander(name) {
  if (!commanders[name]) {
    commanders[name] = {
      name,
      games: 0,
      wins: 0,
      factions: {}, // faction -> { games, wins }
      opponents: {}, // opponent -> { games, wins }
      maps: {}, // map -> { games, wins }
      quarters: {}, // quarterKey -> { games, wins }
      matches: [],
      lastActive: null,
    };
  }
  return commanders[name];
}

function addStats(name, { faction, oppFaction, opponent, won, match, date }) {
  const c = ensureCommander(name);
  c.games++;
  if (won) c.wins++;
  bump(c.factions, faction, won);
  bump(c.opponents, opponent, won);
  bump(c.maps, match.map, won);
  bump(c.quarters, quarterKeyOf(date), won);
  if (!c.lastActive || date > c.lastActive) c.lastActive = date;
  c.matches.push({
    date,
    map: match.map,
    opponent,
    faction,
    oppFaction,
    won,
    time: match.time || "",
  });
}

function processMatch(match) {
  const { cmdA, cmdB, facA, facB, aWon } = splitMatch(match);
  const date = parseDate(match.date);
  addStats(cmdA, { faction: facA, oppFaction: facB, opponent: cmdB, won: aWon, match, date });
  addStats(cmdB, { faction: facB, oppFaction: facA, opponent: cmdA, won: !aWon, match, date });
}

function mergeCommanderTimes(commanderTimes) {
  commanderTimes.forEach((entryArray) => {
    const entry = entryArray[0];
    if (typeof entry !== "object" || !entry.Commander) return;
    const c = ensureCommander(entry.Commander);
    c.totalTime = entry["Total Time"];
    c.averageTime = entry["Average Time"];
    c.firstYear = entry["First Year on Record"];
  });
}

async function loadData() {
  try {
    const response = await fetch(CONFIG.jsonFile);
    if (!response.ok) throw new Error("Failed to load JSON file");
    const data = await response.json();

    const totalCommanders =
      data["vsr"]["processed_data"]["processed_commander_times"];
    mergeCommanderTimes(totalCommanders);

    const lastEntry = totalCommanders[totalCommanders.length - 1];
    if (Array.isArray(lastEntry) && typeof lastEntry[0] === "string") {
      totalCommandersText = lastEntry[0];
    }

    forEachMatch(data, processMatch);
    Object.values(commanders).forEach((c) =>
      c.matches.sort((a, b) => a.date - b.date),
    );
    quarterKeys = buildQuarterRange(Object.values(commanders));
    renderCards();
  } catch (err) {
    console.error(err);
  }
}

loadData();

function getActivityStatus(commander) {
  if (!commander.lastActive) return { label: "Inactive", class: "inactive" };
  const now = new Date();
  const diffMonths =
    (now.getFullYear() - commander.lastActive.getFullYear()) * 12 +
    (now.getMonth() - commander.lastActive.getMonth());
  if (diffMonths < 3) return { label: "Active", class: "active" };
  if (diffMonths < 6) return { label: "Semi-Active", class: "semi-active" };
  return { label: "Inactive", class: "inactive" };
}

// ----------------------------------------------------------------------- Cards
function createCard(c) {
  const div = document.createElement("div");
  div.className = "card";

  const { label: status, class: statusClass } = getActivityStatus(c);
  div.classList.add(statusClass);

  div.innerHTML = `
    <div class="status ${statusClass}">${status}</div>
    <div class="name">${esc(c.name)}</div>

    <div class="stat"><span class="label">Games:</span> ${c.games}</div>
    <div class="stat"><span class="label">Wins:</span> ${c.wins}</div>
    <div class="stat"><span class="label">Win Rate:</span> ${pct(c.wins, c.games)}%</div>

    <div class="stat"><span class="label">Recorded Time:</span> ${esc(c.totalTime || "N/A")}</div>
    <div class="stat"><span class="label">Average Time:</span> ${esc(c.averageTime || "N/A")}</div>
    <div class="stat"><span class="label">First Year on Record:</span> ${esc(c.firstYear || "N/A")}</div>
    <div class="stat"><span class="label">Last Commanded:</span> ${fmtDate(c.lastActive)}</div>

    <div class="section-title">Most Played Faction</div>
    <div class="stat">${renderFaction(topRow(c.factions))}</div>

    <button type="button" class="card-details-btn">View Profile</button>
  `;

  div.addEventListener("click", () => openCommanderProfile(c.name));
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

  Object.values(commanders)
    .sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0))
    .forEach((c) => container.appendChild(createCard(c)));
}

// --------------------------------------------------------------------- Profile
export function commanderProfileConfig(name) {
  const c = commanders[name];
  const faction = topRow(c.factions);
  const map = topRow(c.maps);
  const tops = topRows(c.opponents);
  const status = getActivityStatus(c);
  const record = (r) => (r ? `${r.name} (${r.games})` : "None");

  return {
    entity: c,
    all: commanders,
    kindSingular: "commander",
    kindPlural: "commanders",
    filePrefix: "commander",
    status,
    quarterKeys,
    tiles: [
      { label: "Games", value: c.games },
      { label: "Wins", value: c.wins, sub: `${c.games - c.wins} losses` },
      { label: "Win Rate", value: `${pct(c.wins, c.games)}%` },
      { label: "Recorded Time", value: esc(c.totalTime || "N/A") },
      { label: "Average Time", value: esc(c.averageTime || "N/A") },
      { label: "First Year on Record", value: esc(c.firstYear || "N/A") },
      { label: "Last Commanded", value: fmtDate(c.lastActive) },
      {
        label: "Most Played Faction",
        value: renderFaction(faction, "cmd-faction"),
        sub: faction
          ? `${faction.wins}–${faction.losses} · ${pct(faction.wins, faction.games)}% win rate`
          : "",
        wide: true,
      },
      {
        label: "Most Played Map",
        value: map ? esc(map.name) : "None",
        sub: map ? `${map.games} games · ${map.wins}–${map.losses}` : "",
      },
      {
        label: "Top Opponents",
        value: tops.length
          ? tops.map((o) => `${esc(o.name)} (${o.games})`).join(", ")
          : "None",
        wide: true,
      },
    ],
    lists: [
      { key: "factions", title: "Factions Played", itemLabel: "Faction", icons: true, sortable: false },
      { key: "opponents", title: "Opponents", itemLabel: "Opponent", topN: 3, discord: true },
      { key: "maps", title: "Maps Played", itemLabel: "Map", discord: true },
    ],
    compareColumns: [
      { label: "Recorded Time", value: (o) => o.totalTime || "N/A" },
      { label: "Last Commanded", value: (o) => fmtDate(o.lastActive) },
      {
        label: `${c.name}'s record vs`,
        relative: true,
        value: (o, main) => {
          const r = main.opponents[o.name];
          return r ? `${r.wins}–${r.games - r.wins}` : "0–0";
        },
      },
    ],
    summaryRows: [
      ["Commander", c.name],
      ["Status", status.label],
      ["Games", c.games],
      ["Wins", c.wins],
      ["Losses", c.games - c.wins],
      ["Win Rate", `${pct(c.wins, c.games)}%`],
      ["Recorded Time", c.totalTime || "N/A"],
      ["Average Time", c.averageTime || "N/A"],
      ["First Year on Record", c.firstYear || "N/A"],
      ["Last Commanded", fmtDate(c.lastActive)],
      ["Most Played Faction", record(faction)],
      ["Most Played Map", record(map)],
      ["Top Opponents", tops.map(record).join(", ") || "None"],
    ],
    matchSheet: {
      headers: ["Date", "Map", "Opponent", "Faction", "Opponent Faction", "Result", "Time"],
      rows: c.matches.map((m) => [
        fmtDate(m.date),
        m.map,
        m.opponent,
        m.faction,
        m.oppFaction,
        m.won ? "Win" : "Loss",
        m.time,
      ]),
    },
    discordLines: [
      `Games ${c.games} | W-L ${c.wins}-${c.games - c.wins} | Win rate ${pct(c.wins, c.games)}%`,
      `Recorded ${c.totalTime || "N/A"} | Avg ${c.averageTime || "N/A"}`,
      `First year ${c.firstYear || "N/A"} | Last commanded ${fmtDate(c.lastActive)}`,
      `Most played faction: ${record(faction)}`,
      `Most played map: ${record(map)}`,
    ],
  };
}

function openCommanderProfile(name) {
  openProfile(commanderProfileConfig(name));
}
