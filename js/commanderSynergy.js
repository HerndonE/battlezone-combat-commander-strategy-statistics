import { CONFIG } from './config.js';

let synergyData = null;
let activeCommander = null;
let activeView = 'raw';

function winRateColor(rate) {
  if (rate >= 0.7) return '#28a745';
  if (rate >= 0.5) return '#ffc107';
  return '#dc3545';
}

function renderTable(players) {
  if (!players || players.length === 0) {
    return '<p class="synergy-empty">No player data for this view.</p>';
  }

  const rows = players
    .map((p) => {
      const pct = (p.win_rate * 100).toFixed(1);
      const color = winRateColor(p.win_rate);
      return `
        <tr>
          <td class="syn-col-player">${p.player}</td>
          <td class="syn-col-num">${p.matches}</td>
          <td class="syn-col-num">${p.wins}</td>
          <td class="syn-col-rate">
            <div class="syn-bar-wrap">
              <div class="syn-bar" style="width:${pct}%;background:${color}"></div>
            </div>
            <span class="syn-rate-label" style="color:${color}">${pct}%</span>
          </td>
        </tr>`;
    })
    .join('');

  return `
    <table class="syn-table">
      <thead>
        <tr>
          <th class="syn-col-player">Player</th>
          <th class="syn-col-num">Matches</th>
          <th class="syn-col-num">Wins</th>
          <th class="syn-col-rate">Win Rate</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function showCommander(name) {
  activeCommander = name;

  // Highlight selected in list
  document.querySelectorAll('.syn-list-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.name === name);
  });

  const data = synergyData[name];
  const players = activeView === 'modified' ? data.modified : data.raw;

  const panel = document.getElementById('syn-detail-panel');
  const title = document.getElementById('syn-detail-title');
  const count = document.getElementById('syn-player-count');

  title.textContent = name;
  count.textContent =
    activeView === 'modified'
      ? `${players.length} player${players.length !== 1 ? 's' : ''} (5+ games)`
      : `${players.length} player${players.length !== 1 ? 's' : ''} (all)`;

  panel.innerHTML = renderTable(players);
}

function setView(view) {
  activeView = view;

  document.getElementById('syn-btn-modified').classList.toggle('active', view === 'modified');
  document.getElementById('syn-btn-raw').classList.toggle('active', view === 'raw');

  if (activeCommander) showCommander(activeCommander);
}

function resetView() {
  activeCommander = null;
  document.querySelectorAll('.syn-list-item').forEach((el) => el.classList.remove('active'));
  document.getElementById('syn-detail-title').textContent = '';
  document.getElementById('syn-player-count').textContent = '';
  document.getElementById('syn-detail-panel').innerHTML =
    '<p class="syn-placeholder">Select a commander to view player synergy data.</p>';
}

function buildList(filter = '') {
  const listEl = document.getElementById('syn-commander-list');
  const q = filter.toLowerCase();

  listEl.innerHTML = Object.keys(synergyData)
    .sort((a, b) => a.localeCompare(b))
    .filter((name) => name.toLowerCase().includes(q))
    .map((name) => `
        <div class="syn-list-item${name === activeCommander ? ' active' : ''}" data-name="${name}">
          <span class="syn-list-name">${name}</span>
        </div>`)
    .join('');

  // Re-attach click listeners
  listEl.querySelectorAll('.syn-list-item').forEach((el) => {
    el.addEventListener('click', () => showCommander(el.dataset.name));
  });
}

async function initSynergy() {
  const root = document.getElementById('synergy-root');
  if (!root) return;

  try {
    const response = await fetch(CONFIG.jsonFile);
    if (!response.ok) throw new Error('Failed to load data');
    const data = await response.json();
    synergyData = data.processed_data.processed_commander_player_synergy;

    buildList();

    // Search
    document.getElementById('syn-search').addEventListener('input', (e) => {
      buildList(e.target.value);
    });

    // View toggles
    document.getElementById('syn-btn-raw').addEventListener('click', () => setView('raw'));
    document.getElementById('syn-btn-modified').addEventListener('click', () => setView('modified'));
    document.getElementById('syn-btn-reset').addEventListener('click', resetView);
  } catch (err) {
    root.innerHTML =
      '<p style="color:#f72585;text-align:center;padding:2rem;">Failed to load synergy data.</p>';
    console.error(err);
  }
}

initSynergy();
