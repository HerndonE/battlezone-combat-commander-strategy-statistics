import { CONFIG } from "../config.js";
import {
  averageTime,
  bump,
  buildQuarterRange,
  cleanRoster,
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
 * Players tab: one card per player; "View Profile" opens the shared profile
 * modal (profileModal.js).
 *
 * Per-match stats come from the team rosters (teamOne plays for the first
 * commander, teamTwo for the second), the same rosters the Python pipeline
 * uses for player time. Matches without rosters, stragglers and late joiners
 * are not counted. Time on Record, Status and Last Played come from
 * processed_player_times.
 * ========================================================================== */

const players = {};
let quarterKeys = [];
let totalPlayersText = null;

function ensurePlayer(name) {
  if (!players[name]) {
    players[name] = {
      name,
      games: 0,
      wins: 0,
      factions: {},
      commanders: {}, // commander played under -> { games, wins }
      teammates: {},
      opponents: {},
      maps: {},
      quarters: {},
      matches: [],
      totalTime: "N/A",
      status: null,
      lastPlayed: null,
    };
  }
  return players[name];
}


function addSide(roster, enemies, ctx) {
  roster.forEach((name) => {
    const p = ensurePlayer(name);
    const { won, faction, commander, enemyCommander, match, date } = ctx;
    p.games++;
    if (won) p.wins++;
    bump(p.factions, faction, won);
    bump(p.commanders, commander, won);
    bump(p.maps, match.map, won);
    bump(p.quarters, quarterKeyOf(date), won);
    roster.forEach((m) => m !== name && bump(p.teammates, m, won));
    enemies.forEach((m) => bump(p.opponents, m, won));
    p.matches.push({
      date,
      map: match.map,
      commander,
      enemyCommander,
      faction,
      won,
      time: match.time || "",
      teammates: roster.filter((m) => m !== name),
      opponents: enemies,
    });
  });
}

function processMatch(match) {
  const teamOne = cleanRoster(match.teamOne);
  const teamTwo = cleanRoster(match.teamTwo);
  if (!teamOne.length && !teamTwo.length) return;

  const { cmdA, cmdB, facA, facB, aWon } = splitMatch(match);
  const date = parseDate(match.date);
  addSide(teamOne, teamTwo, {
    won: aWon, faction: facA, commander: cmdA, enemyCommander: cmdB, match, date,
  });
  addSide(teamTwo, teamOne, {
    won: !aWon, faction: facB, commander: cmdB, enemyCommander: cmdA, match, date,
  });
}

function mergePlayerTimes(playerTimes) {
  playerTimes.forEach((entry) => {
    const p = entry[0];
    if (!p || typeof p !== "object" || !p.Player) return;
    const player = ensurePlayer(p.Player);
    player.totalTime = p["Total Time"] || "N/A";
    player.status = p.Status || null;
    player.lastPlayed = parseDate(p["Last Played"]);
  });
}

async function loadData() {
  try {
    const response = await fetch(CONFIG.jsonFile);
    if (!response.ok) throw new Error("Failed to load JSON file");
    const data = await response.json();

    const playerTimes = data["vsr"]["processed_data"]["processed_player_times"];
    const lastEntry = playerTimes[playerTimes.length - 1];
    if (Array.isArray(lastEntry) && typeof lastEntry[0] === "string") {
      totalPlayersText = lastEntry[0];
    }
    mergePlayerTimes(playerTimes);

    forEachMatch(data, processMatch);
    Object.values(players).forEach((p) => {
      p.matches.sort((a, b) => a.date - b.date);
      p.averageTime = averageTime(p.matches);
      p.firstYear = p.matches.length ? p.matches[0].date.getFullYear() : "N/A";
      const last = p.matches[p.matches.length - 1]?.date || null;
      if (!p.lastPlayed || (last && last > p.lastPlayed)) p.lastPlayed = last;
    });
    quarterKeys = buildQuarterRange(Object.values(players));
    renderCards();
  } catch (err) {
    console.error(err);
  }
}

loadData();

// Status from the pipeline (Active ≤3 months, Semi-Active ≤9); fall back to
// the same thresholds when a player is missing from processed data.
function getStatus(p) {
  let label = p.status;
  if (!label) {
    if (!p.lastPlayed) label = "Inactive";
    else {
      const now = new Date();
      const months =
        (now.getFullYear() - p.lastPlayed.getFullYear()) * 12 +
        (now.getMonth() - p.lastPlayed.getMonth());
      label = months <= 3 ? "Active" : months <= 9 ? "Semi-Active" : "Inactive";
    }
  }
  const lower = label.toLowerCase();
  const cls =
    lower === "active" ? "active" : lower === "semi-active" ? "semi-active" : "inactive";
  return { label, class: cls };
}

// ----------------------------------------------------------------------- Cards
function createCard(p) {
  const div = document.createElement("div");
  div.className = "card";

  const status = getStatus(p);
  div.classList.add(status.class);

  div.innerHTML = `
    <div class="status ${status.class}">${esc(status.label)}</div>
    <div class="name">${esc(p.name)}</div>

    <div class="stat"><span class="label">Games:</span> ${p.games}</div>
    <div class="stat"><span class="label">Wins:</span> ${p.wins}</div>
    <div class="stat"><span class="label">Win Rate:</span> ${pct(p.wins, p.games)}%</div>

    <div class="stat"><span class="label">Time on Record:</span> ${esc(p.totalTime)}</div>
    <div class="stat"><span class="label">Average Time:</span> ${esc(p.averageTime)}</div>
    <div class="stat"><span class="label">First Year on Record:</span> ${esc(p.firstYear)}</div>
    <div class="stat"><span class="label">Last Played:</span> ${fmtDate(p.lastPlayed)}</div>

    <div class="section-title">Most Played Faction</div>
    <div class="stat">${renderFaction(topRow(p.factions))}</div>

    <button type="button" class="card-details-btn">View Profile</button>
  `;

  div.addEventListener("click", () => openProfile(playerProfileConfig(p.name)));
  return div;
}

function renderCards() {
  const container = document.getElementById("player-card-container");
  if (!container) return;
  container.innerHTML = "";

  // Count the cards shown: the pipeline's total skips players whose only
  // games have no recorded time.
  if (totalPlayersText) {
    const heading = document.createElement("h3");
    heading.textContent = `Total Players: ${Object.keys(players).length}`;
    heading.classList.add("total-players-heading");
    container.parentNode.insertBefore(heading, container);
  }

  Object.values(players)
    .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0))
    .forEach((p) => container.appendChild(createCard(p)));
}

// --------------------------------------------------------------------- Profile
function playerProfileConfig(name) {
  const p = players[name];
  const status = getStatus(p);
  const faction = topRow(p.factions);
  const map = topRow(p.maps);
  const topCmds = topRows(p.commanders);
  const topMates = topRows(p.teammates);
  const record = (r) => (r ? `${r.name} (${r.games})` : "None");
  const list = (rows) =>
    rows.length ? rows.map((r) => `${esc(r.name)} (${r.games})`).join(", ") : "None";
  const wl = (r) => (r ? `${r.wins}–${r.games - r.wins}` : "0–0");

  return {
    entity: p,
    all: players,
    kindSingular: "player",
    kindPlural: "players",
    filePrefix: "player",
    status,
    quarterKeys,
    tiles: [
      { label: "Games", value: p.games },
      { label: "Wins", value: p.wins, sub: `${p.games - p.wins} losses` },
      { label: "Win Rate", value: `${pct(p.wins, p.games)}%` },
      { label: "Time on Record", value: esc(p.totalTime) },
      { label: "Average Time", value: esc(p.averageTime) },
      { label: "First Year on Record", value: esc(p.firstYear) },
      { label: "Last Played", value: fmtDate(p.lastPlayed) },
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
      { label: "Top Commanders", value: list(topCmds), sub: "Played under", wide: true },
      { label: "Top Teammates", value: list(topMates), wide: true },
    ],
    lists: [
      { key: "factions", title: "Factions Played", itemLabel: "Faction", icons: true, sortable: false },
      { key: "commanders", title: "Commanders Played Under", itemLabel: "Commander", topN: 3, discord: true },
      { key: "teammates", title: "Teammates", itemLabel: "Teammate", topN: 3, discord: true },
      {
        key: "opponents",
        title: "Opponents",
        itemLabel: "Opponent",
        topN: 3,
        discord: true,
        note: `${name}'s team record in games where this player was on the other team.`,
      },
      { key: "maps", title: "Maps Played", itemLabel: "Map", discord: true },
    ],
    compareColumns: [
      { label: "Time on Record", value: (o) => o.totalTime },
      { label: "Last Played", value: (o) => fmtDate(o.lastPlayed) },
      { label: `With ${p.name}`, relative: true, value: (o, main) => wl(main.teammates[o.name]) },
      { label: `${p.name} vs`, relative: true, value: (o, main) => wl(main.opponents[o.name]) },
    ],
    summaryRows: [
      ["Player", p.name],
      ["Status", status.label],
      ["Games", p.games],
      ["Wins", p.wins],
      ["Losses", p.games - p.wins],
      ["Win Rate", `${pct(p.wins, p.games)}%`],
      ["Time on Record", p.totalTime],
      ["Average Time", p.averageTime],
      ["First Year on Record", p.firstYear],
      ["Last Played", fmtDate(p.lastPlayed)],
      ["Most Played Faction", record(faction)],
      ["Most Played Map", record(map)],
      ["Top Commanders", topCmds.map(record).join(", ") || "None"],
      ["Top Teammates", topMates.map(record).join(", ") || "None"],
    ],
    matchSheet: {
      headers: ["Date", "Map", "Commander", "Enemy Commander", "Faction", "Result", "Time", "Teammates", "Opponents"],
      rows: p.matches.map((m) => [
        fmtDate(m.date),
        m.map,
        m.commander,
        m.enemyCommander,
        m.faction,
        m.won ? "Win" : "Loss",
        m.time,
        m.teammates.join(", "),
        m.opponents.join(", "),
      ]),
    },
    discordLines: [
      `Games ${p.games} | W-L ${p.wins}-${p.games - p.wins} | Win rate ${pct(p.wins, p.games)}%`,
      `Time on record ${p.totalTime} | Avg ${p.averageTime}`,
      `First year ${p.firstYear} | Last played ${fmtDate(p.lastPlayed)}`,
      `Most played faction: ${record(faction)}`,
      `Most played map: ${record(map)}`,
    ],
  };
}
