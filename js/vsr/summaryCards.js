// Summary stat cards for a VSR year tab (games, time stats, longest and
// shortest match), styled by css/summary-cards.css.

export function statCard(label, value, sub) {
  return `
    <div class="summary-card">
      <span class="summary-card-value">${value}</span>
      <span class="summary-card-label">${label}</span>
      ${sub ? `<span class="summary-card-sub">${sub}</span>` : ""}
    </div>`;
}

function describeMatch(details) {
  return [details.commanders, details.map, details.date]
    .filter(Boolean)
    .join(" &middot; ");
}

// gameTotals: data.game_totals (last entry holds days/games totals)
// gameTimes:  data.game_times, or null when a year has no recorded times
export function renderYearSummary(container, gameTotals, gameTimes) {
  const el = document.querySelector(container);
  if (!el) return;

  const totals = gameTotals[gameTotals.length - 1] || [];
  const totalDays = totals[0]?.["Total Days Played"];
  const totalGames = totals[1]?.["Total Games Played"];

  const [timeStats = [], mode = [], matchTimes = []] = gameTimes || [];
  const stat = Object.fromEntries(timeStats); // Total Time, Mean, Median, Range

  const shortestTime = matchTimes[1] ? matchTimes[0]?.[1] : null;
  const shortest = matchTimes[1]?.[0] || {};
  const longestTime = matchTimes[3] ? matchTimes[2]?.[1] : null;
  const longest = matchTimes[3]?.[0] || {};

  const averageSub = [
    stat.Median ? `Median ${stat.Median}` : null,
    mode[1] ? `Mode ${mode[1]}` : null,
  ]
    .filter(Boolean)
    .join(" &middot; ");

  const cards = [
    totalGames != null &&
      statCard(
        "Games",
        totalGames,
        totalDays != null ? `${totalDays} play days` : "",
      ),
    stat["Total Time"] && statCard("Total Time", stat["Total Time"], ""),
    stat.Mean && statCard("Average Game", stat.Mean, averageSub),
    longestTime &&
      statCard("Longest Game", longestTime, describeMatch(longest)),
    shortestTime &&
      statCard("Shortest Game", shortestTime, describeMatch(shortest)),
  ].filter(Boolean);

  el.classList.add("summary-cards");
  el.innerHTML = cards.join("");
}

// ---- All-years overview ---------------------------------------------------

function toSeconds(time) {
  if (!time || time === "NA") return 0;
  const parts = String(time).split(":").map(Number);
  if (parts.some(Number.isNaN)) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

// Same style as data.json: M:SS under an hour, otherwise H:MM:SS.
function formatSeconds(total) {
  const s = Math.round(total);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

// vsrData: rawData.vsr. Uses every year key (2024, 2025, ...) so new years
// are picked up automatically.
export function renderOverviewSummary(container, vsrData) {
  const el = document.querySelector(container);
  if (!el) return;

  const years = Object.keys(vsrData)
    .filter((key) => /^\d{4}$/.test(key))
    .sort();

  let totalGames = 0;
  let totalDays = 0;
  const timed = [];

  for (const year of years) {
    const totals = vsrData[year]?.[`data_${year}`]?.game_totals || [];
    const last = totals[totals.length - 1] || [];
    totalDays += last[0]?.["Total Days Played"] || 0;
    totalGames += last[1]?.["Total Games Played"] || 0;

    const months = vsrData[year]?.[`raw_${year}`]?.month || {};
    for (const days of Object.values(months)) {
      for (const games of Object.values(days)) {
        for (const game of Object.values(games)) {
          const secs = toSeconds(game.time);
          if (secs > 0) timed.push({ secs, game });
        }
      }
    }
  }

  const span =
    years.length > 1 ? `${years[0]}–${years[years.length - 1]}` : years[0];
  const cards = [
    statCard(
      "Games",
      totalGames.toLocaleString(),
      `${totalDays.toLocaleString()} play days &middot; ${span}`,
    ),
  ];

  if (timed.length) {
    timed.sort((a, b) => a.secs - b.secs);
    const sum = timed.reduce((acc, t) => acc + t.secs, 0);
    const mid = Math.floor(timed.length / 2);
    const median =
      timed.length % 2
        ? timed[mid].secs
        : (timed[mid - 1].secs + timed[mid].secs) / 2;
    const shortest = timed[0];
    const longest = timed[timed.length - 1];

    cards.push(
      statCard(
        "Total Time",
        formatSeconds(sum),
        `${timed.length.toLocaleString()} timed games`,
      ),
      statCard(
        "Average Game",
        formatSeconds(sum / timed.length),
        `Median ${formatSeconds(median)}`,
      ),
      statCard(
        "Longest Game",
        longest.game.time,
        describeMatch(longest.game),
      ),
      statCard(
        "Shortest Game",
        shortest.game.time,
        describeMatch(shortest.game),
      ),
    );
  }

  el.classList.add("summary-cards");
  el.innerHTML = cards.join("");
}
