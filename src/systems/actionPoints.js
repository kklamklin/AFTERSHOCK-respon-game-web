// ระบบ Action Point — อ้างอิง docs/GAMESCREEN_SPEC.md §1.1 · AFTERSHOCKMASTER §8
//
// AP = กำลังเสริมที่ทยอยมาถึง จ่ายทุก 1 ชั่วโมง (= ทุก 2 ลูป)
//   AP ต่อชั่วโมง = 5 + โบนัสตามสัดส่วนผู้รอดที่ "หายไปแล้ว" (ตาย + ช่วยออกมาได้)
// สะสมได้ไม่มีเพดาน · ไฟล์นี้อยู่ใน systems/ จึงห้ามแตะ DOM

import { CONFIG } from '../config.js';

// สัดส่วนผู้รอดที่หายไปแล้ว 0..1
export function resolvedRatio(state) {
  return (state.totalRescued + state.totalCasualty) / CONFIG.totalSurvivors;
}

// AP ที่จะได้รับในชั่วโมงถัดไป (ใช้โชว์ให้ผู้เล่นดูได้ด้วย)
export function apPerHour(state) {
  const pct = resolvedRatio(state);
  const tier = CONFIG.apBonusThresholds.filter((t) => pct >= t).length;
  return CONFIG.apBase + CONFIG.apBonusValues[tier];
}

// เรียกทุกครั้งที่ครบ 1 ชั่วโมง
export function payHourlyAP(state) {
  const gained = apPerHour(state);
  state.ap += gained;
  return gained;
}

// หัก AP ตอนใช้สกิล (รอบที่ 5 จะเรียกใช้) — คืน false ถ้าแต้มไม่พอ
export function spendAP(state, cost) {
  if (state.ap < cost) return false;
  state.ap -= cost;
  return true;
}
