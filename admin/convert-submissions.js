const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const fileInput = document.getElementById("file-input");
const summaryCard = document.getElementById("summary-card");
const summaryList = document.getElementById("summary-list");
const warningsBox = document.getElementById("warnings");
const downloadCard = document.getElementById("download-card");
const downloadVsrBtn = document.getElementById("download-vsr");
const downloadStockBtn = document.getElementById("download-stock");
const jsonPreview = document.getElementById("json-preview");

let deltas = { VSR: null, Stock: null };

fileInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  processRows(rows);
});

function processRows(rows) {
  const counts = { Approved: 0, Rejected: 0, Pending: 0, Other: 0 };
  const warnings = [];
  const approvedByMod = { VSR: [], Stock: [] };

  rows.forEach((row, index) => {
    const status = String(row["Approval Status"] || "").trim();
    if (status === "Approved") counts.Approved++;
    else if (status === "Rejected") counts.Rejected++;
    else if (status === "Pending" || status === "") counts.Pending++;
    else counts.Other++;

    if (status !== "Approved") return;

    const mod = String(row["Mod"] || "").trim();
    if (mod !== "VSR" && mod !== "Stock") {
      warnings.push(`Row ${index + 2}: Approved but Mod is "${row["Mod"]}" (expected VSR or Stock) — skipped.`);
      return;
    }

    const match = rowToMatch(row, index + 2, warnings);
    if (match) approvedByMod[mod].push(match);
  });

  deltas.VSR = buildDelta(approvedByMod.VSR);
  deltas.Stock = buildDelta(approvedByMod.Stock);

  renderSummary(counts, approvedByMod, warnings);
}

function rowToMatch(row, rowNumber, warnings) {
  const dateKey = formatDateKey(row["Date Played"]);
  const map = String(row["Map"] || "").trim();
  const team1Commander = String(row["Team 1 Commander"] || "").trim();
  const team2Commander = String(row["Team 2 Commander"] || "").trim();
  const team1Faction = String(row["Team 1 Faction"] || "").trim();
  const team2Faction = String(row["Team 2 Faction"] || "").trim();
  const winnerTeam = normalizeWinner(row["Winner"]);

  const missing = [];
  if (!dateKey) missing.push("Date Played");
  if (!map) missing.push("Map");
  if (!team1Commander) missing.push("Team 1 Commander");
  if (!team2Commander) missing.push("Team 2 Commander");
  if (!team1Faction) missing.push("Team 1 Faction");
  if (!team2Faction) missing.push("Team 2 Faction");
  if (!winnerTeam) missing.push("Winner");

  if (missing.length) {
    warnings.push(`Row ${rowNumber}: Approved but missing/invalid ${missing.join(", ")} — skipped.`);
    return null;
  }

  const teamOne = [1, 2, 3, 4]
    .map((n) => String(row[`Team 1 Thug ${n}`] || "").trim())
    .filter(Boolean);
  const teamTwo = [1, 2, 3, 4]
    .map((n) => String(row[`Team 2 Thug ${n}`] || "").trim())
    .filter(Boolean);

  const submittedBy = String(row["Submitted By"] || "").trim() || "Unknown";

  return {
    monthIndex: dateKey.monthIndex,
    dateString: dateKey.dateString,
    map,
    data: {
      date: dateKey.dateString,
      map,
      commanders: `${team1Commander} vs ${team2Commander}`,
      factions: `[${team1Faction}, ${team2Faction}]`,
      winningFaction: winnerTeam === "team1" ? team1Faction : team2Faction,
      winner: winnerTeam === "team1" ? team1Commander : team2Commander,
      time: String(row["Match Length"] || "").trim() || "NA",
      teamOne,
      teamTwo,
      comment: `Submitted game by ${submittedBy}`,
    },
  };
}

function formatDateKey(value) {
  let d = null;

  if (value instanceof Date && !isNaN(value)) {
    d = value;
  } else if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value.trim());
    if (!isNaN(parsed)) d = parsed;
  }

  if (!d) return null;

  // Both SheetJS's cellDates conversion and `new Date("YYYY-MM-DD")` produce
  // a UTC-midnight instant for the calendar date in the cell, so the date
  // must be read back out with the UTC getters — local getters would shift
  // it a day in any timezone behind UTC.
  const monthIndex = d.getUTCMonth();
  const month = String(monthIndex + 1).padStart(2, "0");
  const day = d.getUTCDate();
  const year2 = String(d.getUTCFullYear()).slice(-2);

  return { monthIndex, dateString: `${month}.${day}.${year2}` };
}

function normalizeWinner(value) {
  const str = String(value || "").trim();
  if (/1/.test(str) || /team\s*one/i.test(str)) return "team1";
  if (/2/.test(str) || /team\s*two/i.test(str)) return "team2";
  return null;
}

function buildDelta(matches) {
  const month = {};

  matches.forEach((m) => {
    const monthName = MONTHS[m.monthIndex];
    month[monthName] = month[monthName] || {};
    month[monthName][m.dateString] = month[monthName][m.dateString] || {};
    month[monthName][m.dateString][m.map] = m.data;
  });

  return { month };
}

function renderSummary(counts, approvedByMod, warnings) {
  summaryCard.hidden = false;
  downloadCard.hidden = false;

  summaryList.innerHTML = "";
  const rowsSummary = [
    ["Approved", counts.Approved],
    ["Pending", counts.Pending],
    ["Rejected", counts.Rejected],
    ["Other/blank status", counts.Other],
    ["Approved &middot; VSR", approvedByMod.VSR.length],
    ["Approved &middot; Stock", approvedByMod.Stock.length],
  ];
  rowsSummary.forEach(([label, value]) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${value}</strong> ${label}`;
    summaryList.appendChild(li);
  });

  if (warnings.length) {
    warningsBox.hidden = false;
    warningsBox.innerHTML = `<strong>${warnings.length} row(s) skipped:</strong><ul>${warnings
      .map((w) => `<li>${escapeHtml(w)}</li>`)
      .join("")}</ul>`;
  } else {
    warningsBox.hidden = true;
    warningsBox.innerHTML = "";
  }

  downloadVsrBtn.disabled = approvedByMod.VSR.length === 0;
  downloadStockBtn.disabled = approvedByMod.Stock.length === 0;

  jsonPreview.textContent = JSON.stringify({ VSR: deltas.VSR, Stock: deltas.Stock }, null, 2);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 4)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

downloadVsrBtn.addEventListener("click", () => {
  downloadJson(deltas.VSR, "vsr-approved-delta.json");
});

downloadStockBtn.addEventListener("click", () => {
  downloadJson(deltas.Stock, "stock-approved-delta.json");
});
