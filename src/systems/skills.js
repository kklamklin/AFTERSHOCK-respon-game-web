// สถานะการใช้งานของสกิลแต่ละอัน — อ้างอิง docs/GAMESCREEN_SPEC.md §3 · §10.1 เงื่อนไขปฏิเสธ
//
// ไฟล์นี้ตอบว่า "ตอนนี้กดสกิลนี้ได้ไหม เพราะอะไร" อย่างเดียว ไม่แตะ DOM
// รอบที่ 4 ใช้ตัดสินหน้าตาไอคอน · รอบที่ 5 จะใช้ตัวเดียวกันนี้ตัดสินว่าลากได้ไหม

import { CONFIG } from '../config.js';
import { OPERATORS } from '../data/operators.js';

export const TIERS = ['gray', 'yellow', 'red'];

// AP ที่ต้องจ่ายสำหรับสกิลนี้ในโซนระดับนั้น — null = ลงโซนนั้นไม่ได้
// ตอน Last Stand ทุกสกิลของ Robertson ฟรีและเข้าได้ทุกโซน (§5.2)
export function apCost(state, opKey, skillId, tier) {
  const skill = OPERATORS[opKey].skills[skillId];
  if (skill.type !== 'field') return skill.ap;

  if (isLastStand(state, opKey)) return CONFIG.lastStand.apCost;
  return skill.zones[tier]?.ap ?? null;
}

// เวลาทำงานในโซน (หน่วยลูป)
export function workLoops(state, opKey, skillId, tier) {
  const skill = OPERATORS[opKey].skills[skillId];
  if (skill.type !== 'field') return 0;

  const hours = isLastStand(state, opKey)
    ? CONFIG.lastStand.workHours[tier]
    : skill.zones[tier]?.cd;
  return hours == null ? null : hours * CONFIG.loopsPerHour;
}

export function isLastStand(state, opKey) {
  return state.units[opKey]?.status === 'laststand';
}

// AP ที่ถูกที่สุดของสกิลนี้ ใช้ตัดสินว่า "แต้มไม่พอ" ตั้งแต่ยังไม่เลือกโซน
function cheapestCost(state, opKey, skillId) {
  const skill = OPERATORS[opKey].skills[skillId];
  if (skill.type !== 'field') return skill.ap;
  const costs = TIERS.map((t) => apCost(state, opKey, skillId, t)).filter((c) => c != null);
  return costs.length ? Math.min(...costs) : Infinity;
}

/**
 * สถานะไอคอนสกิล 1 อัน
 * @returns {{ usable:boolean, reason:string|null, using:boolean,
 *             cooldownLoops:number, stacks:number|null, maxStacks:number|null }}
 *   reason: 'lost' | 'working' | 'cooldown' | 'no-ap' | 'no-stack' | 'laststand-blocked'
 */
export function skillStatus(state, opKey, skillId) {
  const unit = state.units[opKey];
  const skill = OPERATORS[opKey].skills[skillId];
  const cooldownLoops = unit.skillCooldowns[skillId] ?? 0;

  const isScan = opKey === 'elf' && skillId === 'scan';
  const stacks = isScan ? unit.scanStacks : null;
  const maxStacks = isScan ? CONFIG.buffs.scan.maxStacks : null;

  // USING = "สกิลนี้แหละที่ทำให้ จนท. ไม่ว่างอยู่ตอนนี้"
  //   สกิลลงพื้นที่ → ดูว่าภารกิจที่ทำอยู่คือสกิลนี้ไหม
  //   Crowd Control → ไม่ว่างแต่ไม่ได้อยู่ในภารกิจ = กำลังคุมฝูงชนอยู่
  //   บัฟทั้งแมพ (Air Deploy) → ยังมีผลอยู่บนแมพ
  let using = false;
  if (CONFIG.buffs[skillId]?.scope === 'global') using = state.globalBuffs.some((b) => b.type === skillId);
  else if (skill.type === 'field') using = unit.mission?.skillId === skillId;
  else if (skillId === 'crowd') using = unit.busyRemainLoops > 0 && !unit.mission;

  let reason = null;
  if (unit.status === 'lost') reason = 'lost';
  else if (isLastStand(state, opKey) && CONFIG.lastStand.blockedSkills.includes(skillId)) reason = 'laststand-blocked';
  else if (unit.busyRemainLoops > 0) reason = 'working';
  else if (cooldownLoops > 0) reason = 'cooldown';
  else if (stacks === 0) reason = 'no-stack';
  else if (state.ap < cheapestCost(state, opKey, skillId)) reason = 'no-ap';

  return { usable: reason === null, reason, using, cooldownLoops, stacks, maxStacks };
}

// ป้ายสถานะข้างรูป จนท. (§12) — คืน null ถ้าปกติ (ไม่ต้องแสดงอะไร)
const STATUS_LABEL = {
  injured: 'Warning\nINJURED :',
  lost: 'UNCONSCIOUS !',
  laststand: "Last stand\nall costs free",
};

// เวลาฟื้นเต็มของแต่ละสถานะ (ลูป) — ใช้คิดว่า "ฟื้นไปแล้วกี่ %" ให้แถบบนหน้าจอ
const STATUS_TOTAL_LOOPS = {
  injured: () => CONFIG.injuredRecoverHours * CONFIG.loopsPerHour,
  lost: () => CONFIG.lostConsciousHours * CONFIG.loopsPerHour,
  laststand: () => CONFIG.lastStand.durationHours * CONFIG.loopsPerHour,
};

export function unitStatusLabel(state, opKey) {
  const unit = state.units[opKey];
  if (unit.status === 'normal') return null;
  return {
    kind: unit.status,
    label: STATUS_LABEL[unit.status],
    loops: unit.recoverRemainLoops,
    totalLoops: STATUS_TOTAL_LOOPS[unit.status]?.() ?? 0,
  };
}

/**
 * "ความพร้อม" ของ จนท. 1 คน สำหรับแถบเปอร์เซ็นต์บนการ์ด (§12)
 * ทั้งสามกรณีคืนค่า 0..100 เสมอ ui/ เอาไปวาดแถบได้ตรง ๆ ไม่ต้องคิดกฎเอง
 *   กำลังลงพื้นที่ → % ความคืบหน้าของภารกิจ
 *   บาดเจ็บ/หมดสติ/Last Stand → % ของเวลาที่ผ่านไปแล้ว
 *   ว่างและปกติ → 100 (พร้อมออกปฏิบัติงาน)
 * @param frac เศษของลูปปัจจุบัน 0..1 ทำให้ตัวเลขไหลลื่นระหว่างลูป
 */
export function unitReadiness(state, opKey, frac = 0) {
  const unit = state.units[opKey];

  if (unit.mission && unit.busyRemainLoops > 0) {
    const total = unit.mission.totalLoops || 1;
    const done = total - unit.busyRemainLoops + frac;
    return { kind: 'working', pct: clampPct((done / total) * 100) };
  }

  const st = unitStatusLabel(state, opKey);
  if (st && st.totalLoops > 0) {
    const done = st.totalLoops - st.loops + frac;
    return { kind: st.kind, pct: clampPct((done / st.totalLoops) * 100) };
  }
  if (st) return { kind: st.kind, pct: 0 };

  return { kind: 'ready', pct: 100 };
}

function clampPct(n) {
  return Math.max(0, Math.min(100, n));
}

// ── กฎการวางลงโซน (§10.1 เงื่อนไขปฏิเสธ) ────────────────────────
// เหตุผลที่ปฏิเสธได้: lost · working · cooldown · no-stack · laststand-blocked
//                    cleared · occupied · zone-blocked · buff-exists · no-ap
export function dropCheck(state, opKey, skillId, zone) {
  const st = skillStatus(state, opKey, skillId);
  // 'no-ap' ของ skillStatus ดูจากโซนที่ถูกที่สุด ตรงนี้ต้องเช็คราคาของโซนนี้จริง ๆ อีกที
  if (!st.usable && st.reason !== 'no-ap') return { ok: false, reason: st.reason };

  if (zone.cleared) return { ok: false, reason: 'cleared' };

  const skill = OPERATORS[opKey].skills[skillId];
  let cost;

  if (skill.type === 'field') {
    // จนท. ลงซ้อนกันไม่ได้ (แต่ "บัฟ" ลงทับโซนที่มี จนท. อยู่ได้ — นั่นคือคอมโบหลักของเกม)
    if (zone.unit) return { ok: false, reason: 'occupied' };
    cost = apCost(state, opKey, skillId, zone.level);
    if (cost == null) return { ok: false, reason: 'zone-blocked' }; // เช่น Robertson → โซนแดง
  } else {
    if (zone.buffs.some((b) => b.type === skillId)) return { ok: false, reason: 'buff-exists' };
    cost = skill.ap;
  }

  if (state.ap < cost) return { ok: false, reason: 'no-ap' };
  return { ok: true, cost };
}

// ลงมือจริงหลังผู้เล่นปล่อยไอคอน — หัก AP ทันที (§10 ข้อ 5)
// คืน object สรุปสิ่งที่เกิดขึ้น หรือ null ถ้าวางไม่ได้
export function applyDrop(state, opKey, skillId, zone) {
  const check = dropCheck(state, opKey, skillId, zone);
  if (!check.ok) return null;

  const unit = state.units[opKey];
  const skill = OPERATORS[opKey].skills[skillId];
  state.ap -= check.cost;

  if (skill.type === 'field') {
    const loops = workLoops(state, opKey, skillId, zone.level);
    zone.unit = opKey;
    unit.busyRemainLoops = loops;
    // บันทึกเงื่อนไข ณ ตอนออกเดินทาง — Last Stand ต้องคิดด้วยเงื่อนไขนี้จนจบภารกิจ (§5.3)
    unit.mission = {
      zoneId: zone.id, skillId, tier: zone.level,
      lastStand: isLastStand(state, opKey), totalLoops: loops,
    };
    return { kind: 'deploy', cost: check.cost, loops };
  }

  // สกิลบัฟ — ลงโซน
  const cfg = CONFIG.buffs[skillId];
  zone.buffs.push({
    type: skillId,
    rate: cfg.rate,
    immune: skillId === 'alert',
    remainLoops: cfg.durationHours * CONFIG.loopsPerHour,
  });

  if (skillId === 'scan') unit.scanStacks -= 1;                 // ช่องคืนตอนบัฟหมดอายุ (§3.4)
  if (cfg.cooldownHours > 0) unit.skillCooldowns[skillId] = cfg.cooldownHours * CONFIG.loopsPerHour;
  // Crowd Control ต้องล็อก Robertson ทั้งตัว 3 ชม. ไม่ใช่แค่สกิลนี้ (§3.3)
  if (skillId === 'crowd') unit.busyRemainLoops = cfg.cooldownHours * CONFIG.loopsPerHour;

  return { kind: 'buff', cost: check.cost };
}

// Air Deploy — กดใช้เลย ไม่ต้องลาก บัฟทั้งแมพ (§3.1)
export function useGlobalSkill(state, opKey, skillId) {
  const st = skillStatus(state, opKey, skillId);
  const cfg = CONFIG.buffs[skillId];
  if (!st.usable || state.ap < cfg.ap) return null;
  if (state.globalBuffs.some((b) => b.type === skillId)) return null;

  state.ap -= cfg.ap;
  state.globalBuffs.push({
    type: skillId, rate: cfg.rate,
    remainLoops: cfg.durationHours * CONFIG.loopsPerHour,
  });
  state.units[opKey].skillCooldowns[skillId] = cfg.cooldownHours * CONFIG.loopsPerHour;
  return { kind: 'global', cost: cfg.ap };
}
