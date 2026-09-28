import {
  loadTournamentData,
  findTournaments,
  eachGame,
  computeStandings,
  computeTotals,
} from "./data.js";
import { renderOverview } from "./overview.js";
import { renderStandings } from "./standings.js";
import { initMatches, renderMatches } from "./matches.js";
import { renderMobile } from "./mobileStats.js";

let tournaments = [];
let activeId = null;

function showTournament(id) {
  const tournament = tournaments.find((t) => t.id === id) || tournaments[0];
  if (!tournament) return;

  activeId = tournament.id;

  const games = eachGame(tournament);
  const totals = computeTotals(tournament, games);
  const standings = computeStandings(tournament, games);

  const title = document.getElementById("trn-title");
  if (title) title.textContent = tournament.name;

  renderOverview(tournament, games, totals);
  renderStandings(standings);
  renderMatches(tournament, games, totals);
}

function buildSelector() {
  const select = document.getElementById("trn-select");
  if (!select) return;

  select.innerHTML = tournaments
    .map((t) => `<option value="${t.id}">${t.name}</option>`)
    .join("");

  // A single tournament needs no picker.
  const picker = document.getElementById("trn-picker");
  if (picker) picker.style.display = tournaments.length > 1 ? "" : "none";

  select.addEventListener("change", () => showTournament(select.value));
}

// Charts are drawn at a width picked for the viewport, so a rotation or window
// resize needs them redrawn at the new size.
function watchResize() {
  let timer = null;
  let lastWidth = window.innerWidth;

  window.addEventListener("resize", () => {
    // Mobile browsers fire resize when the address bar hides; width is what
    // matters here, so ignore height-only changes.
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;

    clearTimeout(timer);
    timer = setTimeout(() => {
      if (activeId) showTournament(activeId);
    }, 200);
  });
}

function showError(message) {
  const root = document.getElementById("trn-root");
  if (!root) return;
  root.innerHTML = `<p class="trn-error">${message}</p>`;
}

async function init() {
  if (!document.getElementById("trn-root")) return;

  try {
    const json = await loadTournamentData();
    tournaments = findTournaments(json);

    if (!tournaments.length) {
      showError("No tournament data found.");
      return;
    }

    const updated = document.getElementById("last-updated");
    if (updated && json.last_updated) {
      updated.textContent = "Last Updated: " + json.last_updated;
    }

    buildSelector();
    initMatches();
    showTournament(tournaments[0].id);

    // The mobile tree lists every tournament at once, so it is built once.
    renderMobile(tournaments);

    watchResize();
  } catch (err) {
    console.error(err);
    showError("Failed to load tournament data.");
  }
}

init();
