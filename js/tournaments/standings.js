import { colorFactions } from "./format.js";

function winRateColor(rate) {
  if (rate >= 0.7) return "#28a745";
  if (rate >= 0.5) return "#ffc107";
  return "#dc3545";
}

function factionSummary(factions) {
  const entries = Object.entries(factions);
  if (!entries.length) return '<span class="trn-muted">&mdash;</span>';
  return colorFactions(
    entries.map(([faction, count]) => `${faction} (${count})`).join(", "),
  );
}

function commanderSummary(commanders) {
  const entries = Object.entries(commanders).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return '<span class="trn-muted">&mdash;</span>';
  return entries.map(([name, count]) => `${name} (${count})`).join(", ");
}

function row(entry, rank) {
  // A roster team that never played has no record to show.
  if (entry.games === 0) {
    return `
      <tr class="trn-row-inactive">
        <td class="trn-col-rank">&mdash;</td>
        <td class="trn-col-team">${entry.team}</td>
        <td class="trn-col-roster">${entry.roster.join(", ")}</td>
        <td class="trn-col-num trn-col-points">0</td>
        <td class="trn-col-num">0&ndash;0</td>
        <td class="trn-col-num">0&ndash;0</td>
        <td class="trn-col-rate"><span class="trn-muted">did not play</span></td>
        <td class="trn-col-wide"><span class="trn-muted">&mdash;</span></td>
        <td class="trn-col-wide"><span class="trn-muted">&mdash;</span></td>
      </tr>`;
  }

  const pct = (entry.winRate * 100).toFixed(0);
  const color = winRateColor(entry.winRate);

  return `
    <tr>
      <td class="trn-col-rank">${rank}</td>
      <td class="trn-col-team">${entry.team}</td>
      <td class="trn-col-roster">${entry.roster.join(", ")}</td>
      <td class="trn-col-num trn-col-points">${entry.points}</td>
      <td class="trn-col-num">${entry.matchWins}&ndash;${entry.matchLosses}</td>
      <td class="trn-col-num">${entry.wins}&ndash;${entry.losses}</td>
      <td class="trn-col-rate">
        <div class="trn-bar-wrap">
          <div class="trn-bar" style="width:${pct}%;background:${color}"></div>
        </div>
        <span class="trn-rate-label" style="color:${color}">${pct}%</span>
      </td>
      <td class="trn-col-wide">${factionSummary(entry.factions)}</td>
      <td class="trn-col-wide">${commanderSummary(entry.commanders)}</td>
    </tr>`;
}

export function renderStandings(standings) {
  const el = document.getElementById("trn-standings-body");
  if (!el) return;

  if (!standings.length) {
    el.innerHTML =
      '<tr><td colspan="9" class="trn-muted">No team data for this tournament.</td></tr>';
    return;
  }

  let rank = 0;
  el.innerHTML = standings
    .map((entry) => row(entry, entry.games > 0 ? ++rank : null))
    .join("");
}
