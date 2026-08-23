// สถานะเจ้าหน้าที่ — บาดเจ็บ / หมดสติ / Last Stand / CRITICAL
// อ้างอิง docs/GAMESCREEN_SPEC.md §4.3 ทอยอันตราย · §5 Last Stand · §13 จบเกม
//
//   ปกติ ──ทอยติด──> 🩹 บาดเจ็บ (ฟื้น 3 ชม.) ──ทอยติดอีก──> 💀 หมดสติ (ฟื้น 4 ชม.)
//   Field ล้มทั้งคู่ → นับถอยหลัง CRITICAL 3 ชม. · ถ้าไม่มีใครฟื้นทัน = จบเกม
//
// ไฟล์นี้อยู่ใน systems/ จึงไม่แตะ DOM — คืนรายการ "เหตุการณ์" ให้ ui/ เอาไปแสดง

import { CONFIG } from '../config.js';
import { roll100 } from '../utils/rng.js';
import { dangerChance } from './danger.js';

const FIELD_OPS = ['human', 'cat'];
const hours = (h) => h * CONFIG.loopsPerHour;

/**
 * ทอยอันตรายหลังภารกิจล้มเหลว (§4.3) — ทอยเฉพาะตอนไม่สำเร็จเท่านั้น
 * @returns {{hit:boolean, chance:number, to?:'injured'|'lost'|'laststand'}}
 */
export function rollDanger(state, opKey, zone) {
  const unit = state.units[opKey];
  const chance = dangerChance(state, zone);

  // ระหว่าง Last Stand ไม่ทอยอันตราย — ยังไงเขาก็ล้มตอนหมดเวลาอยู่แล้ว (§5.4)
  if (unit.status === 'laststand') return { hit: false, chance: 0 };
  if (chance <= 0 || roll100() > chance) return { hit: false, chance };

  // เงื่อนไข Last Stand: Lyla หมดสติอยู่ + Robertson บาดเจ็บอยู่ + ทอยติดซ้ำ (§5.1)
  if (canEnterLastStand(state, opKey)) {
    unit.status = 'laststand';
    unit.recoverRemainLoops = hours(CONFIG.lastStand.durationHours);
    state.lastStandUsed = true;
    state.stats.injuries += 1;
    return { hit: true, chance, to: 'laststand' };
  }

  const to = unit.status === 'injured' ? 'lost' : 'injured';
  unit.status = to;
  if (to === 'lost') state.stats.blackouts += 1; else state.stats.injuries += 1;
  unit.recoverRemainLoops = hours(to === 'lost' ? CONFIG.lostConsciousHours : CONFIG.injuredRecoverHours);
  return { hit: true, chance, to };
}

export function canEnterLastStand(state, opKey) {
  if (opKey !== 'human') return false;                 // มีแค่ Robertson
  if (state.lastStandUsed) return false;               // ใช้ได้ครั้งเดียวต่อเกม
  if (state.units.human.status !== 'injured') return false;
  return state.units.cat.status === 'lost';
}

/**
 * เดินตัวนับฟื้นตัวและเปลี่ยนสถานะเมื่อหมดเวลา — เรียกทุกลูป
 * @returns array ของเหตุการณ์ [{ opKey, from, to }]
 */
export function tickRecovery(state) {
  const events = [];

  for (const [opKey, unit] of Object.entries(state.units)) {
    if (unit.status === 'normal' || unit.recoverRemainLoops > 0) continue;

    const from = unit.status;
    if (from === 'laststand') {
      // หมดเวลา Last Stand → ล้มทันที (§5.4)
      unit.status = 'lost';
      unit.recoverRemainLoops = hours(CONFIG.lostConsciousHours);
      state.stats.blackouts += 1;
    } else {
      unit.status = 'normal';
      unit.recoverRemainLoops = 0;
    }
    events.push({ opKey, from, to: unit.status });
  }

  return events;
}

export function bothFieldDown(state) {
  return FIELD_OPS.every((op) => state.units[op].status === 'lost');
}

/**
 * ตรวจสถานะ CRITICAL (§13) — เรียกทุกลูปหลัง tickRecovery
 * @returns 'start' | 'cancel' | 'over' | null
 */
export function checkCritical(state) {
  const down = bothFieldDown(state);

  if (!down) {
    if (state.criticalCountdownLoops == null) return null;
    state.criticalCountdownLoops = null;   // มีคนฟื้นทัน → รอดแล้ว
    return 'cancel';
  }

  if (state.criticalCountdownLoops == null) {
    state.criticalCountdownLoops = hours(CONFIG.criticalCountdownHours);
    return 'start';
  }

  if (state.criticalCountdownLoops <= 0) return 'over';
  return null;
}
