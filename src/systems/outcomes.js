// คำนวณผลภารกิจตอน จนท. ทำงานครบเวลา — อ้างอิง docs/GAMESCREEN_SPEC.md §4.2
//
//   ชั้น 1  ทอย 1-100 เทียบอัตราสำเร็จ
//     ├─ สำเร็จ  → ชั้น 2 ทอยระดับจากตารางประจำตัว OP → สุ่ม %ช่วยชีวิตในช่วงของระดับนั้น
//     │            → โซนเป็นเขียว · ที่เหลือนับเป็นเสียชีวิต · ปลอดภัย 100% ไม่ทอยอันตราย
//     └─ ล้มเหลว → โซนคงเดิม · ทอยอันตราย → บาดเจ็บ / หมดสติ / Last Stand (§4.3 · §5)
//
// ไฟล์นี้อยู่ใน systems/ จึงไม่แตะ DOM — คืน object สรุปผลให้ ui/ เอาไปแสดง

import { CONFIG } from '../config.js';
import { roll100, randInt, pickWeighted } from '../utils/rng.js';
import { successBreakdown } from './successRate.js';
import { isZoneEmpty } from './zones.js';
import { rollDanger } from './status.js';

// ชั้น 2 — ระดับความสำเร็จ แล้วสุ่ม % ในช่วงของระดับนั้น (บัฟไม่มีผลกับชั้นนี้)
export function rollRescuePct(opKey) {
  const tier = pickWeighted(CONFIG.rescueTierChance[opKey]);
  const [lo, hi] = CONFIG.rescuePctRange[tier];
  return { tier, pct: randInt(lo, hi) };
}

/**
 * คิดผลภารกิจของ จนท. คนหนึ่งแล้วอัปเดต state
 * เรียกตอน busyRemainLoops ถึง 0 เท่านั้น
 * @returns {{kind:'success'|'fail'|'toolate', ...}|null}
 */
export function resolveMission(state, opKey) {
  const unit = state.units[opKey];
  const mission = unit.mission;
  if (!mission) return null;

  const zone = state.zones[mission.zoneId];
  const base = { opKey, zoneId: mission.zoneId, skillId: mission.skillId };

  // ไปถึงแล้วไม่เหลือใครให้ช่วย (คนตายหมดระหว่างที่กำลังเดินทาง/ทำงาน)
  if (!zone || zone.cleared || isZoneEmpty(zone)) {
    releaseUnit(state, opKey);
    return { ...base, kind: 'toolate' };
  }

  // อัตราสำเร็จคิดจากบัฟ ณ ตอนงานจบ (บัฟที่ลงทีหลังจึงมีผลจริง)
  // ยกเว้นโทษบาดเจ็บ — ถ้าออกเดินทางตอน Last Stand ให้ถือว่าไม่บาดเจ็บตลอดภารกิจ (§5.3)
  const br = successBreakdown(state, opKey, zone, { ignoreInjured: mission.lastStand });
  const rate = br.total;

  const roll = roll100();
  state.stats.missions += 1; // นับเฉพาะภารกิจที่ได้ทอยจริง — 'toolate' ไม่นับ (ข้างบน return ไปแล้ว)

  if (roll > rate) {
    // ล้มเหลว — โซนคงสีเดิม คนที่เหลือตายต่อไปตามเวลา แล้วทอยอันตราย (§4.3)
    releaseUnit(state, opKey);
    const danger = rollDanger(state, opKey, zone);
    return { ...base, kind: 'fail', rate, roll, danger };
  }

  const { tier, pct } = rollRescuePct(opKey);
  const trapped = zone.trapped;
  const saved = Math.floor((trapped * pct) / 100);
  const died = trapped - saved;

  zone.rescued += saved;
  zone.casualty += died;
  zone.trapped = 0;
  zone.cleared = true;

  state.totalRescued += saved;
  state.totalCasualty += died;
  state.stats.missionsSucceeded += 1;

  releaseUnit(state, opKey);
  return { ...base, kind: 'success', rate, roll, tier, pct, saved, died: Math.round(died) };
}

// จนท. กลับจากภารกิจ — ปลดโซนและล้างภารกิจ
function releaseUnit(state, opKey) {
  const unit = state.units[opKey];
  const zone = state.zones[unit.mission?.zoneId];
  if (zone && zone.unit === opKey) zone.unit = null;
  unit.mission = null;
}
