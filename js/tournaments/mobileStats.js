import {
  eachGame,
  computeStandings,
  computeTotals,
  computeSeries,
} from "./data.js";

// Mirrors the VSR mobile view: a category per tournament, each holding
// collapsible card sections. The markup is built here rather than written into
// the page, so a new tournament needs no HTML.

function createCard(title, value, items = []) {
  const card = document.createElement("div");
  card.className = "stat-card";

  const titleEl = document.createElement("div");
  titleEl.className = "stat-title";
  titleEl.innerHTML = title;
  card.appendChild(titleEl);

  const valueEl = document.createElement("div");
  valueEl.className = "stat-value";
  valueEl.innerHTML = value;
  card.appendChild(valueEl);

  addBreakdown(card, items);

  return card;
}

// Each call adds its own row, so groups of items never share a line.
function addBreakdown(card, items, extraClass = "") {
  if (!items || !items.length) return;

  const breakdown = document.createElement("div");
  breakdown.className = `faction-breakdown ${extraClass}`.trim();

  for (const item of items) {
    const el = document.createElement("div");
    el.className = "faction-item";
    el.innerHTML = item;
    breakdown.appendChild(el);
  }

  card.appendChild(breakdown);
}

function addSection(category, label, cards, extraClass = "") {
  const wrapper = document.createElement("div");
  wrapper.className = "sub-category";

  const button = document.createElement("button");
  button.className = "dropdown-btn";
  button.textContent = `${label} ▼`;
  wrapper.appendChild(button);

  const container = document.createElement("div");
  container.className = `cards dropdown-content ${extraClass}`.trim();
  for (const card of cards) container.appendChild(card);
  wrapper.appendChild(container);

  category.appendChild(wrapper);
}

function countCards(entries) {
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => createCard(name, value));
}

function summaryCards(tournament, totals) {
  const times = tournament.game_times || {};
  const period = totals.months.length
    ? `${totals.months.join(", ")} ${tournament.year || ""}`.trim()
    : tournament.year || "";

  return [
    createCard("Games", totals.games, period ? [period] : []),
    createCard("Teams", totals.teams),
    createCard("Matches", totals.matches),
    createCard("Play Days", totals.days),
    createCard("Average Game", times.average_time || "&mdash;"),
    createCard(
      "Longest Game",
      times.longest_time ? times.longest_time.time : "&mdash;",
      times.longest_time ? [times.longest_time.data.map] : [],
    ),
    createCard(
      "Shortest Game",
      times.shortest_time ? times.shortest_time.time : "&mdash;",
      times.shortest_time ? [times.shortest_time.data.map] : [],
    ),
  ];
}

// The roster goes in as one item, not a pill per player: separate pills wrap
// onto their own lines as soon as the card is narrow.
function addRoster(card, roster) {
  if (!roster || !roster.length) return;
  addBreakdown(card, [roster.join(", ")], "trn-m-roster");
}

function standingsCards(standings) {
  let rank = 0;

  return standings.map((entry) => {
    if (entry.games === 0) {
      const card = createCard(entry.team, "did not play");
      addRoster(card, entry.roster);
      card.classList.add("trn-m-card-inactive");
      return card;
    }

    const place = ++rank;
    const pct = (entry.winRate * 100).toFixed(0);

    const card = createCard(
      `<span class="trn-m-rank">${place}.</span> ${entry.team}`,
      `${entry.points} pt${entry.points === 1 ? "" : "s"}`,
      [
        `Matches ${entry.matchWins}&ndash;${entry.matchLosses}`,
        `Games ${entry.wins}&ndash;${entry.losses}`,
        `${pct}% games`,
      ],
    );

    // Players sit on their own row, clear of the record.
    addRoster(card, entry.roster);
    return card;
  });
}

function matchCards(series) {
  return series.map((match) =>
    createCard(
      match.label,
      match.winner
        ? `<span class="trn-m-winner">${match.winner}</span> ${match.scoreline}`
        : match.scoreline,
      [match.day, ...match.games.map((game) => game.map)],
    ),
  );
}

function buildCategory(tournament) {
  const games = eachGame(tournament);
  const totals = computeTotals(tournament, games);
  const standings = computeStandings(tournament, games);
  const series = computeSeries(games);

  const category = document.createElement("div");
  category.className = "category";

  const heading = document.createElement("h3");
  heading.textContent = tournament.name;
  category.appendChild(heading);

  addSection(
    category,
    "Summary",
    summaryCards(tournament, totals),
    "trn-m-summary",
  );
  addSection(category, "Standings", standingsCards(standings));
  addSection(category, "Matches", matchCards(series));
  addSection(
    category,
    "Faction Popularity",
    countCards(Object.entries(tournament.faction_counts || {})),
  );
  addSection(
    category,
    "Most Played Maps",
    countCards((tournament.most_played_maps || []).map(([m, c]) => [m, c])),
  );
  addSection(
    category,
    "Faction Matchups",
    countCards(Object.entries(tournament.popular_matchups || {})),
  );

  return category;
}

function bindDropdowns(root) {
  root.querySelectorAll(".dropdown-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const content = btn.nextElementSibling;
      content.classList.toggle("show");
      btn.textContent = content.classList.contains("show")
        ? btn.textContent.replace("▼", "▲")
        : btn.textContent.replace("▲", "▼");
    });
  });
}

export function renderMobile(tournaments) {
  const root = document.getElementById("trn-mobile-root");
  if (!root) return;

  root.innerHTML = "";
  for (const tournament of tournaments) {
    root.appendChild(buildCategory(tournament));
  }

  bindDropdowns(root);
}
