import { CONFIG } from '../config.js';
import { tickZoneDeath } from './zones.js';

// เดินเวลาทีละ 1 ลูป (§2 ของ docs/gamesystemfinal.md, §15 ลำดับประมวลผล)
export function tickLoop(state, { onHourTick, onZoneCleared, onGameEnd } = {}) {
  if (state.ended) return;

  state.loop += 1;

  for (const zone of Object.values(state.zones)) {
    const wasTrapped = zone.trapped > 0 && !zone.cleared;
    tickZoneDeath(zone);
    if (wasTrapped && zone.trapped <= 0 && !zone.cleared) {
      zone.trapped = 0;
      onZoneCleared?.(zone, 'expired');
    }
  }

  if (state.loop % CONFIG.loopsPerHour === 0) {
    state.hour = state.loop / CONFIG.loopsPerHour;
    onHourTick?.(state.hour);
  }

  if (state.loop >= CONFIG.totalLoops || allZonesResolved(state)) {
    state.ended = true;
    onGameEnd?.();
  }
}

function allZonesResolved(state) {
  return Object.values(state.zones).every((z) => z.trapped <= 0);
}

export function loopDurationMs(state) {
  return CONFIG.loopDurationMsBySpeed[state.speed] ?? CONFIG.loopDurationMsBySpeed[1];
}

// ตัวควบคุมการเดินเวลาแบบ interval ผูกกับ speed (0=หยุด)
export function createClock(state, onTick) {
  let timer = null;

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function restart() {
    stop();
    if (state.speed === 0 || state.ended) return;
    timer = setInterval(() => onTick(), loopDurationMs(state));
  }

  return {
    setSpeed(speed) {
      state.speed = speed;
      state.running = speed !== 0;
      restart();
    },
    pause() {
      state.speed = 0;
      state.running = false;
      stop();
    },
    stop,
  };
}
