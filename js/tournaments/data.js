import { CONFIG } from "../config.js";

// data.json holds each tournament under its own top-level key, alongside the
// per-year VSR entries. A tournament is the only entry with both a "raw" month
// tree and a "teams" roster, so new tournaments are picked up without a list to
// maintain here.
const RESERVED_KEYS = new Set(["processed_data", "last_updated"]);

function isTournament(entry) {
  return (
    entry &&
    typeof entry === "object" &&
    typeof entry.raw === "object" &&
    typeof entry.teams === "object"
  );
}

// "BZCC-2025-Tournament" -> "BZCC 2025 Tournament"
function titleFromId(id) {
  return id.replace(/-/g, " ");
}

export function findTournaments(json) {
  return Object.keys(json)
    .filter((key) => !RESERVED_KEYS.has(key) && isTournament(json[key]))
    .map((id) => ({ id, name: titleFromId(id), ...json[id] }))
    .sort((a, b) => b.id.localeCompare(a.id));
}

// A day keys its games by map name, and that key holds either a single game or
// an array of them when the same map is played twice in one day. Flatten both.
export function eachGame(tournament) {
  const games = [];
  const months = tournament.raw || {};

  for (const monthName of Object.keys(months)) {
    const days = months[monthName];
    for (const dayKey of Object.keys(days)) {
      const entries = days[dayKey];
      for (const mapKey of Object.keys(entries)) {
        const entry = entries[mapKey];
        const list = Array.isArray(entry) ? entry : [entry];
        for (const game of list) {
          if (!game || typeof game !== "object") continue;
          games.push({
            ...game,
            month: monthName,
            day: game.date || dayKey,
            round: game["round #"] || "",
            commanderOne: game["commander-team-one"] || "",
            commanderTwo: game["commander-team-two"] || "",
            seq: games.length,
          });
        }
      }
    }
  }

  return games;
}

// "[Hadean, I.S.D.F]" -> ["Hadean", "I.S.D.F"]
export function splitFactions(game) {
  if (typeof game.factions !== "string") return [];
  return game.factions
    .replace(/[[\]]/g, "")
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);
}

// "Juliet vs Golf" -> ["Juliet", "Golf"]
export function splitTeams(game) {
  if (typeof game.teams !== "string") return [];
  return game.teams
    .split(" vs ")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function timeToSeconds(time) {
  if (!time || time === "NA") return 0;
  const parts = String(time).split(":").map(Number);
  if (parts.some(Number.isNaN)) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

// Games are recorded one per map, but two teams meet in a best-of series. The
// "round #" field numbers the games WITHIN that series (1, 2, 3) - it is not
// the tournament round. Group the games back into the match they belong to.
export function computeSeries(games) {
  const byPairing = new Map();

  for (const game of games) {
    const teams = splitTeams(game);
    // The same two teams on the same day is one match.
    const key = game.day + "|" + [...teams].sort().join(" vs ");

    if (!byPairing.has(key)) {
      byPairing.set(key, {
        day: game.day,
        teams,
        label: game.teams,
        games: [],
        scores: {},
        winner: null,
        scoreline: "",
      });
    }

    const series = byPairing.get(key);
    series.games.push(game);
    if (game.winner) {
      series.scores[game.winner] = (series.scores[game.winner] || 0) + 1;
    }
  }

  for (const series of byPairing.values()) {
    series.games.sort((a, b) => Number(a.round) - Number(b.round));

    const ranked = Object.entries(series.scores).sort((a, b) => b[1] - a[1]);
    series.winner = ranked.length ? ranked[0][0] : null;

    // A sweep leaves the losing team out of scores entirely, so derive their
    // total rather than joining whatever keys happen to be present.
    const winnerWins = ranked.length ? ranked[0][1] : 0;
    series.scoreline = `${winnerWins}-${series.games.length - winnerWins}`;

    for (const team of series.teams) {
      if (!(team in series.scores)) series.scores[team] = 0;
    }
  }

  return [...byPairing.values()];
}

export function computeTotals(tournament, games) {
  const days = new Set();
  for (const game of games) days.add(game.day);

  const series = computeSeries(games);

  return {
    games: games.length,
    teams: Object.keys(tournament.teams || {}).length,
    days: days.size,
    months: Object.keys(tournament.raw || {}),
    matches: series.length,
    series,
  };
}

// Win/loss per team, derived from each game's "teams" and "winner".
// The tournament is scored on points for matches won, so the match record
// drives the ranking and the game record is the tiebreak.
export function computeStandings(tournament, games) {
  const rosters = tournament.teams || {};
  const table = new Map();

  function entryFor(team) {
    if (!table.has(team)) {
      table.set(team, {
        team,
        roster: rosters[team] || [],
        games: 0,
        wins: 0,
        losses: 0,
        matches: 0,
        matchWins: 0,
        matchLosses: 0,
        factions: {},
        commanders: {},
      });
    }
    return table.get(team);
  }

  // Seed from the roster so a team that never played still appears.
  for (const team of Object.keys(rosters)) entryFor(team);

  for (const game of games) {
    const teams = splitTeams(game);
    const factions = splitFactions(game);
    const commanders = [game.commanderOne, game.commanderTwo];

    teams.forEach((team, i) => {
      const entry = entryFor(team);
      entry.games += 1;
      if (team === game.winner) entry.wins += 1;
      else entry.losses += 1;

      const faction = factions[i];
      if (faction) entry.factions[faction] = (entry.factions[faction] || 0) + 1;

      const commander = commanders[i];
      if (commander)
        entry.commanders[commander] = (entry.commanders[commander] || 0) + 1;
    });
  }

  // Roll the games up into matches so each series counts once.
  for (const series of computeSeries(games)) {
    for (const team of series.teams) {
      const entry = entryFor(team);
      entry.matches += 1;
      if (team === series.winner) entry.matchWins += 1;
      else entry.matchLosses += 1;
    }
  }

  return [...table.values()]
    .map((entry) => ({
      ...entry,
      points: entry.matchWins,
      // Games won minus lost: on equal points an unbeaten team places above a
      // team that won as many games but dropped as many.
      gameDiff: entry.wins - entry.losses,
      winRate: entry.games ? entry.wins / entry.games : 0,
    }))
    .sort(
      (a, b) =>
        // Teams on the roster that never played sink below those that did.
        Number(b.games > 0) - Number(a.games > 0) ||
        // Points come from matches won; game differential decides ties.
        b.points - a.points ||
        b.gameDiff - a.gameDiff ||
        b.winRate - a.winRate ||
        a.team.localeCompare(b.team),
    );
}

export async function loadTournamentData() {
  const response = await fetch(CONFIG.jsonFile);
  if (!response.ok) throw new Error("Failed to load data.json");
  return response.json();
}
