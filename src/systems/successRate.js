// สูตรอัตราสำเร็จ — อ้างอิง docs/GAMESCREEN_SPEC.md §4.1
//
//   อัตราสำเร็จ = ฐาน จนท. + บัฟรวม − ความเสี่ยงพื้นที่ + (−20 ถ้าบาดเจ็บ)   เพดาน 99%
//
// คืน "รายการแยกส่วน" ด้วย เพราะแผงข้อมูลตอนลากต้องโชว์ให้ผู้เล่นเห็นที่มาของตัวเลข (§9.2)
// ไฟล์นี้อยู่ใน systems/ จึงไม่แตะ DOM

import { CONFIG } from '../config.js';
import { OPERATORS, skillName, fieldConfig } from '../data/operators.js';

// ชื่อบัฟอ่านจากทะเบียน data/operators.js (id บัฟ = id สกิล) — ไม่ต้องพิมพ์ซ้ำที่นี่
export const buffName = (type) => skillName(type);

// บัฟทั้งหมดที่มีผลกับโซนนี้ ณ ตอนนี้ (ของโซนเอง + ของทั้งแมพ)
export function buffsOn(state, zone) {
  return [...zone.buffs, ...state.globalBuffs];
}

// skillId = สกิลลงพื้นที่ที่ใช้ (ไม่ส่งมา = สกิลลงพื้นที่ตัวแรกของคนนั้น)
export function successBreakdown(state, opKey, zone, { ignoreInjured = false, lastStand = null, skillId = null } = {}) {
  const parts = [];

  parts.push({ key: 'base', label: OPERATORS[opKey].name, value: fieldConfig(opKey, skillId).base });

  // Last Stand ดันโอกาสสำเร็จขึ้นอีก 10 (§5.2)
  // ตอนคิดผลจริงส่ง lastStand มาจากภารกิจ เพราะต้องยึดเงื่อนไข "ตอนออกเดินทาง"
  // ตอนโชว์แผงระหว่างลาก ไม่ส่งมา จึงดูจากสถานะปัจจุบันแทน
  const inLastStand = lastStand ?? state.units[opKey].status === 'laststand';
  if (inLastStand) parts.push({ key: 'laststand', label: 'Last Stand', value: CONFIG.lastStand.rateBonus });

  for (const b of buffsOn(state, zone)) {
    if (b.rate) parts.push({ key: b.type, label: buffName(b.type), value: b.rate });
  }

  if (!ignoreInjured && state.units[opKey].status === 'injured') {
    parts.push({ key: 'injured', label: 'บาดเจ็บ', value: CONFIG.injuredPenalty });
  }

  parts.push({ key: 'zone', label: 'ความเสี่ยงพื้นที่', value: CONFIG.zonePenalty[zone.level] });

  const raw = parts.reduce((sum, p) => sum + p.value, 0);
  const total = Math.max(0, Math.min(CONFIG.maxSuccessRate, raw));
  return { parts, raw, total };
}
