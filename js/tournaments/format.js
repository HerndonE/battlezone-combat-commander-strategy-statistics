// Faction colouring shared by the tournament views. Uses the same classes the
// VSR match history relies on, defined in css/match-history.css.
export function colorFactions(text) {
  if (!text) return "";
  return String(text)
    .replace(/I\.S\.D\.F/gi, '<span class="faction-ISDF">I.S.D.F</span>')
    .replace(/Scion/gi, '<span class="faction-Scion">Scion</span>')
    .replace(/Hadean/gi, '<span class="faction-Hadean">Hadean</span>');
}

// Turn "M.D.YY" into a sortable number, so games order correctly across months.
export function dateValue(dateText) {
  const parts = String(dateText || "").split(".");
  const month = parseInt(parts[0], 10) || 0;
  const day = parseInt(parts[1], 10) || 0;
  const year = parseInt(parts[2], 10) || 0;
  return year * 10000 + month * 100 + day;
}
