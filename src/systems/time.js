import { CONFIG } from '../config.js';
import { tickZoneDeath, isZoneEmpty } from './zones.js';
import { payHourlyAP } from './actionPoints.js';
import { tickRecovery, checkCritical } from './status.js';

// เดินเวลาทีละ 1 ลูป — ลำดับประมวลผลตาม AFTERSHOCKMASTER §17
//   1. นับลูป  2. คนตายทุกโซน  3. ถ้าครบชั่วโมง จ่าย AP + ลดตัวนับต่าง ๆ  4. เช็คจบเกม
export function tickLoop(state, { onHourTick, onZoneCleared, onMissionComplete, onStatusChange, onCritical, onGameEnd } = {}) {
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

  const finished = tickTimers(state);

  if (state.loop % CONFIG.loopsPerHour === 0) {
    state.hour = state.loop / CONFIG.loopsPerHour;
    payHourlyAP(state);
    onHourTick?.(state.hour);
  }

  // จนท. ที่ทำงานครบเวลา → คิดผลภารกิจ (อาจทำให้บาดเจ็บ/หมดสติ ต้องทำก่อนเช็ค CRITICAL)
  for (const opKey of finished) onMissionComplete?.(opKey, state.units[opKey].mission);

  // ฟื้นตัวจากบาดเจ็บ/หมดสติ · หมดเวลา Last Stand แล้วล้ม (§5.4)
  for (const ev of tickRecovery(state)) onStatusChange?.(ev);

  // Field ล้มทั้งคู่ → นับถอยหลัง 3 ชม. ถ้าไม่มีใครฟื้นทันคือจบเกม (§13)
  const critical = checkCritical(state);
  if (critical) onCritical?.(critical, state.criticalCountdownLoops);
  if (critical === 'over') {
    state.ended = true;
    onGameEnd?.('critical');
    return;
  }

  if (state.loop >= CONFIG.totalLoops || allZonesResolved(state)) {
    state.ended = true;
    onGameEnd?.(state.loop >= CONFIG.totalLoops ? 'timeup' : 'empty');
  }
}

// ตัวนับที่ลดลงทุก 1 ลูป — ความไม่ว่างของ จนท. · คูลดาวน์สกิล · อายุบัฟ · เวลาฟื้นตัว · CRITICAL
// คืน array ของ จนท. ที่ "ภารกิจลงพื้นที่ครบเวลาพอดีในลูปนี้"
function tickTimers(state) {
  const finished = [];

  for (const [opKey, unit] of Object.entries(state.units)) {
    const wasBusy = unit.busyRemainLoops > 0;
    unit.busyRemainLoops = Math.max(0, unit.busyRemainLoops - 1);
    if (wasBusy && unit.busyRemainLoops === 0 && unit.mission) finished.push(opKey);

    unit.recoverRemainLoops = Math.max(0, unit.recoverRemainLoops - 1);
    for (const skillId of Object.keys(unit.skillCooldowns)) {
      unit.skillCooldowns[skillId] = Math.max(0, unit.skillCooldowns[skillId] - 1);
    }
  }

  for (const zone of Object.values(state.zones)) {
    zone.buffs = zone.buffs.filter((b) => expireBuff(state, b));
  }
  state.globalBuffs = state.globalBuffs.filter((b) => expireBuff(state, b));

  if (state.criticalCountdownLoops != null) {
    state.criticalCountdownLoops = Math.max(0, state.criticalCountdownLoops - 1);
  }

  return finished;
}

// คืน true = บัฟยังอยู่ · false = หมดอายุแล้วให้ลบทิ้ง
// Scan Area หมดอายุเมื่อไหร่ ต้องคืน "ช่อง" ให้ Lia ด้วย (GAMESCREEN_SPEC §3.4)
function expireBuff(state, buff) {
  buff.remainLoops -= 1;
  if (buff.remainLoops > 0) return true;
  if (buff.type === 'scan') {
    const lia = state.units.elf;
    lia.scanStacks = Math.min(CONFIG.buffs.scan.maxStacks, (lia.scanStacks ?? 0) + 1);
  }
  return false;
}

function allZonesResolved(state) {
  return Object.values(state.zones).every(isZoneEmpty);
}
export function loopDurationMs(state) {
  return CONFIG.loopDurationMsBySpeed[state.speed] ?? CONFIG.loopDurationMsBySpeed[1];
}

// ตัวควบคุมการเดินเวลา
//
// แยก 2 เรื่องออกจากกันให้ชัด — เคยรวมกันแล้วพัง:
//   state.speed   = "ความเร็วที่เลือกไว้" มีแค่ 1 หรือ 2 เท่านั้น ไม่เคยเป็น 0
//   state.running = "ตอนนี้เวลาเดินอยู่ไหม"
// ถ้าเอา 0 ไปยัดใส่ speed ตอนหยุด พอจะเดินต่อจะไม่รู้ว่าต้องกลับไปที่ความเร็วเท่าไหร่
export function createClock(state, onTick) {
  let timer = null;

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function restart() {
    stop();
    if (!state.running || state.ended) return;
    timer = setInterval(() => onTick(), loopDurationMs(state));
  }

  return {
    setRunning(run) {
      state.running = !!run && !state.ended;
      restart();
    },
    setRate(rate) {
      state.speed = rate;
      restart(); // เปลี่ยนความเร็วตอนหยุดอยู่ก็ได้ ไว้กดเดินต่อค่อยใช้ค่าใหม่
    },
    stop() {
      state.running = false;
      stop();
    },
  };
}
