import { CONFIG } from '../config.js';
import { tickZoneDeath, isZoneEmpty } from './zones.js';
import { payHourlyAP } from './actionPoints.js';

// เดินเวลาทีละ 1 ลูป — ลำดับประมวลผลตาม AFTERSHOCKMASTER §17
//   1. นับลูป  2. คนตายทุกโซน  3. ถ้าครบชั่วโมง จ่าย AP + ลดตัวนับต่าง ๆ  4. เช็คจบเกม
export function tickLoop(state, { onHourTick, onZoneCleared, onGameEnd } = {}) {
  if (state.ended) return;

  state.loop += 1;

  for (const zone of Object.values(state.zones)) {
    const dead = tickZoneDeath(zone);
    state.totalCasualty += dead;
    // คนในโซนหมด (ตายหมด) → ปิดโซนเป็นเขียวเหมือนกรณีช่วยสำเร็จ (§5.4)
    if (!zone.cleared && isZoneEmpty(zone)) {
      zone.trapped = 0;
      zone.cleared = true;
      onZoneCleared?.(zone, 'expired');
    }
  }

  tickTimers(state);

  if (state.loop % CONFIG.loopsPerHour === 0) {
    state.hour = state.loop / CONFIG.loopsPerHour;
    payHourlyAP(state);
    onHourTick?.(state.hour);
  }

  if (state.loop >= CONFIG.totalLoops || allZonesResolved(state)) {
    state.ended = true;
    onGameEnd?.(state.loop >= CONFIG.totalLoops ? 'timeup' : 'empty');
  }
}

// ตัวนับที่ลดลงทุก 1 ลูป — เวลาทำงานในโซน · คูลดาวน์สกิล · อายุบัฟ · เวลาฟื้นตัว · CRITICAL
// (รอบ 5-8 จะเป็นคนตั้งค่าพวกนี้ ตรงนี้แค่เดินถอยหลังให้)
function tickTimers(state) {
  for (const unit of Object.values(state.units)) {
    unit.workRemainLoops = Math.max(0, unit.workRemainLoops - 1);
    unit.recoverRemainLoops = Math.max(0, unit.recoverRemainLoops - 1);
    for (const skillId of Object.keys(unit.skillCooldowns)) {
      unit.skillCooldowns[skillId] = Math.max(0, unit.skillCooldowns[skillId] - 1);
    }
  }

  for (const zone of Object.values(state.zones)) {
    zone.buffs = zone.buffs.filter((b) => (b.remainLoops -= 1) > 0);
  }
  state.globalBuffs = state.globalBuffs.filter((b) => (b.remainLoops -= 1) > 0);

  if (state.criticalCountdownLoops != null) {
    state.criticalCountdownLoops = Math.max(0, state.criticalCountdownLoops - 1);
  }
}

function allZonesResolved(state) {
  return Object.values(state.zones).every(isZoneEmpty);
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
