function extractRows(json) {
  const rows = [];
  for (const year in json) {
    const raw = json[year][`raw_${year}`];
    if (!raw || !raw.month) continue; // skip non-raw_<year> objects

    for (const month in raw.month) {
      const dates = raw.month[month];
      for (const date in dates) {
        const maps = dates[date];
        for (const mapName in maps) {
          const m = maps[mapName];
          rows.push({
            year,
            month,
            date: m.date || date,
            map: m.map,
            commanders: m.commanders,
            factions: m.factions,
            winningFaction: m["winningFaction"],
            winner: m.winner,
            time: m.time || "",
            comment: m._comment || "",
            teams: {
              teamOne: m.teamOne || [],
              teamTwo: m.teamTwo || [],
              teamOneStraggler: m.teamOneStraggler || [],
              teamTwoStraggler: m.teamTwoStraggler || [],
            },
            // stats: m["stats"],
          });
        }
      }
    }
  }
  return rows;
}

let rows = [];
let filteredRows = [];

fetch("../data/data.json")
  .then((response) => {
    if (!response.ok) throw new Error("Failed to load JSON file");
    return response.json();
  })
  .then((data) => {
    rows = extractRows(data);
    loadFilters();
    document.getElementById("yearFilter").disabled = false;
    document.getElementById("monthFilter").disabled = false;
    renderTable();
  })
  .catch((err) => console.error(err));

function colorFaction(str) {
  if (!str) return "";
  return str
    .replace(/I\.S\.D\.F/gi, `<span class="faction-ISDF">I.S.D.F</span>`)
    .replace(/Scion/gi, `<span class="faction-Scion">Scion</span>`)
    .replace(/Hadean/gi, `<span class="faction-Hadean">Hadean</span>`);
}

const monthOrder = {
  January: 1,
  February: 2,
  March: 3,
  April: 4,
  May: 5,
  June: 6,
  July: 7,
  August: 8,
  September: 9,
  October: 10,
  November: 11,
  December: 12,
};

function loadFilters() {
  const yearDropdown = document.getElementById("yearFilter");
  const monthDropdown = document.getElementById("monthFilter");

  const years = [...new Set(rows.map((r) => r.year))].sort();
  yearDropdown.innerHTML =
    `<option value="">All Years</option>` +
    years.map((y) => `<option value="${y}">${y}</option>`).join("");

  monthDropdown.innerHTML = `<option value="">All Months</option>`;
}

function updateMonths() {
  const year = document.getElementById("yearFilter").value;
  const monthDropdown = document.getElementById("monthFilter");

  if (!year) {
    monthDropdown.innerHTML = `<option value="">All Months</option>`;
    return;
  }

  const months = [
    ...new Set(rows.filter((r) => r.year === year).map((r) => r.month)),
  ];

  months.sort((a, b) => (monthOrder[a] || 0) - (monthOrder[b] || 0));

  monthDropdown.innerHTML =
    `<option value="">All Months</option>` +
    months.map((m) => `<option value="${m}">${m}</option>`).join("");
}

function renderTable() {
  const body = document.getElementById("tableBody");
  body.innerHTML = "";

  const yearFilter = document.getElementById("yearFilter").value;
  const monthFilter = document.getElementById("monthFilter").value;

  const search = document.getElementById("search").value.toLowerCase();

  filteredRows = rows.filter(
    (r) =>
      (!yearFilter || r.year === yearFilter) &&
      (!monthFilter || r.month === monthFilter) &&
      (r.map.toLowerCase().includes(search) ||
        r.winner.toLowerCase().includes(search) ||
        r.commanders.toLowerCase().includes(search) ||
        r.factions.toLowerCase().includes(search)),
  );

  filteredRows.forEach((r) => {
    const tr = document.createElement("tr");
    const summary = r.stats?.game_summary;
    const SHOW_STATS = false;
    tr.innerHTML = `
            <td>${r.date}</td>
            <td>${r.map}</td>
            <td>${r.commanders}</td>
            <td>${colorFaction(r.factions)}</td>
            <td>${r.winner}</td>
            <td>${colorFaction(r.winningFaction)}</td>
            <td>${r.time}</td>
            <td>
                <strong>Team One:</strong> ${r.teams.teamOne.join(", ")}<br>
                <strong>Team Two:</strong> ${r.teams.teamTwo.join(", ")}<br>
                ${
                  r.teams.teamOneStraggler.length
                    ? `<strong>Straggler 1:</strong> ${r.teams.teamOneStraggler.join(
                        ", ",
                      )}<br>`
                    : ""
                }
                ${
                  r.teams.teamTwoStraggler.length
                    ? `<strong>Straggler 2:</strong> ${r.teams.teamTwoStraggler.join(
                        ", ",
                      )}<br>`
                    : ""
                }
                ${
                  r.comment
                    ? `<em style="color:#ccc">Note: ${r.comment}</em>`
                    : ""
                }
            </td>

        `;
    body.appendChild(tr);
  });
}

document.getElementById("yearFilter").onchange = () => {
  updateMonths();
  renderTable();
};
document.getElementById("monthFilter").onchange = renderTable;
document.getElementById("search").oninput = renderTable;

// Export filtered rows to Excel (.xlsx) using SheetJS
function exportToExcel() {
  if (typeof XLSX === "undefined") {
    alert("Excel export library is not loaded. Please try again.");
    return;
  }
  const headers = [
    "Date", "Map", "Commanders", "Factions",
    "Winner", "Winning Faction", "Time",
    "Team One", "Team Two", "Straggler 1", "Straggler 2",
  ];
  const dataRows = filteredRows.map((r) => [
    r.date,
    r.map,
    r.commanders,
    r.factions,
    r.winner,
    r.winningFaction || "",
    r.time,
    r.teams.teamOne.join(", "),
    r.teams.teamTwo.join(", "),
    r.teams.teamOneStraggler.join(", "),
    r.teams.teamTwoStraggler.join(", "),
  ]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

  // Auto-width columns
  const colWidths = headers.map((h, i) => ({
    wch: Math.max(
      h.length,
      ...dataRows.map((r) => String(r[i] || "").length),
    ),
  }));
  ws["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, "Match History");
  XLSX.writeFile(wb, "bzcc-match-history.xlsx");
}

// Copy the raw data.json URL to clipboard
function copyDataUrl() {
  const url = window.location.origin + "/data/data.json";
  const btn = document.getElementById("copy-data-url-btn");
  navigator.clipboard
    .writeText(url)
    .then(() => {
      if (btn) {
        const original = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(() => { btn.textContent = original; }, 2000);
      }
    })
    .catch(() => {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      if (btn) {
        const original = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(() => { btn.textContent = original; }, 2000);
      }
    });
}

document
  .getElementById("export-excel-btn")
  .addEventListener("click", exportToExcel);
document
  .getElementById("copy-data-url-btn")
  .addEventListener("click", copyDataUrl);

/*
            <td> //SHOW STATS LATER
            
              ${
                SHOW_STATS && r.stats
                  ? `
              <details>
                <summary>View stats</summary>

                <!-- GAME SUMMARY -->
                <details style="margin-left:12px">
                  <summary>Game summary</summary>

                  <div style="margin-left:12px">
                    <strong>Total time:</strong> ${
                      r.stats.game_summary.total_time
                    }<br><br>

                    ${r.stats.game_summary.team_overviews
                      .map(
                        (t) => `
                      <strong>${t.name}</strong><br>
                      Score: ${t.score}<br>
                      Kills: ${t.kills}<br>
                      Deaths: ${t.deaths}<br><br>
                    `,
                      )
                      .join("")}
                  </div>
                </details>

                <!-- TEAM DETAILS -->
                <details style="margin-left:12px">
                  <summary>Team details</summary>

                  <div style="margin-left:12px">
                    ${r.stats.teams_detailed
                      .map(
                        (team) => `
                      <details>
                        <summary>${team.header}</summary>

                        <div style="margin-left:12px">
                          <strong>Metrics</strong><br>
                          ${Object.entries(team.metrics || {})
                            .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
                            .join("<br>")}
                          <br><br>

                          <strong>Combat stats</strong><br>
                          ${Object.entries(team.combat_stats || {})
                            .map(
                              ([section, values]) => `
                              <em>${section.replace(/_/g, " ")}</em><br>
                              ${
                                Object.keys(values).length
                                  ? Object.entries(values)
                                      .map(([k, v]) => `• ${k}: ${v}`)
                                      .join("<br>")
                                  : "None"
                              }
                              <br><br>
                            `,
                            )
                            .join("")}
                        </div>
                      </details>
                    `,
                      )
                      .join("")}
                  </div>
                </details>

              </details>
              `
                  : ""
              }
            </td>
*/
