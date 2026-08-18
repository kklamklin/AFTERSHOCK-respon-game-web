import { CONFIG } from '../config.js';
import { deathPerHour } from '../systems/zones.js';

// Render โซนทั้งหมดเป็นกริด (placeholder แทน map.svg จริง)
export function renderMap(container, zones) {
  container.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'zone-grid';
  container.appendChild(grid);

  for (const zone of Object.values(zones)) {
    const el = document.createElement('div');
    el.className = 'zone';
    el.dataset.zoneId = zone.id;
    el.dataset.level = zone.level;
    el.appendChild(buildZoneContent(zone));
    grid.appendChild(el);
  }
  return grid;
}

function buildZoneContent(zone) {
  const frag = document.createElement('div');
  frag.className = 'zone-inner';
  frag.innerHTML = `
    <div class="zone-id">${zone.id.replace('zone-', '')}</div>
    <div class="zone-count">${Math.floor(zone.trapped)}</div>
    <div class="zone-rate">${deathPerHour(zone).toFixed(1)}/ชม.</div>
  `;
  return frag;
}

export function updateZoneEl(container, zone) {
  const el = container.querySelector(`[data-zone-id="${zone.id}"]`);
  if (!el) return;
  el.className = 'zone' + (zone.cleared ? ' cleared' : '');
  el.dataset.level = zone.cleared ? 'green' : zone.level;
  el.innerHTML = '';
  el.appendChild(buildZoneContent(zone));
}

export function applyZoneColors(root) {
  const style = document.createElement('style');
  style.textContent = Object.entries(CONFIG.zoneColors).map(([level, c]) => `
    .zone[data-level="${level}"] { background:${c.fill}; border-color:${c.stroke}; }
  `).join('\n');
  root.appendChild(style);
}
