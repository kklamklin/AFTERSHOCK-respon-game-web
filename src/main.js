import { CONFIG } from './config.js';
import { state } from './state.js';
import { renderMap, updateZoneEl, applyZoneColors } from './ui/map.js';
import { createClock, tickLoop } from './systems/time.js';

const mapEl = document.getElementById('map');
const hourEl = document.getElementById('hud-hour');
const apEl = document.getElementById('hud-ap');
const loopEl = document.getElementById('hud-loop');

applyZoneColors(document.head);
const grid = renderMap(mapEl, state.zones);

function renderHud() {
  hourEl.textContent = `${Math.floor(state.hour)}/${CONFIG.totalLoops / CONFIG.loopsPerHour} ชม.`;
  apEl.textContent = `${Math.floor(state.ap)} AP`;
  loopEl.textContent = `ลูป ${state.loop}/${CONFIG.totalLoops}`;
}

function renderZones() {
  for (const zone of Object.values(state.zones)) {
    updateZoneEl(grid, zone);
  }
}

function payHourlyAP() {
  const resolved = state.totalRescued + state.totalCasualty;
  const pct = resolved / CONFIG.totalSurvivors;
  const tier = CONFIG.apBonusThresholds.filter((t) => pct >= t).length;
  state.ap += CONFIG.apBase + CONFIG.apBonusValues[tier];
}

function tick() {
  tickLoop(state, {
    onHourTick: () => payHourlyAP(),
    onZoneCleared: () => {},
    onGameEnd: () => clock.stop(),
  });
  renderHud();
  renderZones();
}

const clock = createClock(state, tick);

document.getElementById('btn-pause').addEventListener('click', () => clock.setSpeed(0));
document.getElementById('btn-play').addEventListener('click', () => clock.setSpeed(1));
document.getElementById('btn-fast').addEventListener('click', () => clock.setSpeed(2));

renderHud();
clock.setSpeed(1);
