import { splitTeams } from "./data.js";
import { colorFactions, dateValue } from "./format.js";

let currentGames = [];
let currentTournament = null;

function matchesSearch(game, query) {
  if (!query) return true;
  const haystack = [
    game.map,
    game.teams,
    game.factions,
    game.winner,
    game.day,
    game.round,
    game.commanderOne,
    game.commanderTwo,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function visibleGames() {
  const searchEl = document.getElementById("trn-search");
  const teamEl = document.getElementById("trn-team-filter");
  const sortEl = document.getElementById("trn-sort-order");

  const query = searchEl ? searchEl.value.trim().toLowerCase() : "";
  const team = teamEl ? teamEl.value : "";
  const desc = sortEl ? sortEl.value === "desc" : false;

  const rows = currentGames.filter(
    (game) =>
      matchesSearch(game, query) &&
      (team === "" || splitTeams(game).includes(team)),
  );

  return rows.sort((a, b) => {
    const diff = dateValue(a.day) - dateValue(b.day);
    // Games share a date, so fall back to the order they appear in the data.
    return (diff || a.seq - b.seq) * (desc ? -1 : 1);
  });
}

// Mark the winning side of a "A vs B" pairing.
function highlightWinner(game) {
  const teams = splitTeams(game);
  if (teams.length !== 2) return game.teams || "";
  return teams
    .map((team) =>
      team === game.winner
        ? `<span class="trn-winner">${team}</span>`
        : `<span class="trn-loser">${team}</span>`,
    )
    .join(" vs ");
}

function row(game) {
  return `
    <tr>
      <td>${game.day}</td>
      <td>${game.round ? `G${game.round}` : "&mdash;"}</td>
      <td>${game.map || ""}</td>
      <td>${highlightWinner(game)}</td>
      <td>${colorFactions(game.factions)}</td>
      <td class="trn-col-team">${game.winner || ""}</td>
      <td>${game.commanderOne || ""} vs ${game.commanderTwo || ""}</td>
      <td>${game.time || ""}</td>
    </tr>`;
}

function renderTable() {
  const body = document.getElementById("trn-match-body");
  const count = document.getElementById("trn-match-count");
  if (!body) return;

  const rows = visibleGames();

  body.innerHTML = rows.length
    ? rows.map(row).join("")
    : '<tr><td colspan="8" class="trn-muted">No games match those filters.</td></tr>';

  if (count) {
    count.textContent = `${rows.length} of ${currentGames.length} game${
      currentGames.length === 1 ? "" : "s"
    }`;
  }
}

function loadTeamFilter(tournament) {
  const teamEl = document.getElementById("trn-team-filter");
  if (!teamEl) return;

  const teams = Object.keys(tournament.teams || {}).sort();
  teamEl.innerHTML =
    '<option value="">All teams</option>' +
    teams.map((t) => `<option value="${t}">${t}</option>`).join("");
  teamEl.disabled = teams.length === 0;
}

function exportToExcel() {
  if (typeof XLSX === "undefined") {
    console.error("XLSX library not loaded");
    return;
  }

  const headers = [
    "Date",
    "Game",
    "Map",
    "Teams",
    "Factions",
    "Winner",
    "Commander (Team One)",
    "Commander (Team Two)",
    "Time",
  ];

  const dataRows = visibleGames().map((game) => [
    game.day,
    game.round,
    game.map,
    game.teams,
    game.factions,
    game.winner,
    game.commanderOne,
    game.commanderTwo,
    game.time,
  ]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
  ws["!cols"] = headers.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, ws, "Tournament");

  const name = currentTournament ? currentTournament.id : "tournament";
  XLSX.writeFile(wb, `${name}.xlsx`);
}

export function initMatches() {
  const search = document.getElementById("trn-search");
  const team = document.getElementById("trn-team-filter");
  const sort = document.getElementById("trn-sort-order");
  const exportBtn = document.getElementById("trn-export-btn");

  if (search) search.addEventListener("input", renderTable);
  if (team) team.addEventListener("change", renderTable);
  if (sort) sort.addEventListener("change", renderTable);
  if (exportBtn) exportBtn.addEventListener("click", exportToExcel);
}

export function renderMatches(tournament, games, totals) {
  // A redraw at a new window size re-renders the same tournament, so only
  // clear the filters when the tournament itself changes.
  const switched = !currentTournament || currentTournament.id !== tournament.id;

  currentTournament = tournament;
  currentGames = games;

  if (switched) {
    const search = document.getElementById("trn-search");
    if (search) search.value = "";
    loadTeamFilter(tournament);
  }

  renderTable();
}
