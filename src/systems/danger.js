// ระบบอันตราย — อ้างอิง docs/GAMESCREEN_SPEC.md §4.3
//
//   โอกาสอันตราย = ค่าพื้นฐานโซน × (1 + ชั่วโมงปัจจุบัน ÷ 72)   เพดาน 50%
//   มี Alert Allied ในโซน → 0% เสมอ
//
// ทอยอันตรายเฉพาะตอน "ไม่สำเร็จ" เท่านั้น ดังนั้นโอกาสบาดเจ็บที่ผู้เล่นเจอจริง
// จึงเป็น (1 − อัตราสำเร็จ) × โอกาสอันตราย — บัฟจึงช่วย 2 ต่อในตัว

import { CONFIG } from '../config.js';
import { buffsOn } from './successRate.js';

const TOTAL_HOURS = CONFIG.totalLoops / CONFIG.loopsPerHour;

// คืนเป็นเปอร์เซ็นต์ 0-50
export function dangerChance(state, zone) {
  if (buffsOn(state, zone).some((b) => b.immune)) return 0;
  const base = CONFIG.dangerBase[zone.level];
  const scaled = base * (1 + state.hour / TOTAL_HOURS);
  return Math.min(CONFIG.dangerCap, scaled) * 100;
}

// โอกาสบาดเจ็บจริง (%) — ตัวเลขที่ผู้เล่นควรเห็น
export function injuryChance(successPct, dangerPct) {
  return (1 - successPct / 100) * dangerPct;
}
