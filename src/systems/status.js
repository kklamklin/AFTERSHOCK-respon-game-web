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
    // เก็บ "เวลาเต็มของสถานะนี้" ไว้ด้วย เพราะ QTE ต่อเวลาได้ทีหลัง
    // แถบ % บนการ์ดต้องรู้ว่าตอนนี้เต็มเท่าไหร่ ไม่งั้นต่อเวลาแล้วแถบจะเพี้ยน
    unit.recoverTotalLoops = unit.recoverRemainLoops;
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
 * ปิดผลของมินิเกมต่อเวลา Last Stand — ui/ เรียกเมื่อผู้เล่นเล่นจบ
 * ได้เวลามา > 0 ชม. → อยู่ในสถานะ Last Stand ต่อ · ได้ 0 → ล้มทันทีตามกฎเดิม (§5.4)
 * @param hoursGained ชั่วโมงที่ต่อได้ (2 ต่อ 1 รอบที่ผ่าน)
 */
export function resolveLastStandQte(state, opKey, hoursGained) {
  const unit = state.units[opKey];
  state.lastStandQte = 'done';
  if (unit.status !== 'laststand') return null;

  if (hoursGained > 0) {
    unit.recoverRemainLoops = hours(hoursGained);
    unit.recoverTotalLoops = (unit.recoverTotalLoops ?? 0) + unit.recoverRemainLoops;
    return { opKey, from: 'laststand', to: 'laststand', hoursGained };
  }

  unit.status = 'lost';
  unit.recoverRemainLoops = hours(CONFIG.lostConsciousHours);
  unit.recoverTotalLoops = unit.recoverRemainLoops;
  state.stats.blackouts += 1;
  return { opKey, from: 'laststand', to: 'lost', hoursGained: 0 };
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
      // หมดเวลา Last Stand — ยังไม่ล้มทันที ให้ผู้เล่นเล่น QTE ต่อเวลาก่อน 1 ครั้ง
      // ตัวสถานะยังเป็น laststand อยู่ ตัวนับค้างที่ 0 จนกว่า resolveLastStandQte() จะถูกเรียก
      if (state.lastStandQte == null) {
        state.lastStandQte = 'pending';
        state.lastStandQtePendingLoops = 0;
        events.push({ opKey, from, to: 'qte' });
        continue;
      }
      if (state.lastStandQte === 'pending') {
        // ปกติเวลาหยุดตอนเล่นมินิเกม บรรทัดนี้จึงไม่ควรถูกเรียกเลย
        // ถ้าถูกเรียกแปลว่าไม่มีใครเปิดมินิเกมให้ → ถือว่าอดต่อเวลา ไม่ปล่อยให้ค้าง
        state.lastStandQtePendingLoops = (state.lastStandQtePendingLoops ?? 0) + 1;
        if (state.lastStandQtePendingLoops <= CONFIG.qte.pendingGraceLoops) continue;
        state.lastStandQte = 'done';
      }
      // เล่น QTE ไปแล้ว (หรือหมดสิทธิ์) → ล้มตามกฎเดิม (§5.4)
      unit.status = 'lost';
      unit.recoverRemainLoops = hours(CONFIG.lostConsciousHours);
      unit.recoverTotalLoops = unit.recoverRemainLoops;
      state.stats.blackouts += 1;
    } else {
      unit.status = 'normal';
      unit.recoverRemainLoops = 0;
      unit.recoverTotalLoops = 0;
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
