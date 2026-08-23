// สูตรอัตราสำเร็จ — อ้างอิง docs/GAMESCREEN_SPEC.md §4.1
//
//   อัตราสำเร็จ = ฐาน จนท. + บัฟรวม − ความเสี่ยงพื้นที่ + (−20 ถ้าบาดเจ็บ)   เพดาน 99%
//
// คืน "รายการแยกส่วน" ด้วย เพราะแผงข้อมูลตอนลากต้องโชว์ให้ผู้เล่นเห็นที่มาของตัวเลข (§9.2)
// ไฟล์นี้อยู่ใน systems/ จึงไม่แตะ DOM

import { CONFIG } from '../config.js';
import { OPERATORS } from '../data/operators.js';

export const BUFF_NAME = {
  crowd: 'Crowd Control',
  scan: 'Scan Area',
  air: 'Air Deploy',
  alert: 'Alert Allied',
};

// บัฟทั้งหมดที่มีผลกับโซนนี้ ณ ตอนนี้ (ของโซนเอง + ของทั้งแมพ)
export function buffsOn(state, zone) {
  return [...zone.buffs, ...state.globalBuffs];
}

export function successBreakdown(state, opKey, zone, { ignoreInjured = false } = {}) {
  const parts = [];

  parts.push({ key: 'base', label: OPERATORS[opKey].name, value: CONFIG.fieldSkills[opKey].base });

  for (const b of buffsOn(state, zone)) {
    if (b.rate) parts.push({ key: b.type, label: BUFF_NAME[b.type] ?? b.type, value: b.rate });
  }

  if (!ignoreInjured && state.units[opKey].status === 'injured') {
    parts.push({ key: 'injured', label: 'บาดเจ็บ', value: CONFIG.injuredPenalty });
  }

  parts.push({ key: 'zone', label: 'ความเสี่ยงพื้นที่', value: CONFIG.zonePenalty[zone.level] });

  const raw = parts.reduce((sum, p) => sum + p.value, 0);
  const total = Math.max(0, Math.min(CONFIG.maxSuccessRate, raw));
  return { parts, raw, total };
}
