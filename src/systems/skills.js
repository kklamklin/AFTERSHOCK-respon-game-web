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

  // จนท. ที่กำลังลงพื้นที่อยู่ = ไอคอนขึ้น USING
  // ส่วนบัฟถือว่า "กำลังใช้" เมื่อยังมีผลอยู่บนแมพ (เช่น Air Deploy)
  const using = skill.type === 'field'
    ? unit.workRemainLoops > 0
    : state.globalBuffs.some((b) => b.type === skillId);

  let reason = null;
  if (unit.status === 'lost') reason = 'lost';
  else if (isLastStand(state, opKey) && CONFIG.lastStand.blockedSkills.includes(skillId)) reason = 'laststand-blocked';
  else if (unit.workRemainLoops > 0) reason = 'working';
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

export function unitStatusLabel(state, opKey) {
  const unit = state.units[opKey];
  if (unit.status === 'normal') return null;
  return {
    kind: unit.status,
    label: STATUS_LABEL[unit.status],
    loops: unit.recoverRemainLoops,
  };
}
